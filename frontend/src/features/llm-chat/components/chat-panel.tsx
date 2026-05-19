import {
  PanelRightCloseIcon,
  PanelRightOpenIcon,
  SparklesIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ChatPanelProps {
  children: ReactNode
  className?: string
  isOpen: boolean
  onToggle: () => void
}

export function ChatPanel({
  children,
  className,
  isOpen,
  onToggle,
}: ChatPanelProps) {
  return (
    <aside
      className={cn(
        'flex h-screen min-h-0 shrink-0 flex-col border-l bg-card',
        !isOpen && 'items-center',
        className,
      )}
    >
      <div
        className={cn(
          'flex h-14 w-full shrink-0 items-center border-b px-3',
          isOpen ? 'justify-between' : 'justify-center',
        )}
      >
        {isOpen ? (
          <div className="flex min-w-0 items-center gap-2">
            <SparklesIcon className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate font-medium">LLM</span>
          </div>
        ) : null}

        <Button
          aria-label={isOpen ? 'Collapse LLM' : 'Expand LLM'}
          onClick={onToggle}
          size="icon"
          type="button"
          variant="ghost"
        >
          {isOpen ? <PanelRightCloseIcon /> : <PanelRightOpenIcon />}
        </Button>
      </div>

      {isOpen ? children : null}
    </aside>
  )
}
