import type { FounderFormPayload } from './types'

type SubmitFounderFormResponse = {
  id: string
  status: string
}

export async function submitFounderForm(
  payload: FounderFormPayload,
): Promise<SubmitFounderFormResponse> {
  const response = await fetch('/api/founder-form/submit', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || 'Request failed')
  }

  return response.json() as Promise<SubmitFounderFormResponse>
}
