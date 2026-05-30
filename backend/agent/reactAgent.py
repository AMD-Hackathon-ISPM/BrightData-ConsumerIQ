from __future__ import annotations
import json
import os
import re
from typing import Any

import httpx
import redis as redis_lib

from backend.agent.tools import TOOL_SCHEMAS, callTool
from backend.agent.summarizer import summarizeObservation, keyFinding
from backend.agent.session import (
    initSession,
    saveStep,
    appendFinding,
    getFindings,
    closeSession,
)

_SYSTEM = '''\
You are a market intelligence agent. Use tools to gather real data, then produce a final analysis.

AVAILABLE TOOLS:
{tools}

STRICT RULES — read carefully:
1. Respond ONLY with valid JSON. No prose, no markdown, no extra text.
2. To call a tool output:
   {{"thought": "<your reasoning>", "action": "<tool_name>", "action_input": {{<params>}}}}
3. When you have enough data output:
   {{"thought": "<your reasoning>", "final_answer": "<full analysis with gtmIntelligence, financeIntelligence, securityCompliance>"}}
4. Call at least 2 different tools before writing final_answer.
5. Never invent data — only use what the observations return.\
'''

_BOS = '<|begin_of_text|>'
_SYS_OPEN = '<|start_header_id|>system<|end_header_id|>\n\n'
_USR_OPEN = '<|start_header_id|>user<|end_header_id|>\n\n'
_AST_OPEN = '<|start_header_id|>assistant<|end_header_id|>\n\n'
_EOT = '<|eot_id|>'


def _buildSystemPrompt(user_context: dict | None = None) -> str:
    lines: list[str] = []
    for name, meta in TOOL_SCHEMAS.items():
        params = ', '.join(f'{k}: {v}' for k, v in meta['input'].items())
        lines.append(f'  {name}({params})\n    → {meta["description"]}')
    base = _SYSTEM.format(tools='\n'.join(lines))
    if user_context:
        from backend.agent.prompts import buildOmniPrompt
        return base + '\n\n' + buildOmniPrompt(user_context)
    return base


def _initialPrompt(system: str, user: str) -> str:
    return (
        _BOS
        + _SYS_OPEN + system + _EOT
        + _USR_OPEN + user + _EOT
        + _AST_OPEN
    )


def _appendObservation(
    prompt: str,
    model_raw: str,
    obs_summary: str,
    findings: list[str],
) -> str:
    findings_block = ''
    if findings:
        bullets = '\n'.join(f'  • {f}' for f in findings[-6:])
        findings_block = f'\n\nRunning findings so far:\n{bullets}'

    return (
        prompt
        + model_raw
        + _EOT
        + _USR_OPEN
        + f'Observation:\n{obs_summary}'
        + findings_block
        + _EOT
        + _AST_OPEN
    )


def _generate(llm: Any, prompt: str) -> str:
    result = llm.create_completion(
        prompt=prompt,
        max_tokens=512,
        temperature=0.2,
        stop=[_EOT, '<|start_header_id|>'],
    )
    return result['choices'][0]['text'].strip()


def _extractJson(text: str) -> dict | None:
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    match = re.search(r'\{[\s\S]*\}', text)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass
    return None


_FALLBACK_SYSTEM = '''\
You are a market intelligence advisor for a founder. Reply in clear, conversational English.
- Be concise (3-6 short paragraphs max). Use plain text, no JSON, no markdown headers.
- If you have context about the founder's product, weave it into the answer.
- If "Relevant memory from prior scrapes & dashboards" is provided, treat it as ground truth from previous research — cite specific brands, claims, or prices it surfaces.
- If you have findings from earlier tool calls, use them to ground your answer.
- If a fact is unknown, say so honestly instead of inventing one.'''


def _recallCogneeMemory(query: str, user_context: dict | None) -> str:
    try:
        from backend.models.cognee_memory import is_enabled, run_async, search_memory
    except ImportError:
        return ''
    if not is_enabled():
        return ''

    category = ''
    country = ''
    if isinstance(user_context, dict):
        category = str(user_context.get('industry') or '')
        country = str(user_context.get('country') or '')

    try:
        results = run_async(
            search_memory(
                query=query[:500],
                category=category,
                country=country,
                search_type='chunks',
            )
        )
    except Exception as exc:
        print(f'[agent] Cognee memory recall failed: {exc}')
        return ''

    if not results:
        return ''

    lines: list[str] = []
    for item in results[:5]:
        if isinstance(item, dict):
            text = (
                item.get('text')
                or item.get('content')
                or item.get('chunk')
                or item.get('payload')
                or ''
            )
            if isinstance(text, dict):
                text = json.dumps(text, ensure_ascii=False)[:240]
        else:
            text = str(item)
        text = str(text).strip()
        if text:
            lines.append(f'- {text[:240]}')

    if not lines:
        return ''

    print(f'[agent] Cognee recall: {len(lines)} memory chunks', flush=True)
    return 'Relevant memory from prior scrapes & dashboards:\n' + '\n'.join(lines) + '\n\n'


def _buildFallbackUserMessage(
    user_prompt: str,
    user_context: dict | None,
    steps: list[dict[str, Any]],
) -> str:
    context_block = ''
    if isinstance(user_context, dict):
        ctx_lines = []
        for key in ('productName', 'industry', 'country', 'region', 'customerSegment', 'painPoint', 'uniqueSellingPoint'):
            value = user_context.get(key)
            if value:
                ctx_lines.append(f'- {key}: {value}')
        if ctx_lines:
            context_block = 'Founder context:\n' + '\n'.join(ctx_lines) + '\n\n'

    memory_block = _recallCogneeMemory(user_prompt, user_context)

    findings_block = ''
    finding_lines = []
    for step in steps:
        observation = step.get('observation_summary')
        if observation:
            finding_lines.append(f'- {str(observation)[:240]}')
    if finding_lines:
        findings_block = 'Findings collected from earlier tool calls:\n' + '\n'.join(finding_lines[-8:]) + '\n\n'

    return f'{context_block}{memory_block}{findings_block}Founder question: {user_prompt}'


def _fallbackChat(
    llm: Any,
    user_prompt: str,
    user_context: dict | None,
    steps: list[dict[str, Any]],
) -> str:
    user_message = _buildFallbackUserMessage(user_prompt, user_context, steps)
    prompt = (
        _BOS
        + _SYS_OPEN + _FALLBACK_SYSTEM + _EOT
        + _USR_OPEN + user_message + _EOT
        + _AST_OPEN
    )
    return _generate(llm, prompt)


def _cloudFallbackChat(
    user_prompt: str,
    user_context: dict | None,
    steps: list[dict[str, Any]],
) -> str:
    api_key = (
        os.getenv('OPENAI_API_KEY')
        or os.getenv('BRIGHTDATA_API_TOKEN')
        or os.getenv('BRIGHT_DATA_API_TOKEN')
    )
    if not api_key:
        return ''

    base_url = os.getenv('OPENAI_BASE_URL', 'https://api.openai.com/v1').rstrip('/')
    model = os.getenv('OPENAI_MODEL', 'gpt-4o-mini')
    user_message = _buildFallbackUserMessage(user_prompt, user_context, steps)

    try:
        response = httpx.post(
            f'{base_url}/chat/completions',
            headers={
                'Authorization': f'Bearer {api_key}',
                'Content-Type': 'application/json',
            },
            json={
                'model': model,
                'messages': [
                    {'role': 'system', 'content': _FALLBACK_SYSTEM},
                    {'role': 'user', 'content': user_message},
                ],
                'temperature': 0.3,
                'max_tokens': 800,
            },
            timeout=60,
        )
        response.raise_for_status()
        payload = response.json()
        choices = payload.get('choices') or []
        if choices and isinstance(choices, list):
            message = choices[0].get('message') or {}
            if isinstance(message, dict):
                content = message.get('content')
                if isinstance(content, str):
                    return content.strip()
        return ''
    except Exception as exc:
        print(f'[agent] Cloud fallback chat failed: {exc}')
        return ''


def runReactAgent(
    user_prompt: str,
    llm: Any,
    *,
    max_steps: int = 6,
    redis_client: redis_lib.Redis | None = None,
    session_id: str | None = None,
    user_context: dict | None = None,
) -> dict[str, Any]:
    use_redis = redis_client is not None and session_id is not None
    if use_redis:
        initSession(redis_client, session_id, user_prompt)

    system = _buildSystemPrompt(user_context)
    prompt = _initialPrompt(system, user_prompt)
    steps: list[dict[str, Any]] = []
    parse_failures = 0

    for step_num in range(1, max_steps + 1):
        raw = _generate(llm, prompt)
        parsed = _extractJson(raw)

        if parsed is None:
            parse_failures += 1
            step_record = {'step': step_num, 'error': 'model output was not valid JSON', 'raw': raw}
            steps.append(step_record)
            if use_redis:
                saveStep(redis_client, session_id, step_record)
            if parse_failures >= 2:
                break
            prompt += (
                raw + _EOT
                + _USR_OPEN
                + 'Your response was not valid JSON. Output ONLY a JSON object.'
                + _EOT + _AST_OPEN
            )
            continue

        thought = parsed.get('thought', '')
        final_answer = parsed.get('final_answer')

        if final_answer is not None:
            step_record = {'step': step_num, 'thought': thought, 'final_answer': final_answer}
            steps.append(step_record)
            if use_redis:
                saveStep(redis_client, session_id, step_record)
                closeSession(redis_client, session_id, success=True)
            return {
                'session_id': session_id,
                'steps': steps,
                'final_answer': str(final_answer),
                'success': True,
            }

        action = parsed.get('action')
        if not action:
            step_record = {
                'step': step_num,
                'thought': thought,
                'error': "JSON had neither 'action' nor 'final_answer'",
                'raw': parsed,
            }
            steps.append(step_record)
            if use_redis:
                saveStep(redis_client, session_id, step_record)
            break

        action_input: dict = parsed.get('action_input') or {}

        full_observation = callTool(action, action_input)

        obs_summary = summarizeObservation(action, full_observation)
        finding = keyFinding(action, action_input, full_observation)

        step_record = {
            'step': step_num,
            'thought': thought,
            'action': action,
            'action_input': action_input,
            'observation_summary': obs_summary,
            'observation_full': full_observation,
        }
        steps.append({k: v for k, v in step_record.items() if k != 'observation_full'})

        if use_redis:
            saveStep(redis_client, session_id, step_record)
            appendFinding(redis_client, session_id, finding)
            findings = getFindings(redis_client, session_id)
        else:
            findings = [s.get('observation_summary', '')[:80] for s in steps if 'observation_summary' in s]

        prompt = _appendObservation(prompt, raw, obs_summary, findings)

    llama_answer = ''
    llama_error: Exception | None = None
    try:
        llama_answer = _fallbackChat(llm, user_prompt, user_context, steps)
    except Exception as exc:
        llama_error = exc
        print(f'[agent] Llama fallback chat failed: {exc}')

    if llama_answer and llama_answer.strip():
        if use_redis:
            closeSession(redis_client, session_id, success=True)
        return {
            'session_id': session_id,
            'steps': steps,
            'final_answer': llama_answer,
            'success': True,
            'fallback': 'llama',
        }

    cloud_answer = _cloudFallbackChat(user_prompt, user_context, steps)
    if cloud_answer and cloud_answer.strip():
        if use_redis:
            closeSession(redis_client, session_id, success=True)
        return {
            'session_id': session_id,
            'steps': steps,
            'final_answer': cloud_answer,
            'success': True,
            'fallback': 'cloud',
        }

    if use_redis:
        closeSession(redis_client, session_id, success=False)
    return {
        'session_id': session_id,
        'steps': steps,
        'final_answer': None,
        'success': False,
        'error': (
            f'Agent stopped without final_answer; '
            f'Llama fallback {"errored: " + str(llama_error) if llama_error else "returned empty"}; '
            f'cloud fallback returned empty or is not configured.'
        ),
    }
