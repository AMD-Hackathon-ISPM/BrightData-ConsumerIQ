import type { FormEvent } from 'react'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Textarea } from '@/components/ui/textarea'
import { OnboardingShell, StepContext, StepFooter } from './shared'

const PRICE_MIN = 50_000
const PRICE_MAX = 300_000
const PRICE_STEP = 1_000

function formatRupiah(value: number) {
  if (value >= 1_000_000) {
    return `Rp${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  }
  return `Rp${Math.round(value / 1000)}K`
}

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
  priceRangeMin: number
  priceRangeMid: number
  priceRangeMax: number
  onProblemChange: (value: string) => void
  onProductNameChange: (value: string) => void
  onProductDescriptionChange: (value: string) => void
  onUniqueSellingPointChange: (value: string) => void
  onMainFeaturesChange: (value: string) => void
  onCompetitiveAdvantageChange: (value: string) => void
  onPriceRangeChange: (min: number, mid: number, max: number) => void
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
  priceRangeMin,
  priceRangeMid,
  priceRangeMax,
  onProblemChange,
  onProductNameChange,
  onProductDescriptionChange,
  onUniqueSellingPointChange,
  onMainFeaturesChange,
  onCompetitiveAdvantageChange,
  onPriceRangeChange,
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
            <p className="text-sm text-balance text-muted-foreground">
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

          <FieldGroup className="rounded-lg border bg-muted/20 p-5">
            <div className="-mt-1 mb-1">
              <p className="text-sm font-medium text-foreground">
                Product / service description
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
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

          <Field>
            <div className="flex items-end justify-between">
              <FieldLabel>Price range</FieldLabel>
              <span className="font-mono text-xs text-muted-foreground">
                {formatRupiah(priceRangeMin)} · {formatRupiah(priceRangeMid)} ·{' '}
                {formatRupiah(priceRangeMax)}
              </span>
            </div>
            <Slider
              min={PRICE_MIN}
              max={PRICE_MAX}
              step={PRICE_STEP}
              minStepsBetweenThumbs={1}
              value={[priceRangeMin, priceRangeMid, priceRangeMax]}
              onValueChange={(values) => {
                const sorted = [...values].sort((a, b) => a - b) as [
                  number,
                  number,
                  number,
                ]
                onPriceRangeChange(sorted[0], sorted[1], sorted[2])
              }}
            />
            <div className="mt-2 grid grid-cols-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              <span className="text-left">Lowest</span>
              <span className="text-center">Main</span>
              <span className="text-right">Highest</span>
            </div>
          </Field>

          <StepFooter onBack={onBack} isDisabled={isNextDisabled} />
        </FieldGroup>
      </form>
    </OnboardingShell>
  )
}
