"use client";

import * as React from "react";
import { Command as CommandPrimitive } from "cmdk";
import { IconSearch } from "@tabler/icons-react";

import { cn } from "@/lib/utils";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

function Command({
    className,
    ...props
}: React.ComponentProps<typeof CommandPrimitive>) {
    return (
        <CommandPrimitive
            data-slot="command"
            className={cn(
                "flex h-full w-full flex-col overflow-hidden rounded-md bg-background-default text-foreground-default",
                className,
            )}
            {...props}
        />
    );
}

function CommandDialog({
    title = "Command Palette",
    description = "Search for a command to run...",
    children,
    className,
    showCloseButton = false,
    ...props
}: React.ComponentProps<typeof Dialog> & {
    title?: string;
    description?: string;
    className?: string;
    showCloseButton?: boolean;
}) {
    return (
        <Dialog {...props}>
            <DialogHeader className="sr-only">
                <DialogTitle>{title}</DialogTitle>
                <DialogDescription>{description}</DialogDescription>
            </DialogHeader>
            <DialogContent
                className={cn(
                    "top-1/3 translate-y-0 overflow-hidden rounded-xl! p-0",
                    className,
                )}
                showCloseButton={showCloseButton}
            >
                {children}
            </DialogContent>
        </Dialog>
    );
}

function CommandInput({
    className,
    ...props
}: React.ComponentProps<typeof CommandPrimitive.Input>) {
    return (
        <div
            data-slot="command-input-wrapper"
            className="flex items-center gap-2 border-b border-border-default px-3"
        >
            <IconSearch className="size-4 shrink-0 text-foreground-muted" stroke={1.8} />
            <CommandPrimitive.Input
                data-slot="command-input"
                className={cn(
                    "flex h-9 w-full rounded-md bg-transparent py-2 text-sm outline-none placeholder:text-foreground-muted disabled:cursor-not-allowed disabled:opacity-50",
                    className,
                )}
                {...props}
            />
        </div>
    );
}

function CommandList({
    className,
    ...props
}: React.ComponentProps<typeof CommandPrimitive.List>) {
    return (
        <CommandPrimitive.List
            data-slot="command-list"
            className={cn(
                "max-h-72 scroll-py-1 overflow-x-hidden overflow-y-auto p-1",
                className,
            )}
            {...props}
        />
    );
}

function CommandEmpty({
    className,
    ...props
}: React.ComponentProps<typeof CommandPrimitive.Empty>) {
    return (
        <CommandPrimitive.Empty
            data-slot="command-empty"
            className={cn(
                "flex flex-col items-stretch gap-2 px-3 py-4 text-sm text-foreground-muted",
                className,
            )}
            {...props}
        />
    );
}

function CommandGroup({
    className,
    ...props
}: React.ComponentProps<typeof CommandPrimitive.Group>) {
    return (
        <CommandPrimitive.Group
            data-slot="command-group"
            className={cn(
                "overflow-hidden p-1 text-foreground-default [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-foreground-muted",
                className,
            )}
            {...props}
        />
    );
}

function CommandSeparator({
    className,
    ...props
}: React.ComponentProps<typeof CommandPrimitive.Separator>) {
    return (
        <CommandPrimitive.Separator
            data-slot="command-separator"
            className={cn("-mx-1 h-px bg-border-default", className)}
            {...props}
        />
    );
}

function CommandItem({
    className,
    ...props
}: React.ComponentProps<typeof CommandPrimitive.Item>) {
    return (
        <CommandPrimitive.Item
            data-slot="command-item"
            className={cn(
                "relative flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-hidden select-none hover:bg-background-overlay-hover hover:text-foreground-default data-[selected=true]:bg-background-overlay-hover data-[selected=true]:text-foreground-default data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
                className,
            )}
            {...props}
        />
    );
}

function CommandLoading({
    className,
    ...props
}: React.ComponentProps<typeof CommandPrimitive.Loading>) {
    return (
        <CommandPrimitive.Loading
            data-slot="command-loading"
            className={cn("px-3 py-2 text-xs text-foreground-muted", className)}
            {...props}
        />
    );
}

function CommandShortcut({
    className,
    ...props
}: React.ComponentProps<"span">) {
    return (
        <span
            data-slot="command-shortcut"
            className={cn(
                "ml-auto text-xs tracking-widest text-foreground-muted group-data-selected/command-item:text-foreground-default",
                className,
            )}
            {...props}
        />
    );
}

export {
    Command,
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandLoading,
    CommandSeparator,
    CommandShortcut,
};
