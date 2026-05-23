import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

function Empty({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty"
      className={cn(
        "flex w-full min-w-0 flex-1 flex-col items-center justify-center gap-4 rounded-xl border-dashed p-6 text-center text-balance",
        className
      )}
      {...props}
    />
  )
}

function EmptyHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-header"
      className={cn("flex max-w-sm flex-col items-center gap-1", className)}
      {...props}
    />
  )
}

const emptyMediaVariants = cva(
  "mb-2 flex shrink-0 items-center justify-center [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        icon: "flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-foreground [&_svg:not([class*='size-'])]:size-4",
      },
      tone: {
        neutral: "",
        brand: "bg-primary/10 text-primary",
        cyan: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300",
        emerald: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
        amber: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
      },
    },
    compoundVariants: [
      {
        variant: "icon",
        tone: "brand",
        class: "bg-primary/10 text-primary",
      },
      {
        variant: "icon",
        tone: "cyan",
        class: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300",
      },
      {
        variant: "icon",
        tone: "emerald",
        class: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
      },
      {
        variant: "icon",
        tone: "amber",
        class: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
      },
    ],
    defaultVariants: {
      variant: "default",
      tone: "neutral",
    },
  }
)

function EmptyMedia({
  className,
  variant = "default",
  tone = "neutral",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof emptyMediaVariants>) {
  return (
    <div
      data-slot="empty-icon"
      data-variant={variant}
      data-tone={tone}
      className={cn(emptyMediaVariants({ variant, tone, className }))}
      {...props}
    />
  )
}

function EmptyTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-title"
      className={cn(
        "font-heading text-sm font-medium tracking-tight",
        className
      )}
      {...props}
    />
  )
}

function EmptyDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <div
      data-slot="empty-description"
      className={cn(
        "text-xs/relaxed text-muted-foreground [&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary",
        className
      )}
      {...props}
    />
  )
}

function EmptyContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-content"
      className={cn(
        "flex w-full max-w-sm min-w-0 flex-col items-center gap-2 text-xs/relaxed text-balance",
        className
      )}
      {...props}
    />
  )
}

export {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  EmptyMedia,
}
