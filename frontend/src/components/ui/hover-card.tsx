"use client";

import * as React from "react";
import { HoverCard as HoverCardPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

function HoverCard({
    openDelay = 100,
    closeDelay = 100,
    ...props
}: React.ComponentProps<typeof HoverCardPrimitive.Root>) {
    return (
        <HoverCardPrimitive.Root
            closeDelay={closeDelay}
            data-slot="hover-card"
            openDelay={openDelay}
            {...props}
        />
    );
}

function HoverCardTrigger({
    ...props
}: React.ComponentProps<typeof HoverCardPrimitive.Trigger>) {
    return (
        <HoverCardPrimitive.Trigger data-slot="hover-card-trigger" {...props} />
    );
}

function HoverCardContent({
    className,
    align = "center",
    sideOffset = 4,
    ...props
}: React.ComponentProps<typeof HoverCardPrimitive.Content>) {
    return (
        <HoverCardPrimitive.Portal>
            <HoverCardPrimitive.Content
                align={align}
                className={cn(
                    "z-50 max-w-64 origin-(--radix-hover-card-content-transform-origin) rounded-md border border-border-default bg-background-dialog-default px-2.5 py-2 text-sm text-foreground-default shadow-md data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
                    className,
                )}
                data-slot="hover-card-content"
                sideOffset={sideOffset}
                {...props}
            />
        </HoverCardPrimitive.Portal>
    );
}

export { HoverCard, HoverCardContent, HoverCardTrigger };
