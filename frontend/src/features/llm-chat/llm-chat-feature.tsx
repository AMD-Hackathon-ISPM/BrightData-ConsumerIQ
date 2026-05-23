import { nanoid } from 'nanoid'
import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import type { PanelImperativeHandle } from 'react-resizable-panels'
import { toast } from 'sonner'
import type { PromptInputMessage } from '@/components/ai-elements/prompt-input'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable'
import { cn } from '@/lib/utils'
import { ChatComposer } from './components/chat-composer'
import { ChatConversation } from './components/chat-conversation'
import { ChatPanel } from './components/chat-panel'
import { SuggestionList } from './components/suggestion-list'
import { initialMessages, suggestions } from './data/chat-content'
import { buildMockResponse } from './lib/mock-streaming'
import { streamText } from './lib/streaming'
import type { ChatStatus, MessageType } from './types'

export function LlmChatFeature() {
  const sidebarPanelRef = useRef<PanelImperativeHandle>(null)
  const streamAbortRef = useRef(false)
  const pendingResponseTimeoutRef = useRef<number | null>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [text, setText] = useState('')
  const [status, setStatus] = useState<ChatStatus>('ready')
  const [messages, setMessages] = useState<MessageType[]>(initialMessages)
  const [, setStreamingMessageId] = useState<string | null>(null)

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

  const streamResponse = useCallback(
    async (messageId: string, content: string) => {
      streamAbortRef.current = false
      setStatus('streaming')
      setStreamingMessageId(messageId)

      const completed = await streamText({
        content,
        isCanceled: () => streamAbortRef.current,
        onChunk: (chunk) => updateMessageContent(messageId, chunk),
      })

      if (!completed) {
        setStatus('ready')
        setStreamingMessageId(null)
        return
      }

      setStatus('ready')
      setStreamingMessageId(null)
    },
    [updateMessageContent],
  )

  const addUserMessage = useCallback(
    (content: string) => {
      const prompt = content.trim() || 'Sent with attachments'
      const userMessage: MessageType = {
        from: 'user',
        key: nanoid(),
        versions: [
          {
            content: prompt,
            id: nanoid(),
          },
        ],
      }

      streamAbortRef.current = false
      setMessages((previousMessages) => [...previousMessages, userMessage])

      pendingResponseTimeoutRef.current = window.setTimeout(() => {
        pendingResponseTimeoutRef.current = null

        if (streamAbortRef.current) {
          return
        }

        const assistantMessageId = nanoid()
        const assistantMessage: MessageType = {
          from: 'assistant',
          key: nanoid(),
          reasoning: {
            content:
              'I treated the prompt as an insights request, selected the most relevant seeded ConsumerIQ patterns, then prepared a concise response for an analyst workflow.',
            duration: 5,
          },
          versions: [
            {
              content: '',
              id: assistantMessageId,
            },
          ],
        }

        setMessages((previousMessages) => [
          ...previousMessages,
          assistantMessage,
        ])
        void streamResponse(assistantMessageId, buildMockResponse(prompt))
      }, 500)
    },
    [streamResponse],
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

  const handleTextChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      setText(event.target.value)
    },
    [],
  )

  const handleStop = useCallback(() => {
    streamAbortRef.current = true

    if (pendingResponseTimeoutRef.current !== null) {
      window.clearTimeout(pendingResponseTimeoutRef.current)
      pendingResponseTimeoutRef.current = null
    }

    setStatus('ready')
    setStreamingMessageId(null)
    toast.info('Response stopped')
  }, [])

  const handleToggleSidebar = useCallback(() => {
    if (isSidebarOpen) {
      sidebarPanelRef.current?.collapse()
      setIsSidebarOpen(false)
      return
    }

    sidebarPanelRef.current?.expand()
    setIsSidebarOpen(true)
  }, [isSidebarOpen])

  useEffect(
    () => () => {
      streamAbortRef.current = true

      if (pendingResponseTimeoutRef.current !== null) {
        window.clearTimeout(pendingResponseTimeoutRef.current)
      }
    },
    [],
  )

  const chatExperience = (
    <div className="relative flex size-full min-h-0 flex-col divide-y overflow-hidden">
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
          onTextChange={handleTextChange}
          status={status}
          text={text}
        />
      </div>
    </div>
  )

  return (
    <main className="min-h-screen bg-background text-foreground">
      <ResizablePanelGroup
        className="hidden min-h-screen sm:flex"
        orientation="horizontal"
      >
        <ResizablePanel defaultSize="62%" minSize="42%">
          <div className="min-h-screen bg-background" aria-hidden="true" />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel
          className="min-w-0"
          collapsedSize="5%"
          collapsible
          defaultSize="38%"
          maxSize="58%"
          minSize="30%"
          onResize={(panelSize) => {
            setIsSidebarOpen(panelSize.asPercentage > 5.5)
          }}
          panelRef={sidebarPanelRef}
        >
          <ChatPanel isOpen={isSidebarOpen} onToggle={handleToggleSidebar}>
            {chatExperience}
          </ChatPanel>
        </ResizablePanel>
      </ResizablePanelGroup>

      <div className="flex min-h-screen justify-end sm:hidden">
        <ChatPanel
          className={cn(
            'transition-[width] duration-200',
            isSidebarOpen ? 'w-full' : 'w-16',
          )}
          isOpen={isSidebarOpen}
          onToggle={handleToggleSidebar}
        >
          {chatExperience}
        </ChatPanel>
      </div>
    </main>
  )
}
