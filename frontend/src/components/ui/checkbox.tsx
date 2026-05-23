import * as React from "react";
import { Checkbox as CheckboxPrimitive } from "radix-ui";
import { IconCheck } from "@tabler/icons-react";

import { cn } from "@/lib/utils";

function Checkbox({
    className,
    ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
    return (
        <CheckboxPrimitive.Root
            data-slot="checkbox"
            className={cn(
                "peer size-4 shrink-0 rounded-[4px] border border-border-default bg-background-surface-100 shadow-sm outline-none transition-[color,box-shadow,border-color] focus-visible:border-sidebar-ring focus-visible:ring-3 focus-visible:ring-sidebar-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-brand-default data-[state=checked]:bg-brand-default data-[state=checked]:text-foreground-contrast aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 cursor-pointer",
                className,
            )}
            {...props}
        >
            <CheckboxPrimitive.Indicator
                data-slot="checkbox-indicator"
                className="flex items-center justify-center text-current transition-none"
            >
                <IconCheck className="size-3.5" stroke={2.4} />
            </CheckboxPrimitive.Indicator>
        </CheckboxPrimitive.Root>
    );
}

export { Checkbox };
