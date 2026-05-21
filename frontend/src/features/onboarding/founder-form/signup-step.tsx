import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, ProgressBar } from './shared'

type SignupStepProps = {
  onNext: () => void
  fullName: string
  workEmail: string
  password: string
  onFullNameChange: (value: string) => void
  onWorkEmailChange: (value: string) => void
  onPasswordChange: (value: string) => void
  isNextDisabled?: boolean
}

export function SignupStep({
  onNext,
  fullName,
  workEmail,
  password,
  onFullNameChange,
  onWorkEmailChange,
  onPasswordChange,
  isNextDisabled,
}: SignupStepProps) {
  return (
    <div className="w-full max-w-md">
      <div className="rounded-xl border bg-card p-8 shadow-sm">
        <ProgressBar value={25} />
        <div className="mt-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome to ConsumerIQ
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            The intelligence layer for your next big launch.
          </p>
        </div>
        <div className="mt-8 grid gap-5">
          <Field label="Full Name">
            <Input
              placeholder="Acme Corp"
              value={fullName}
              onChange={(event) => onFullNameChange(event.target.value)}
            />
          </Field>
          <Field label="Work Email">
            <Input
              placeholder="name@company.com"
              type="email"
              value={workEmail}
              onChange={(event) => onWorkEmailChange(event.target.value)}
            />
          </Field>
          <Field label="Password">
            <Input
              placeholder="••••••••"
              type="password"
              value={password}
              onChange={(event) => onPasswordChange(event.target.value)}
            />
          </Field>
          <Button
            className="h-11 bg-foreground text-background hover:bg-foreground/90"
            onClick={onNext}
            disabled={isNextDisabled}
          >
            Continue
          </Button>
          <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            or continue with
            <span className="h-px flex-1 bg-border" />
          </div>
          <Button className="h-10" variant="outline">
            <span className="font-semibold text-primary">G</span>
            Google
          </Button>
        </div>
      </div>
      <p className="mt-7 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <span className="font-medium text-foreground underline">Log in</span>
      </p>
      <p className="mx-auto mt-4 max-w-xs text-center text-xs text-muted-foreground">
        By clicking continue, you agree to our Terms of Service and Privacy
        Policy.
      </p>
    </div>
  )
}
