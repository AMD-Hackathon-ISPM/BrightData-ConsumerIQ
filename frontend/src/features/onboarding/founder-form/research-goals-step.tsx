import type { FormEvent } from 'react'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import {
  ChipToggleGroup,
  OnboardingShell,
  StepContext,
  StepFooter,
} from './shared'

const RESEARCH_GOALS = [
  'Who my ideal customer is',
  'Product-market fit',
  'Positioning',
  'Competitor analysis',
  'Market expansion',
  'Customer persona',
  'New product idea validation',
]

type ResearchGoalsStepProps = {
  onBack: () => void
  onNext: () => void
  workspaceName: string
  industry: string
  researchGoals: string[]
  onResearchGoalsChange: (next: string[]) => void
  isNextDisabled?: boolean
}

export function ResearchGoalsStep({
  onBack,
  onNext,
  workspaceName,
  industry,
  researchGoals,
  onResearchGoalsChange,
  isNextDisabled,
}: ResearchGoalsStepProps) {
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isNextDisabled) return
    onNext()
  }

  return (
    <OnboardingShell
      step={3}
      totalSteps={3}
      progress={100}
      context={
        <StepContext
          items={[
            workspaceName ? `ConsumerIQ for: ${workspaceName}` : '',
            industry,
          ]}
        />
      }
    >
      <form className="flex flex-col" onSubmit={submit} noValidate>
        <FieldGroup className="gap-6">
          <div className="mb-4 flex flex-col items-start gap-2 text-left">
            <h1 className="text-3xl font-medium tracking-tight">
              Research goals
            </h1>
            <p className="text-sm text-balance text-muted-foreground">
              What do you want to understand? Pick as many as apply — we'll
              prioritize signals that move these forward.
            </p>
          </div>

          <Field>
            <FieldLabel>Goals</FieldLabel>
            <ChipToggleGroup
              options={RESEARCH_GOALS}
              value={researchGoals}
              onChange={onResearchGoalsChange}
            />
            <FieldDescription>
              {researchGoals.length === 0
                ? 'None selected'
                : `${researchGoals.length} selected`}
            </FieldDescription>
            <FieldError />
          </Field>

          <StepFooter
            onBack={onBack}
            isDisabled={isNextDisabled}
            primaryLabel="Begin analysis"
          />
        </FieldGroup>
      </form>
    </OnboardingShell>
  )
}
