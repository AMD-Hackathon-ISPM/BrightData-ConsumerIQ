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
