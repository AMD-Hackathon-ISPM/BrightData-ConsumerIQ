const STREAM_FRAME_MS = 16
const STREAM_CHARS_PER_FRAME = 8

export function delay(ms: number, signal?: AbortSignal): Promise<boolean> {
  if (signal?.aborted) {
    return Promise.resolve(false)
  }

  return new Promise((resolve) => {
    const timeoutId = window.setTimeout(() => {
      signal?.removeEventListener('abort', abort)
      resolve(true)
    }, ms)

    const abort = () => {
      window.clearTimeout(timeoutId)
      resolve(false)
    }

    signal?.addEventListener('abort', abort, { once: true })
  })
}

export async function streamText({
  content,
  isCanceled,
  onChunk,
  signal,
}: {
  content: string
  isCanceled?: () => boolean
  onChunk: (chunk: string) => void
  signal?: AbortSignal
}) {
  for (
    let index = STREAM_CHARS_PER_FRAME;
    index <= content.length + STREAM_CHARS_PER_FRAME;
    index += STREAM_CHARS_PER_FRAME
  ) {
    if (signal?.aborted || isCanceled?.()) {
      return false
    }

    onChunk(content.slice(0, index))

    const completed = await delay(STREAM_FRAME_MS, signal)
    if (!completed) {
      return false
    }
  }

  return true
}
