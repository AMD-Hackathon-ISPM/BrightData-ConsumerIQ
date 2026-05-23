"use client"

import { format, parse, isValid } from "date-fns"
import { IconCalendar } from "@tabler/icons-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
    value: string // "YYYY-MM-DD"
    onChange: (value: string) => void
    placeholder?: string
    className?: string
    invalid?: boolean
}

export function DatePicker({
    value,
    onChange,
    placeholder = "Choose a date",
    className,
    invalid = false,
}: DatePickerProps) {
    const parsed = value ? parse(value, "yyyy-MM-dd", new Date()) : undefined
    const selected = parsed && isValid(parsed) ? parsed : undefined

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    aria-invalid={invalid || undefined}
                    variant="outline"
                    data-empty={!selected}
                    className={cn(
                        "h-9 w-full justify-start rounded-md border border-control bg-background-surface-100 px-3 text-left text-sm font-normal shadow-none transition-colors hover:border-border-stronger hover:bg-background-selection data-[empty=true]:text-foreground-muted data-[state=open]:border-border-stronger data-[state=open]:bg-background-selection",
                        className,
                    )}
                >
                    <IconCalendar className="mr-2 h-4 w-4 shrink-0 opacity-50" stroke={1.8} />
                    {selected ? format(selected, "PPP") : <span>{placeholder}</span>}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                    mode="single"
                    selected={selected}
                    onSelect={(day) => onChange(day ? format(day, "yyyy-MM-dd") : "")}
                    captionLayout="dropdown"
                />
            </PopoverContent>
        </Popover>
    )
}
