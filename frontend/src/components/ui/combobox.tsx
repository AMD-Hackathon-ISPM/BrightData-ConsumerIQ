"use client";

import * as React from "react";
import { Combobox as ComboboxPrimitive } from "@base-ui/react";
import { IconCheck, IconX } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const Combobox = ComboboxPrimitive.Root;

function ComboboxValue(props: ComboboxPrimitive.Value.Props) {
    return <ComboboxPrimitive.Value data-slot="combobox-value" {...props} />;
}

function ComboboxContent({
    className,
    side = "bottom",
    sideOffset = 6,
    align = "start",
    alignOffset = 0,
    anchor,
    ...props
}: ComboboxPrimitive.Popup.Props &
    Pick<
        ComboboxPrimitive.Positioner.Props,
        "side" | "align" | "sideOffset" | "alignOffset" | "anchor"
    >) {
    return (
        <ComboboxPrimitive.Portal>
            <ComboboxPrimitive.Positioner
                align={align}
                alignOffset={alignOffset}
                anchor={anchor}
                className="isolate z-[60]"
                side={side}
                sideOffset={sideOffset}
            >
                <ComboboxPrimitive.Popup
                    className={cn(
                        "group/combobox-content pointer-events-auto relative max-h-(--available-height) w-(--anchor-width) max-w-(--available-width) min-w-[calc(var(--anchor-width)+--spacing(7))] origin-(--transform-origin) overflow-hidden rounded-lg bg-popover text-foreground shadow-md ring-1 ring-foreground/10 duration-100 data-[chips=true]:min-w-(--anchor-width) data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
                        className,
                    )}
                    data-chips={!!anchor}
                    data-slot="combobox-content"
                    {...props}
                />
            </ComboboxPrimitive.Positioner>
        </ComboboxPrimitive.Portal>
    );
}

function ComboboxList(props: ComboboxPrimitive.List.Props) {
    return (
        <ComboboxPrimitive.List
            className="max-h-[min(calc(--spacing(72)---spacing(9)),calc(var(--available-height)---spacing(9)))] scroll-py-1 overflow-y-auto overscroll-contain p-1 data-empty:p-0"
            data-slot="combobox-list"
            {...props}
        />
    );
}

function ComboboxItem({
    className,
    children,
    ...props
}: ComboboxPrimitive.Item.Props) {
    return (
        <ComboboxPrimitive.Item
            className={cn(
                "relative flex min-h-7 w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-xs/relaxed outline-hidden select-none data-highlighted:bg-card data-highlighted:text-muted-foreground data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
                className,
            )}
            data-slot="combobox-item"
            {...props}
        >
            {children}
            <ComboboxPrimitive.ItemIndicator
                render={
                    <span className="pointer-events-none absolute right-2 flex items-center justify-center" />
                }
            >
                <IconCheck />
            </ComboboxPrimitive.ItemIndicator>
        </ComboboxPrimitive.Item>
    );
}

function ComboboxEmpty({ className, ...props }: ComboboxPrimitive.Empty.Props) {
    return (
        <ComboboxPrimitive.Empty
            className={cn(
                "hidden w-full justify-center py-2 text-center text-xs/relaxed text-muted-foreground group-data-empty/combobox-content:flex",
                className,
            )}
            data-slot="combobox-empty"
            {...props}
        />
    );
}

function ComboboxChips({
    className,
    ...props
}: React.ComponentPropsWithRef<typeof ComboboxPrimitive.Chips> &
    ComboboxPrimitive.Chips.Props) {
    return (
        <ComboboxPrimitive.Chips
            className={cn(
                "flex min-h-9 flex-wrap items-center gap-1 rounded-md border border-border bg-background px-1 py-1 text-sm transition-colors focus-within:border-sidebar-ring focus-within:ring-3 focus-within:ring-sidebar-ring/50 has-aria-invalid:border-destructive has-aria-invalid:ring-3 has-aria-invalid:ring-destructive/20 dark:has-aria-invalid:border-destructive/50 dark:has-aria-invalid:ring-destructive/40",
                className,
            )}
            data-slot="combobox-chips"
            {...props}
        />
    );
}

function ComboboxChip({
    className,
    children,
    showRemove = true,
    ...props
}: ComboboxPrimitive.Chip.Props & {
    showRemove?: boolean;
}) {
    return (
        <ComboboxPrimitive.Chip
            className={cn(
                "flex h-7 w-fit items-center justify-center gap-1 rounded-md bg-muted px-2 text-xs font-medium whitespace-nowrap text-foreground has-disabled:pointer-events-none has-disabled:cursor-not-allowed has-disabled:opacity-50 has-data-[slot=combobox-chip-remove]:pr-0.5",
                className,
            )}
            data-slot="combobox-chip"
            {...props}
        >
            {children}
            {showRemove ? (
                <ComboboxPrimitive.ChipRemove
                    className="-ml-0.5 opacity-60 hover:opacity-100"
                    data-slot="combobox-chip-remove"
                    render={
                        <Button size="icon-xs" type="button" variant="ghost" />
                    }
                >
                    <IconX />
                </ComboboxPrimitive.ChipRemove>
            ) : null}
        </ComboboxPrimitive.Chip>
    );
}

function ComboboxChipsInput({
    className,
    ...props
}: ComboboxPrimitive.Input.Props) {
    return (
        <ComboboxPrimitive.Input
            className={cn(
                "min-w-20 flex-1 bg-transparent py-1 text-sm outline-none placeholder:text-muted-foreground",
                className,
            )}
            data-slot="combobox-chip-input"
            {...props}
        />
    );
}

function useComboboxAnchor() {
    return React.useRef<HTMLDivElement | null>(null);
}

export {
    Combobox,
    ComboboxChip,
    ComboboxChips,
    ComboboxChipsInput,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxItem,
    ComboboxList,
    ComboboxValue,
    useComboboxAnchor,
};
