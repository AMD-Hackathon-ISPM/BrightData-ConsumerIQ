from __future__ import annotations
import json
import re
from typing import Any
from llama_cpp import Llama

from backend.agent.tools import TOOL_SCHEMAS, callTool

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

# Llama 3 instruct chat template tokens
_BOS = '<|begin_of_text|>'
_SYS_OPEN = '<|start_header_id|>system<|end_header_id|>\n\n'
_USR_OPEN = '<|start_header_id|>user<|end_header_id|>\n\n'
_AST_OPEN = '<|start_header_id|>assistant<|end_header_id|>\n\n'
_EOT = '<|eot_id|>'


def _buildSystemPrompt() -> str:
    lines: list[str] = []
    for name, meta in TOOL_SCHEMAS.items():
        params = ', '.join(f'{k}: {v}' for k, v in meta['input'].items())
        lines.append(f'  {name}({params})\n    → {meta[\'description\']}')
    return _SYSTEM.format(tools='\n'.join(lines))


def _initialPrompt(system: str, user: str) -> str:
    return (
        _BOS
        + _SYS_OPEN + system + _EOT
        + _USR_OPEN + user + _EOT
        + _AST_OPEN
    )


def _appendObservation(prompt: str, model_raw: str, observation: dict) -> str:
    obs = json.dumps(observation, ensure_ascii=False)
    return (
        prompt
        + model_raw
        + _EOT
        + _USR_OPEN + f'Observation: {obs}' + _EOT
        + _AST_OPEN
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
) -> dict[str, Any]:
    '''
    Run the ReAct (Reason + Act) loop with the given Llama instance.

    Each iteration:
      1. Generate — model outputs JSON with thought + action or final_answer
      2. Act      — call the named tool with action_input
      3. Observe  — feed the tool result back into the prompt

    Returns a dict with keys: steps, final_answer, success.
    '''
    system = _buildSystemPrompt()
    prompt = _initialPrompt(system, user_prompt)
    steps: list[dict[str, Any]] = []
    parse_failures = 0

    for step_num in range(1, max_steps + 1):
        raw = _generate(llm, prompt)
        parsed = _extractJson(raw)

        if parsed is None:
            parse_failures += 1
            steps.append({
                'step': step_num,
                'error': 'model output was not valid JSON',
                'raw': raw,
            })
            if parse_failures >= 2:
                break
            # nudge the model back on track
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
            steps.append({
                'step': step_num,
                'thought': thought,
                'final_answer': final_answer,
            })
            return {'steps': steps, 'final_answer': str(final_answer), 'success': True}

        action = parsed.get('action')
        if not action:
            steps.append({
                'step': step_num,
                'thought': thought,
                'error': 'JSON had neither \'action\' nor \'final_answer\'',
                'raw': parsed,
            })
            break

        action_input: dict = parsed.get('action_input') or {}
        observation = callTool(action, action_input)

        steps.append({
            'step': step_num,
            'thought': thought,
            'action': action,
            'action_input': action_input,
            'observation': observation,
        })

        prompt = _appendObservation(prompt, raw, observation)

    return {
        'steps': steps,
        'final_answer': None,
        'success': False,
        'error': 'Agent stopped without producing a final_answer',
    }
