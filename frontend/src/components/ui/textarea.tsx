import * as React from "react";

import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
    return (
        <textarea
            data-slot="textarea"
            className={cn(
                "min-h-24 w-full min-w-0 rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus-visible:border-sidebar-ring focus-visible:ring-3 focus-visible:ring-sidebar-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
                className,
            )}
            {...props}
        />
    );
}

export { Textarea };
