import { nanoid } from 'nanoid'
import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { toast } from 'sonner'
import type { PromptInputMessage } from '@/components/ai-elements/prompt-input'
import { cn } from '@/lib/utils'
import { getTaskStatus, startAgentRun } from './api'
import { ChatComposer } from './components/chat-composer'
import { ChatConversation } from './components/chat-conversation'
import { ChatPanel } from './components/chat-panel'
import { SuggestionList } from './components/suggestion-list'
import { initialMessages, suggestions } from './data/chat-content'
import { delay, streamText } from './lib/streaming'
import type { ChatStatus, MessageType } from './types'

const TASK_POLL_INTERVALS_MS = [1200, 2000, 3500, 5000]
const TASK_TIMEOUT_MS = 240000

const STORAGE_KEY = 'ciq_chat_messages_v1'
const STORAGE_MAX_MESSAGES = 200

function loadStoredMessages(): MessageType[] | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || !Array.isArray(parsed.messages)) return null
    return parsed.messages as MessageType[]
  } catch {
    return null
  }
}

function saveStoredMessages(messages: MessageType[]): void {
  if (typeof window === 'undefined') return
  try {
    const trimmed = messages.slice(-STORAGE_MAX_MESSAGES)
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ savedAt: Date.now(), messages: trimmed }),
    )
  } catch {
    // localStorage disabled or quota exceeded — fail silent
  }
}

export function clearStoredChatMessages(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // fail silent
  }
}

const formatSection = (label: string, value: unknown) => {
  if (
    !value ||
    (typeof value === 'object' && Object.keys(value as object).length === 0)
  ) {
    return `### ${label}\n_No data yet._`
  }

  return `### ${label}\n\n\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\``
}

const extractReasoning = (
  result: Record<string, unknown>,
): { content: string; duration: number } | undefined => {
  const raw = result.reasoning
  if (!raw || typeof raw !== 'object') return undefined
  const obj = raw as { content?: unknown; duration?: unknown }
  const content = typeof obj.content === 'string' ? obj.content.trim() : ''
  const duration =
    typeof obj.duration === 'number' && Number.isFinite(obj.duration)
      ? Math.max(0, Math.round(obj.duration))
      : 0
  if (!content) return undefined
  return { content, duration }
}

const formatInsights = (result: Record<string, unknown>) => {
  const finalAnswer =
    typeof result.finalAnswer === 'string'
      ? result.finalAnswer
      : typeof result.final_answer === 'string'
        ? result.final_answer
        : ''

  if (finalAnswer) {
    return finalAnswer
  }

  const category =
    typeof result.category === 'string' ? result.category : 'Unknown'
  const gtm = result.gtmIntelligence
  const finance = result.financeIntelligence
  const security = result.securityCompliance
  const rawOutput = result.rawOutput

  const sections = [
    formatSection('Go-to-market', gtm),
    formatSection('Finance', finance),
    formatSection('Security & Compliance', security),
  ]

  if (rawOutput) {
    sections.push(formatSection('Raw Output', rawOutput))
  }

  return `## Market Intelligence\n\n**Category:** ${category}\n\n${sections.join('\n\n')}`
}

export function FounderChat({
  className,
  isOpen,
  onToggle,
  panelClassName,
}: {
  className?: string
  isOpen: boolean
  onToggle: () => void
  panelClassName?: string
}) {
  const streamAbortRef = useRef(false)
  const pendingResponseTimeoutRef = useRef<number | null>(null)
  const activeRequestIdRef = useRef(0)
  const abortControllerRef = useRef<AbortController | null>(null)
  const [text, setText] = useState('')
  const [status, setStatus] = useState<ChatStatus>('ready')
  const [messages, setMessages] = useState<MessageType[]>(() => {
    const stored = loadStoredMessages()
    return stored && stored.length > 0 ? stored : initialMessages
  })
  const [, setStreamingMessageId] = useState<string | null>(null)

  useEffect(() => {
    saveStoredMessages(messages)
  }, [messages])

  const updateMessageContent = useCallback(
    (messageId: string, newContent: string) => {
      setMessages((previousMessages) =>
        previousMessages.map((message) => {
          if (message.versions.some((version) => version.id === messageId)) {
            return {
              ...message,
              versions: message.versions.map((version) =>
                version.id === messageId
                  ? { ...version, content: newContent }
                  : version,
              ),
            }
          }

          return message
        }),
      )
    },
    [],
  )

  const setMessageReasoning = useCallback(
    (
      messageId: string,
      reasoning: { content: string; duration: number } | undefined,
    ) => {
      setMessages((previousMessages) =>
        previousMessages.map((message) =>
          message.versions.some((version) => version.id === messageId)
            ? { ...message, reasoning }
            : message,
        ),
      )
    },
    [],
  )

  const streamResponse = useCallback(
    async (
      messageId: string,
      content: string,
      requestId: number,
      signal: AbortSignal,
    ) => {
      if (signal.aborted || requestId !== activeRequestIdRef.current) {
        return
      }

      setStatus('streaming')
      setStreamingMessageId(messageId)

      const completed = await streamText({
        content,
        signal,
        isCanceled: () =>
          streamAbortRef.current || requestId !== activeRequestIdRef.current,
        onChunk: (chunk) => updateMessageContent(messageId, chunk),
      })

      if (
        !completed ||
        signal.aborted ||
        requestId !== activeRequestIdRef.current
      ) {
        return
      }

      setStatus('ready')
      setStreamingMessageId(null)
    },
    [updateMessageContent],
  )

  const pollTaskResult = useCallback(
    async (taskId: string, requestId: number, signal: AbortSignal) => {
      const startedAt = Date.now()
      let attempt = 0

      while (Date.now() - startedAt < TASK_TIMEOUT_MS) {
        if (
          streamAbortRef.current ||
          signal.aborted ||
          requestId !== activeRequestIdRef.current
        ) {
          return null
        }

        const response = await getTaskStatus(taskId, signal)
        if (response.status === 'completed') {
          const result = response.result ?? null
          if (result && typeof result === 'object') {
            const status = (result as { status?: string }).status
            const errorMessage = (result as { error?: string }).error
            if (status === 'failed') {
              throw new Error(errorMessage || 'Request failed')
            }
          }
          return result
        }

        const waitMs =
          TASK_POLL_INTERVALS_MS[
            Math.min(attempt, TASK_POLL_INTERVALS_MS.length - 1)
          ]
        attempt += 1

        const completed = await delay(waitMs, signal)
        if (!completed) {
          return null
        }
      }

      throw new Error('Request timed out')
    },
    [],
  )

  const createAssistantMessage = useCallback(() => {
    const assistantMessageId = nanoid()
    const assistantMessage: MessageType = {
      from: 'assistant',
      key: nanoid(),
      versions: [{ content: '', id: assistantMessageId }],
    }

    setMessages((previousMessages) => [...previousMessages, assistantMessage])

    return assistantMessageId
  }, [])

  const addUserMessage = useCallback(
    (content: string) => {
      const prompt = content.trim() || 'Sent with attachments'
      const userMessage: MessageType = {
        from: 'user',
        key: nanoid(),
        versions: [{ content: prompt, id: nanoid() }],
      }

      if (pendingResponseTimeoutRef.current !== null) {
        window.clearTimeout(pendingResponseTimeoutRef.current)
        pendingResponseTimeoutRef.current = null
      }

      abortControllerRef.current?.abort()
      const requestId = activeRequestIdRef.current + 1
      activeRequestIdRef.current = requestId
      const abortController = new AbortController()
      abortControllerRef.current = abortController
      streamAbortRef.current = false
      setMessages((previousMessages) => [...previousMessages, userMessage])

      pendingResponseTimeoutRef.current = window.setTimeout(() => {
        pendingResponseTimeoutRef.current = null

        if (
          streamAbortRef.current ||
          abortController.signal.aborted ||
          requestId !== activeRequestIdRef.current
        ) {
          return
        }

        void (async () => {
          const assistantMessageId = createAssistantMessage()
          try {
            const scanResponse = await startAgentRun(
              prompt,
              abortController.signal,
            )
            const result = await pollTaskResult(
              scanResponse.taskId,
              requestId,
              abortController.signal,
            )
            if (
              !result ||
              abortController.signal.aborted ||
              requestId !== activeRequestIdRef.current
            ) {
              return
            }
            const reasoning = extractReasoning(result)
            if (reasoning) {
              setMessageReasoning(assistantMessageId, reasoning)
            }
            const formatted = formatInsights(result)
            await streamResponse(
              assistantMessageId,
              formatted,
              requestId,
              abortController.signal,
            )
          } catch (_error) {
            if (
              abortController.signal.aborted ||
              requestId !== activeRequestIdRef.current
            ) {
              return
            }

            updateMessageContent(
              assistantMessageId,
              'Unable to fetch insights right now. Please try again.',
            )
            setStatus('ready')
            setStreamingMessageId(null)
          } finally {
            if (requestId === activeRequestIdRef.current) {
              abortControllerRef.current = null
            }
          }
        })()
      }, 300)
    },
    [
      createAssistantMessage,
      pollTaskResult,
      setMessageReasoning,
      streamResponse,
      updateMessageContent,
    ],
  )

  const handleSubmit = useCallback(
    (message: PromptInputMessage) => {
      if (status !== 'ready') {
        return
      }

      const prompt = message.text.trim()
      const hasText = Boolean(prompt)
      const hasAttachments = Boolean(message.files.length)

      if (!(hasText || hasAttachments)) {
        return
      }

      setStatus('submitted')

      if (hasAttachments) {
        toast.success('Files attached', {
          description: `${message.files.length} file(s) attached to message`,
        })
      }

      addUserMessage(prompt || 'Sent with attachments')
      setText('')
    },
    [addUserMessage, status],
  )

  const handleSuggestionClick = useCallback(
    (suggestion: string) => {
      if (status !== 'ready') {
        return
      }

      setStatus('submitted')
      addUserMessage(suggestion)
    },
    [addUserMessage, status],
  )

  const handleStop = useCallback(() => {
    streamAbortRef.current = true
    activeRequestIdRef.current += 1
    abortControllerRef.current?.abort()
    abortControllerRef.current = null

    if (pendingResponseTimeoutRef.current !== null) {
      window.clearTimeout(pendingResponseTimeoutRef.current)
      pendingResponseTimeoutRef.current = null
    }

    setStatus('ready')
    setStreamingMessageId(null)
    toast.info('Response stopped')
  }, [])

  useEffect(
    () => () => {
      streamAbortRef.current = true
      activeRequestIdRef.current += 1
      abortControllerRef.current?.abort()
      abortControllerRef.current = null

      if (pendingResponseTimeoutRef.current !== null) {
        window.clearTimeout(pendingResponseTimeoutRef.current)
      }
    },
    [],
  )

  return (
    <div className={cn('h-full min-h-0 bg-background-default', className)}>
      <ChatPanel
        className={cn(
          '!h-full !min-h-0 transition-[width] duration-200 ease-out',
          panelClassName,
        )}
        hideWhenCollapsed
        isOpen={isOpen}
        onToggle={onToggle}
      >
        <div className="relative flex min-h-0 flex-1 flex-col divide-y overflow-hidden">
          <ChatConversation messages={messages} />
          <div className="grid shrink-0 gap-4 pt-4">
            <SuggestionList
              disabled={status !== 'ready'}
              onSuggestionClick={handleSuggestionClick}
              suggestions={suggestions}
            />
            <ChatComposer
              onStop={handleStop}
              onSubmit={handleSubmit}
              onTextChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                setText(event.target.value)
              }
              status={status}
              text={text}
            />
          </div>
        </div>
      </ChatPanel>
    </div>
  )
}
