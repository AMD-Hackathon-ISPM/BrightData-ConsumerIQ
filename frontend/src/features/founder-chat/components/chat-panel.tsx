import { IconRobot } from '@tabler/icons-react'
import {
  PanelRightCloseIcon,
  PanelRightOpenIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ChatPanelProps {
  children: ReactNode
  className?: string
  hideWhenCollapsed?: boolean
  isOpen: boolean
  onToggle: () => void
}

export function ChatPanel({
  children,
  className,
  hideWhenCollapsed = false,
  isOpen,
  onToggle,
}: ChatPanelProps) {
  if (hideWhenCollapsed && !isOpen) {
    return null
  }

  return (
    <aside
      className={cn(
        'relative flex h-screen min-h-0 shrink-0 flex-col border-l bg-card',
        !isOpen && 'items-center',
        className,
      )}
    >
      <div
        className={cn(
          'z-20 flex h-14 shrink-0 items-center px-3',
          isOpen
            ? 'absolute inset-x-0 top-0 justify-between bg-card'
            : 'w-full justify-center',
        )}
      >
        {isOpen ? (
          <div className="flex min-w-0 items-center gap-2">
            <IconRobot className="size-4 shrink-0 text-foreground-light" stroke={1.8} />
            <span className="truncate font-medium">Advisor Bot</span>
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
