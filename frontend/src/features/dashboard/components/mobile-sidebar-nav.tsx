import { IconRobot, IconX } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { type DashboardSection, navItems } from "../constants";

export function MobileSidebarNav({
  active,
  onChange,
  onClose,
  onToggleChat,
  isOpen,
}: {
  active: DashboardSection;
  onChange: (section: DashboardSection) => void;
  onClose: () => void;
  onToggleChat?: () => void;
  isOpen: boolean;
}) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 flex md:hidden">
      <button
        aria-label="Close navigation"
        className="flex-1 bg-background-default/70"
        onClick={onClose}
        type="button"
      />
      <aside className="flex h-full w-60 shrink-0 flex-col border-r bg-sidebar px-4 py-6 text-sidebar-foreground shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-sm font-semibold tracking-tight">ConsumerIQ</h2>
            <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-foreground-lighter">
              Mobile Menu
            </p>
          </div>
          <Button
            aria-label="Close navigation"
            onClick={onClose}
            size="icon"
            type="button"
            variant="ghost"
          >
            <IconX className="size-4" stroke={1.8} />
          </Button>
        </div>

        <nav className="mt-6 grid gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.id;

            return (
              <button
                className={cn(
                  "flex h-10 items-center gap-2 rounded-lg px-3 text-left text-xs font-medium transition-colors duration-150",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-foreground-lighter hover:bg-background-muted hover:text-foreground-default"
                )}
                key={item.id}
                onClick={() => {
                  onChange(item.id);
                  onClose();
                }}
                type="button"
              >
                <Icon className="size-4" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="mt-auto border-t pt-4">
          <Button
            className="w-full bg-brand-default text-foreground-contrast hover:bg-brand-400"
            onClick={() => {
              onToggleChat?.();
              onClose();
            }}
            type="button"
          >
            <IconRobot className="size-4" stroke={1.8} />
            Advisor Bot
          </Button>
        </div>
      </aside>
    </div>
  );
}
