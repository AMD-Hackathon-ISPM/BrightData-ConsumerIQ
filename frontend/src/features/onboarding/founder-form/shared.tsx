import type { ReactNode } from 'react'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-1 overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full bg-foreground transition-all duration-700 ease-out"
        style={{ width: `${value}%` }}
      />
    </div>
  )
}

export function Field({ children, label }: { children: ReactNode; label: string }) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-medium uppercase tracking-[0.16em]">
        {label}
      </span>
      {children}
    </label>
  )
}

export function BasicSelect({
  placeholder,
  values,
  value,
  onValueChange,
}: {
  placeholder: string
  values: string[]
  value?: string
  onValueChange?: (value: string) => void
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="h-11 w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {values.map((value) => (
          <SelectItem key={value} value={value}>
            {value}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function StepActions({
  onBack,
  onNext,
  isNextDisabled,
}: {
  onBack: () => void
  onNext: () => void
  isNextDisabled?: boolean
}) {
  return (
    <div className="mt-3 flex items-center justify-between border-t pt-6">
      <Button onClick={onBack} variant="outline">
        Back
      </Button>
      <Button
        className="bg-foreground text-background hover:bg-foreground/90"
        onClick={onNext}
        disabled={isNextDisabled}
      >
        Continue
        <ArrowRight className="size-4" />
      </Button>
    </div>
  )
}

export function OnboardingShell({
  children,
  footer,
  progress,
}: {
  children: ReactNode
  footer: string
  progress: number
}) {
  return (
    <div className="w-full max-w-2xl overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="p-10">
        <ProgressBar value={progress} />
        <div className="mt-8">{children}</div>
      </div>
      <div className="flex items-center justify-between border-t bg-muted/35 px-10 py-4 text-xs uppercase tracking-[0.16em] text-muted-foreground">
        <span className="flex items-center gap-2">
          <span className="size-3 rounded-sm bg-muted-foreground" />
          {footer}
        </span>
        <span>Secure Transmission</span>
      </div>
    </div>
  )
}

export function MiniMetric({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-4 rounded-lg border bg-card p-4 text-left">
      <span className="grid size-10 place-items-center rounded-md bg-muted">
        {icon}
      </span>
      <div>
        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </p>
        <p className="font-semibold">{value}</p>
      </div>
    </div>
  )
}
