import type { FormEvent } from 'react'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { OnboardingShell, StepContext, StepFooter } from './shared'

type ProductContextStepProps = {
  onBack: () => void
  onNext: () => void
  workspaceName: string
  industry: string
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
              What problems are you solving?
            </FieldLabel>
            <Textarea
              id="problemToSolve"
              className="min-h-24"
              placeholder="Existing serums sting on sensitive skin and most are priced for occasional use only…"
              required
              value={problemToSolve}
              onChange={(event) => onProblemChange(event.target.value)}
            />
            <FieldDescription>A sentence or two. Be specific.</FieldDescription>
            <FieldError />
          </Field>

          <FieldGroup className="rounded-lg border border-border-default bg-background-muted/20 p-5">
            <div className="-mt-1 mb-1">
              <p className="text-sm font-medium text-foreground-default">
                Product / service description
              </p>
              <p className="mt-1 text-xs text-foreground-muted">
                The core details we'll reference throughout your research.
              </p>
            </div>
            <Field>
              <FieldLabel htmlFor="productName">Nama produk utama</FieldLabel>
              <Input
                id="productName"
                placeholder="e.g. Glowserum Hydrate+"
                required
                value={productName}
                onChange={(event) => onProductNameChange(event.target.value)}
              />
              <FieldError />
            </Field>
            <Field>
              <FieldLabel htmlFor="productDescription">
                Deskripsi singkat
              </FieldLabel>
              <Textarea
                id="productDescription"
                className="min-h-20"
                placeholder="One paragraph of what it is and who it's for…"
                required
                value={productDescription}
                onChange={(event) =>
                  onProductDescriptionChange(event.target.value)
                }
              />
              <FieldError />
            </Field>
            <Field>
              <FieldLabel htmlFor="price">Price</FieldLabel>
              <Input
                id="price"
                inputMode="numeric"
                min={0}
                placeholder="125000"
                step={1000}
                type="number"
                value={price || ''}
                onChange={(event) =>
                  onPriceChange(Number(event.target.value) || 0)
                }
              />
              <FieldError />
            </Field>
            <Field>
              <FieldLabel htmlFor="uniqueSellingPoint">
                Unique selling point
              </FieldLabel>
              <Input
                id="uniqueSellingPoint"
                placeholder="The single line that captures why it wins"
                value={uniqueSellingPoint}
                onChange={(event) =>
                  onUniqueSellingPointChange(event.target.value)
                }
              />
              <FieldError />
            </Field>
            <Field>
              <FieldLabel htmlFor="mainFeatures">Fitur utama</FieldLabel>
              <Textarea
                id="mainFeatures"
                className="min-h-20"
                placeholder="Comma-separated or short bullet lines…"
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
              className="min-h-20"
              placeholder="e.g. Shorter supply chain, founder community presence, proprietary formulation…"
              value={competitiveAdvantage}
              onChange={(event) =>
                onCompetitiveAdvantageChange(event.target.value)
              }
            />
            <FieldDescription>
              What can you do that competitors can't (or won't)?
            </FieldDescription>
            <FieldError />
          </Field>

          <StepFooter onBack={onBack} isDisabled={isNextDisabled} />
        </FieldGroup>
      </form>
    </OnboardingShell>
  )
}
