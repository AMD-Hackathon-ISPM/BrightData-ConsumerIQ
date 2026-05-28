import {
  Conversation,
  ConversationAutoScroll,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation'
import {
  Message,
  MessageBranch,
  MessageBranchContent,
  MessageBranchNext,
  MessageBranchPage,
  MessageBranchPrevious,
  MessageBranchSelector,
  MessageContent,
  MessageResponse,
} from '@/components/ai-elements/message'
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from '@/components/ai-elements/reasoning'
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from '@/components/ai-elements/sources'
import type { MessageType } from '../types'

interface ChatConversationProps {
  messages: MessageType[]
}

export function ChatConversation({ messages }: ChatConversationProps) {
  const latestMessageKey = messages.at(-1)?.key

  return (
    <Conversation>
      <ConversationContent className="pt-16">
        {messages.map(({ versions, ...message }) => (
          <MessageBranch defaultBranch={0} key={message.key}>
            <MessageBranchContent>
              {versions.map((version) => (
                <Message
                  from={message.from}
                  key={`${message.key}-${version.id}`}
                >
                  <div>
                    {message.sources && message.sources.length > 0 ? (
                      <Sources>
                        <SourcesTrigger count={message.sources.length} />
                        <SourcesContent>
                          {message.sources.map((source) => (
                            <Source
                              href={source.href}
                              key={source.href}
                              title={source.title}
                            />
                          ))}
                        </SourcesContent>
                      </Sources>
                    ) : null}

                    {message.reasoning ? (
                      <Reasoning duration={message.reasoning.duration}>
                        <ReasoningTrigger />
                        <ReasoningContent>
                          {message.reasoning.content}
                        </ReasoningContent>
                      </Reasoning>
                    ) : null}

                    <MessageContent
                      className={
                        message.from === 'user'
                          ? '!bg-black/30 shadow-sm'
                          : undefined
                      }
                    >
                      <MessageResponse
                        className={
                          message.from === 'assistant'
                            ? 'prose-chat'
                            : undefined
                        }
                      >
                        {version.content}
                      </MessageResponse>
                    </MessageContent>
                  </div>
                </Message>
              ))}
            </MessageBranchContent>

            {versions.length > 1 ? (
              <MessageBranchSelector>
                <MessageBranchPrevious />
                <MessageBranchPage />
                <MessageBranchNext />
              </MessageBranchSelector>
            ) : null}
          </MessageBranch>
        ))}
      </ConversationContent>
      <ConversationAutoScroll trigger={latestMessageKey} />
      <ConversationScrollButton />
    </Conversation>
  )
}
