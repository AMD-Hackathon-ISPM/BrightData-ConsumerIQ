import type { ChangeEvent } from 'react'
import { useCallback } from 'react'
import { toast } from 'sonner'
import {
  Attachment,
  AttachmentPreview,
  AttachmentRemove,
  Attachments,
} from '@/components/ai-elements/attachments'
import type { PromptInputMessage } from '@/components/ai-elements/prompt-input'
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputBody,
  PromptInputFooter,
  PromptInputHeader,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  usePromptInputAttachments,
} from '@/components/ai-elements/prompt-input'
import type { ChatStatus } from '../types'

type PromptAttachment = ReturnType<
  typeof usePromptInputAttachments
>['files'][number]

interface ChatComposerProps {
  onStop: () => void
  onSubmit: (message: PromptInputMessage) => void
  onTextChange: (event: ChangeEvent<HTMLTextAreaElement>) => void
  status: ChatStatus
  text: string
}

function AttachmentItem({
  attachment,
  onRemove,
}: {
  attachment: PromptAttachment
  onRemove: (id: string) => void
}) {
  const handleRemove = useCallback(() => {
    onRemove(attachment.id)
  }, [onRemove, attachment.id])

  return (
    <Attachment data={attachment} onRemove={handleRemove}>
      <AttachmentPreview />
      <AttachmentRemove />
    </Attachment>
  )
}

function PromptInputAttachmentsDisplay() {
  const attachments = usePromptInputAttachments()

  const handleRemove = useCallback(
    (id: string) => {
      attachments.remove(id)
    },
    [attachments],
  )

  if (attachments.files.length === 0) {
    return null
  }

  return (
    <PromptInputHeader>
      <Attachments variant="inline">
        {attachments.files.map((attachment) => (
          <AttachmentItem
            attachment={attachment}
            key={attachment.id}
            onRemove={handleRemove}
          />
        ))}
      </Attachments>
    </PromptInputHeader>
  )
}

function PromptSubmit({
  onStop,
  status,
  text,
}: {
  onStop: () => void
  status: ChatStatus
  text: string
}) {
  const attachments = usePromptInputAttachments()
  const isDisabled =
    status === 'ready' && !text.trim() && attachments.files.length === 0

  return (
    <PromptInputSubmit disabled={isDisabled} onStop={onStop} status={status} />
  )
}

export function ChatComposer({
  onStop,
  onSubmit,
  onTextChange,
  status,
  text,
}: ChatComposerProps) {
  return (
    <div className="w-full px-4 pb-4">
      <PromptInput
        globalDrop
        multiple
        onError={(error) => {
          toast.error(error.message)
        }}
        onSubmit={onSubmit}
      >
        <PromptInputAttachmentsDisplay />
        <PromptInputBody>
          <PromptInputTextarea
            onChange={onTextChange}
            placeholder="Ask the LLM..."
            value={text}
          />
        </PromptInputBody>
        <PromptInputFooter>
          <PromptInputTools className="flex-wrap">
            <PromptInputActionMenu>
              <PromptInputActionMenuTrigger />
              <PromptInputActionMenuContent>
                <PromptInputActionAddAttachments />
              </PromptInputActionMenuContent>
            </PromptInputActionMenu>
          </PromptInputTools>
          <PromptSubmit onStop={onStop} status={status} text={text} />
        </PromptInputFooter>
      </PromptInput>
    </div>
  )
}
