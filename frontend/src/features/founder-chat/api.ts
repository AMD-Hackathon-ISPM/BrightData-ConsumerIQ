import { getAuthToken } from '@/lib/auth'

type AgentRunResponse = {
  taskId: string
  status: string
  message: string
}

type TaskStatusResponse = {
  taskId: string
  status: string
  result?: Record<string, unknown>
}

function authHeader(): Record<string, string> {
  const token = getAuthToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function startAgentRun(prompt: string, signal?: AbortSignal) {
  const response = await fetch('/api/agent/run', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeader(),
    },
    body: JSON.stringify({ prompt, max_steps: 6 }),
    signal,
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || 'Request failed')
  }

  return response.json() as Promise<AgentRunResponse>
}

export async function getTaskStatus(taskId: string, signal?: AbortSignal) {
  const response = await fetch(`/api/task-status/${taskId}`, {
    headers: authHeader(),
    signal,
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || 'Request failed')
  }

  return response.json() as Promise<TaskStatusResponse>
}

export async function fetchChatHistory(
  signal?: AbortSignal,
): Promise<unknown[] | null> {
  try {
    const response = await fetch('/api/chat/history', {
      headers: authHeader(),
      signal,
    })
    if (!response.ok) return null
    const payload = (await response.json()) as { messages?: unknown }
    return Array.isArray(payload.messages) ? payload.messages : []
  } catch {
    return null
  }
}

export async function saveChatHistory(
  messages: unknown[],
  signal?: AbortSignal,
): Promise<void> {
  try {
    await fetch('/api/chat/history', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...authHeader(),
      },
      body: JSON.stringify({ messages }),
      signal,
    })
  } catch {
    // best-effort; localStorage still has the cache
  }
}

export async function clearChatHistoryRemote(): Promise<void> {
  try {
    await fetch('/api/chat/history', {
      method: 'DELETE',
      headers: authHeader(),
    })
  } catch {
    // fail silent
  }
}
