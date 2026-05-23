type ScanMarketResponse = {
  taskId: string
  status: string
}

type TaskStatusResponse = {
  taskId: string
  status: string
  result?: Record<string, unknown>
}

export async function startMarketScan(categoryName: string) {
  const response = await fetch(
    `/api/scan-market/${encodeURIComponent(categoryName)}`,
    {
      method: 'POST',
    },
  )

  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || 'Request failed')
  }

  return response.json() as Promise<ScanMarketResponse>
}

export async function getTaskStatus(taskId: string) {
  const response = await fetch(`/api/task-status/${taskId}`)

  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || 'Request failed')
  }

  return response.json() as Promise<TaskStatusResponse>
}
