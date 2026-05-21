import { nanoid } from "nanoid";
import { type ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";
import { ChatComposer } from "@/features/llm-chat/components/chat-composer";
import { ChatConversation } from "@/features/llm-chat/components/chat-conversation";
import { ChatPanel } from "@/features/llm-chat/components/chat-panel";
import { SuggestionList } from "@/features/llm-chat/components/suggestion-list";
import {
  initialMessages,
  suggestions,
} from "@/features/llm-chat/data/chat-content";
import {
  buildMockResponse,
  delay,
} from "@/features/llm-chat/lib/mock-streaming";
import type { ChatStatus, MessageType } from "@/features/llm-chat/types";
import { cn } from "@/lib/utils";

const STREAM_FRAME_MS = 16;
const STREAM_CHARS_PER_FRAME = 8;

export function FounderChat({
  className,
  isOpen,
  onToggle,
  panelClassName,
}: {
  className?: string;
  isOpen: boolean;
  onToggle: () => void;
  panelClassName?: string;
}) {
  const streamAbortRef = useRef(false);
  const pendingResponseTimeoutRef = useRef<number | null>(null);
  const [text, setText] = useState("");
  const [status, setStatus] = useState<ChatStatus>("ready");
  const [messages, setMessages] = useState<MessageType[]>(initialMessages);
  const [, setStreamingMessageId] = useState<string | null>(null);

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
                  : version
              ),
            };
          }

          return message;
        })
      );
    },
    []
  );

  const streamResponse = useCallback(
    async (messageId: string, content: string) => {
      streamAbortRef.current = false;
      setStatus("streaming");
      setStreamingMessageId(messageId);

      let currentContent = "";

      for (
        let index = STREAM_CHARS_PER_FRAME;
        index <= content.length + STREAM_CHARS_PER_FRAME;
        index += STREAM_CHARS_PER_FRAME
      ) {
        if (streamAbortRef.current) {
          setStatus("ready");
          setStreamingMessageId(null);
          return;
        }

        currentContent = content.slice(0, index);
        updateMessageContent(messageId, currentContent);
        await delay(STREAM_FRAME_MS);
      }

      setStatus("ready");
      setStreamingMessageId(null);
    },
    [updateMessageContent]
  );

  const addUserMessage = useCallback(
    (content: string) => {
      const prompt = content.trim() || "Sent with attachments";
      const userMessage: MessageType = {
        from: "user",
        key: nanoid(),
        versions: [{ content: prompt, id: nanoid() }],
      };

      streamAbortRef.current = false;
      setMessages((previousMessages) => [...previousMessages, userMessage]);

      pendingResponseTimeoutRef.current = window.setTimeout(() => {
        pendingResponseTimeoutRef.current = null;

        if (streamAbortRef.current) {
          return;
        }

        const assistantMessageId = nanoid();
        const assistantMessage: MessageType = {
          from: "assistant",
          key: nanoid(),
          reasoning: {
            content:
              "I treated the prompt as an insights request, selected the most relevant seeded ConsumerIQ patterns, then prepared a concise response for an analyst workflow.",
            duration: 5,
          },
          versions: [{ content: "", id: assistantMessageId }],
        };

        setMessages((previousMessages) => [
          ...previousMessages,
          assistantMessage,
        ]);
        void streamResponse(assistantMessageId, buildMockResponse(prompt));
      }, 500);
    },
    [streamResponse]
  );

  const handleSubmit = useCallback(
    (message: PromptInputMessage) => {
      if (status !== "ready") {
        return;
      }

      const prompt = message.text.trim();
      const hasText = Boolean(prompt);
      const hasAttachments = Boolean(message.files.length);

      if (!(hasText || hasAttachments)) {
        return;
      }

      setStatus("submitted");

      if (hasAttachments) {
        toast.success("Files attached", {
          description: `${message.files.length} file(s) attached to message`,
        });
      }

      addUserMessage(prompt || "Sent with attachments");
      setText("");
    },
    [addUserMessage, status]
  );

  const handleSuggestionClick = useCallback(
    (suggestion: string) => {
      if (status !== "ready") {
        return;
      }

      setStatus("submitted");
      addUserMessage(suggestion);
    },
    [addUserMessage, status]
  );

  const handleStop = useCallback(() => {
    streamAbortRef.current = true;

    if (pendingResponseTimeoutRef.current !== null) {
      window.clearTimeout(pendingResponseTimeoutRef.current);
      pendingResponseTimeoutRef.current = null;
    }

    setStatus("ready");
    setStreamingMessageId(null);
    toast.info("Response stopped");
  }, []);

  useEffect(
    () => () => {
      streamAbortRef.current = true;

      if (pendingResponseTimeoutRef.current !== null) {
        window.clearTimeout(pendingResponseTimeoutRef.current);
      }
    },
    []
  );

  return (
    <div className={cn("h-full min-h-0 bg-background", className)}>
      <ChatPanel
        className={cn(
          "!h-full !min-h-0 transition-[width] duration-200 ease-out",
          panelClassName
        )}
        isOpen={isOpen}
        onToggle={onToggle}
      >
        <div className="relative flex size-full min-h-0 flex-col divide-y overflow-hidden">
          <ChatConversation messages={messages} />
          <div className="grid shrink-0 gap-4 pt-4">
            <SuggestionList
              disabled={status !== "ready"}
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
  );
}
