import { Button } from '@/components/ui/button'
import {
  Field,
  FieldDescription,
  FieldGroup,
} from '@/components/ui/field'
import { OnboardingShell } from './shared'

type SignupStepProps = {
  onNext: () => void
  signedInAs: string | null
}

export function SignupStep({ onNext, signedInAs }: SignupStepProps) {
  return (
    <OnboardingShell progress={0}>
      <FieldGroup className="gap-6">
        <div className="mb-4 flex flex-col items-start gap-2 text-left">
          <h1 className="text-3xl font-medium tracking-tight">
            Welcome to ConsumerIQ
          </h1>
          <p className="text-sm text-balance text-foreground-light">
            The intelligence layer for your next launch. We'll ask a few short
            questions, then quietly assemble a research notebook for your
            category.
          </p>
        </div>

        {signedInAs ? (
          <p className="font-mono text-xs text-foreground-muted">
            <span className="opacity-70">Signed in as</span>{' '}
            <span className="text-foreground-default">{signedInAs}</span>
          </p>
        ) : null}

        <Field>
          <Button size="sm" onClick={onNext}>
            Begin
          </Button>
          <FieldDescription className="pt-2 text-center">
            By continuing, you agree to our Terms of Service and Privacy
            Policy.
          </FieldDescription>
        </Field>
      </FieldGroup>
    </OnboardingShell>
  )
}
