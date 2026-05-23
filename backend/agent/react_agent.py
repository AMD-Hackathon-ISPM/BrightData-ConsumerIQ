from __future__ import annotations
import json
import re
from typing import Any

import redis as redis_lib
from llama_cpp import Llama

from backend.agent.tools import TOOL_SCHEMAS, callTool
from backend.agent.summarizer import summarizeObservation, keyFinding
from backend.agent.session import (
    initSession,
    saveStep,
    appendFinding,
    getFindings,
    closeSession,
)

_SYSTEM = """\
You are a market intelligence agent. Use tools to gather real data, then write a final analysis.

AVAILABLE TOOLS:
{tools}

STRICT RULES:
1. Respond with ONLY valid JSON — no prose, no markdown outside the JSON.
2. To call a tool:
   {{"thought": "<your reasoning>", "action": "<tool_name>", "action_input": {{<params>}}}}
3. When you have enough data (at least 2 tool calls):
   {{"thought": "<your reasoning>", "final_answer": "<full analysis covering market gaps, pricing, and demand signals>"}}
4. Never invent data — only use what observations return.\
"""

_BOS = '<|begin_of_text|>'
_SYS_H = '<|start_header_id|>system<|end_header_id|>\n\n'
_USR_H = '<|start_header_id|>user<|end_header_id|>\n\n'
_AST_H = '<|start_header_id|>assistant<|end_header_id|>\n\n'
_EOT = '<|eot_id|>'


def _buildSystem() -> str:
    lines: list[str] = []
    for name, meta in TOOL_SCHEMAS.items():
        params = ', '.join(f'{k}: {v}' for k, v in meta['input'].items())
        lines.append(f'  {name}({params})\n    → {meta["description"]}')
    return _SYSTEM.format(tools='\n'.join(lines))


def _initialPrompt(system: str, user: str) -> str:
    return _BOS + _SYS_H + system + _EOT + _USR_H + user + _EOT + _AST_H


def _appendObservation(
    prompt: str,
    model_raw: str,
    obs_summary: str,
    findings: list[str],
) -> str:
    """
    Extend the prompt with only the summary of the observation, not raw JSON.
    The running findings list replaces the need to re-read full chat history.
    """
    findings_block = ''
    if findings:
        bullets = '\n'.join(f'  • {f}' for f in findings[-6:])  # last 6 max
        findings_block = f'\n\nRunning findings so far:\n{bullets}'

    return (
        prompt
        + model_raw
        + _EOT
        + _USR_H
        + f'Observation:\n{obs_summary}'
        + findings_block
        + _EOT
        + _AST_H
    )


def _generate(llm: Llama, prompt: str) -> str:
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


def runReactAgent(
    user_prompt: str,
    llm: Llama,
    *,
    max_steps: int = 6,
    redis_client: redis_lib.Redis | None = None,
    session_id: str | None = None,
) -> dict[str, Any]:
    """
    ReAct loop with external state:
      - Full observations  → Redis  (never in prompt)
      - Observation summary → prompt  (~10 lines per step)
      - Running findings   → Redis + re-injected each turn (~6 bullets max)
      - Full chat history  → NOT kept; only current action window

    Returns: {steps (summaries only), final_answer, success, session_id}
    """
    use_redis = redis_client is not None and session_id is not None
    if use_redis:
        initSession(redis_client, session_id, user_prompt)

    system = _buildSystem()
    prompt = _initialPrompt(system, user_prompt)
    steps: list[dict[str, Any]] = []
    parse_failures = 0

    for step_num in range(1, max_steps + 1):
        raw = _generate(llm, prompt)
        parsed = _extractJson(raw)

        if parsed is None:
            parse_failures += 1
            step_record = {'step': step_num, 'error': 'invalid JSON from model', 'raw': raw}
            steps.append(step_record)
            if use_redis:
                saveStep(redis_client, session_id, step_record)
            if parse_failures >= 2:
                break
            prompt += (
                raw + _EOT
                + _USR_H + 'Your last response was not valid JSON. Output ONLY a JSON object.' + _EOT
                + _AST_H
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
            step_record = {'step': step_num, 'thought': thought, 'error': 'no action or final_answer', 'raw': parsed}
            steps.append(step_record)
            if use_redis:
                saveStep(redis_client, session_id, step_record)
            break

        action_input: dict = parsed.get('action_input') or {}

        # --- ACT ---
        full_observation = callTool(action, action_input)

        # --- SUMMARIZE: only summary goes into prompt ---
        obs_summary = summarizeObservation(action, full_observation)
        finding = keyFinding(action, action_input, full_observation)

        # Persist full data to Redis; prompt never sees the raw JSON
        step_record = {
            'step': step_num,
            'thought': thought,
            'action': action,
            'action_input': action_input,
            'observation_summary': obs_summary,
            'observation_full': full_observation,  # only in Redis
        }
        steps.append({k: v for k, v in step_record.items() if k != 'observation_full'})

        if use_redis:
            saveStep(redis_client, session_id, step_record)
            appendFinding(redis_client, session_id, finding)
            findings = getFindings(redis_client, session_id)
        else:
            findings = [s.get('observation_summary', '')[:80] for s in steps if 'observation_summary' in s]

        # Extend prompt with summary + running findings (no raw JSON ever)
        prompt = _appendObservation(prompt, raw, obs_summary, findings)

    if use_redis:
        closeSession(redis_client, session_id, success=False)

    return {
        'session_id': session_id,
        'steps': steps,
        'final_answer': None,
        'success': False,
        'error': 'Agent stopped without a final_answer',
    }
