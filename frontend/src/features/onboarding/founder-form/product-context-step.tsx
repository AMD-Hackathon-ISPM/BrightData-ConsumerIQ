import type { FormEvent } from 'react'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { getCountryCurrency } from './country-options'
import { OnboardingShell, StepContext, StepFooter } from './shared'

type ProductContextStepProps = {
  onBack: () => void
  onNext: () => void
  workspaceName: string
  industry: string
  country: string
  problemToSolve: string
  productName: string
  productDescription: string
  uniqueSellingPoint: string
  mainFeatures: string
  competitiveAdvantage: string
  price: number
  onProblemChange: (value: string) => void
  onProductNameChange: (value: string) => void
  onProductDescriptionChange: (value: string) => void
  onUniqueSellingPointChange: (value: string) => void
  onMainFeaturesChange: (value: string) => void
  onCompetitiveAdvantageChange: (value: string) => void
  onPriceChange: (value: number) => void
  isNextDisabled?: boolean
}

export function ProductContextStep({
  onBack,
  onNext,
  workspaceName,
  industry,
  country,
  problemToSolve,
  productName,
  productDescription,
  uniqueSellingPoint,
  mainFeatures,
  competitiveAdvantage,
  price,
  onProblemChange,
  onProductNameChange,
  onProductDescriptionChange,
  onUniqueSellingPointChange,
  onMainFeaturesChange,
  onCompetitiveAdvantageChange,
  onPriceChange,
  isNextDisabled,
}: ProductContextStepProps) {
  const priceCurrency = getCountryCurrency(country)

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isNextDisabled) return
    onNext()
  }

  return (
    <OnboardingShell
      step={2}
      totalSteps={3}
      progress={66}
      context={
        <StepContext
          items={[
            workspaceName ? `ConsumerIQ for: ${workspaceName}` : '',
            industry,
            country,
          ]}
        />
      }
    >
      <form className="flex flex-col" onSubmit={submit} noValidate>
        <FieldGroup className="gap-6">
          <div className="mb-4 flex flex-col items-start gap-2 text-left">
            <h1 className="text-3xl font-medium tracking-tight">
              Product context
            </h1>
            <p className="text-sm text-balance text-foreground-light">
              What you're building, who it's for, and what makes it different.
            </p>
          </div>

          <Field>
            <FieldLabel htmlFor="problemToSolve">
              What customer problem are you solving?
            </FieldLabel>
            <Textarea
              id="problemToSolve"
              className="min-h-24 bg-background-surface-100 dark:bg-background-surface-100"
              placeholder="Describe the customer problem you are solving, including who feels it and why it matters..."
              required
              value={problemToSolve}
              onChange={(event) => onProblemChange(event.target.value)}
            />
            <FieldError />
          </Field>

          <FieldGroup className="rounded-lg border border-border-default bg-background-muted/20 p-5">
            <div className="-mt-1 mb-1">
              <p className="text-sm font-medium text-foreground-default">
                Product or service description
              </p>
              <p className="mt-1 text-xs text-foreground-muted">
                Add the core product details we should use throughout your
                research.
              </p>
            </div>
            <Field>
              <FieldLabel htmlFor="productName">Primary product name</FieldLabel>
              <Input
                id="productName"
                className="bg-background-surface-100 dark:bg-background-surface-100"
                placeholder="e.g. Glowserum Hydrate+"
                required
                value={productName}
                onChange={(event) => onProductNameChange(event.target.value)}
              />
              <FieldError />
            </Field>
            <Field>
              <FieldLabel htmlFor="productDescription">
                Short product description
              </FieldLabel>
              <Textarea
                id="productDescription"
                className="min-h-20 bg-background-surface-100 dark:bg-background-surface-100"
                placeholder="Explain what the product is, who it is for, and when they would use it..."
                required
                value={productDescription}
                onChange={(event) =>
                  onProductDescriptionChange(event.target.value)
                }
              />
              <FieldError />
            </Field>
            <Field>
              <FieldLabel htmlFor="price">Expected price</FieldLabel>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm font-medium text-foreground-muted">
                  {priceCurrency}
                </span>
                <Input
                  className="bg-background-surface-100 pl-14 dark:bg-background-surface-100"
                  id="price"
                  inputMode="numeric"
                  placeholder="0"
                  type="text"
                  value={price ? price.toLocaleString('en-US') : ''}
                  onChange={(event) => {
                    const digits = event.target.value.replace(/\D/g, '')
                    onPriceChange(digits ? Number(digits) : 0)
                  }}
                />
              </div>
              <FieldError />
            </Field>
            <Field>
              <FieldLabel htmlFor="uniqueSellingPoint">
                Unique selling point
              </FieldLabel>
              <Input
                id="uniqueSellingPoint"
                className="bg-background-surface-100 dark:bg-background-surface-100"
                placeholder="Write one clear reason customers should choose it"
                value={uniqueSellingPoint}
                onChange={(event) =>
                  onUniqueSellingPointChange(event.target.value)
                }
              />
              <FieldError />
            </Field>
            <Field>
              <FieldLabel htmlFor="mainFeatures">Key features</FieldLabel>
              <Textarea
                id="mainFeatures"
                className="min-h-20 bg-background-surface-100 dark:bg-background-surface-100"
                placeholder="List the main features, separated by commas or short lines..."
                value={mainFeatures}
                onChange={(event) => onMainFeaturesChange(event.target.value)}
              />
              <FieldError />
            </Field>
          </FieldGroup>

          <Field>
            <FieldLabel htmlFor="competitiveAdvantage">
              Competitive advantage
            </FieldLabel>
            <Textarea
              id="competitiveAdvantage"
              className="min-h-20 bg-background-surface-100 dark:bg-background-surface-100"
              placeholder="Describe what you can do better than competitors, such as speed, community, sourcing, or formulation..."
              value={competitiveAdvantage}
              onChange={(event) =>
                onCompetitiveAdvantageChange(event.target.value)
              }
            />
            <FieldError />
          </Field>

          <StepFooter onBack={onBack} isDisabled={isNextDisabled} />
        </FieldGroup>
      </form>
    </OnboardingShell>
  )
}
