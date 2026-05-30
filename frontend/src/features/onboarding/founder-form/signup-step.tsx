import { Button } from '@/components/ui/button'
import { Field, FieldGroup } from '@/components/ui/field'
import { OnboardingShell } from './shared'

type SignupStepProps = {
  onBackToAuth: () => void
  onNext: () => void
  signedInAs: string | null
}

export function SignupStep({
  onBackToAuth,
  onNext,
  signedInAs,
}: SignupStepProps) {
  return (
    <div className="w-full max-w-xl">
      <OnboardingShell progress={0}>
        <FieldGroup className="gap-6">
          <div className="flex flex-col items-start gap-2 text-left">
            <h1 className="text-3xl font-medium tracking-tight">
              Welcome to ConsumerIQ
            </h1>
            <p className="text-sm text-balance text-foreground-light">
              Answer a few launch questions and ConsumerIQ will assemble a
              focused research notebook for your category.
            </p>
          </div>

          {signedInAs ? (
            <p className="font-mono text-xs text-foreground-muted">
              <span className="opacity-70">Signed in as</span>{' '}
              <span className="text-foreground-default">{signedInAs}</span>
            </p>
          ) : null}

          <Field>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                className="w-full sm:flex-1"
                type="button"
                variant="submit"
                onClick={onNext}
              >
                Begin
              </Button>
              <Button
                className="h-[42px] w-full sm:w-auto"
                type="button"
                variant="outline"
                onClick={onBackToAuth}
              >
                Back to sign in
              </Button>
            </div>
          </Field>
        </FieldGroup>
      </OnboardingShell>
    </div>
  )
}
