import { Button } from '@/components/ui/button'
import {
  Field,
  FieldGroup,
} from '@/components/ui/field'
import { OnboardingShell } from './shared'

type SignupStepProps = {
  onNext: () => void
  signedInAs: string | null
}

export function SignupStep({ onNext, signedInAs }: SignupStepProps) {
  return (
    <div className="w-full max-w-xl">
      <OnboardingShell progress={0}>
        <FieldGroup className="gap-6">
          <div className="flex flex-col items-start gap-2 text-left">
            <h1 className="text-3xl font-medium tracking-tight">
              Welcome to ConsumerIQ
            </h1>
            <p className="text-sm text-balance text-foreground-light">
              Answer a few launch questions and ConsumerIQ will assemble a focused
              research notebook for your category.
            </p>
          </div>

          {signedInAs ? (
            <p className="font-mono text-xs text-foreground-muted">
              <span className="opacity-70">Signed in as</span>{' '}
              <span className="text-foreground-default">{signedInAs}</span>
            </p>
          ) : null}

          <Field>
            <div className="flex justify-center">
              <Button className="w-full" variant="submit" onClick={onNext}>
                Begin
              </Button>
            </div>
          </Field>
        </FieldGroup>
      </OnboardingShell>
    </div>
  )
}
