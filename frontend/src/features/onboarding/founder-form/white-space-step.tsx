import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { BasicSelect, Field, OnboardingShell, StepActions } from './shared'

type WhiteSpaceStepProps = {
  onBack: () => void
  onNext: () => void
  competitors: string[]
  searchIntentKeywords: string
  customerSegment: string
  painPoint: string
  onCompetitorChange: (index: number, value: string) => void
  onSearchIntentKeywordsChange: (value: string) => void
  onCustomerSegmentChange: (value: string) => void
  onPainPointChange: (value: string) => void
  isNextDisabled?: boolean
}

export function WhiteSpaceStep({
  onBack,
  onNext,
  competitors,
  searchIntentKeywords,
  customerSegment,
  painPoint,
  onCompetitorChange,
  onSearchIntentKeywordsChange,
  onCustomerSegmentChange,
  onPainPointChange,
  isNextDisabled,
}: WhiteSpaceStepProps) {
  return (
    <OnboardingShell footer="INTELLIGENCE ENGINE V2.4.0" progress={75}>
      <span className="rounded bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
        STEP 03/04
      </span>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">
        Targeting the White Space.
      </h1>
      <p className="mt-3 text-muted-foreground">
        Help our AI focus on the most relevant signals.
      </p>

      <div className="mt-8 grid gap-6">
        <Field label="Top 3 Competitors">
          <div className="grid gap-3">
            <Input
              placeholder="Primary direct competitor"
              value={competitors[0] ?? ''}
              onChange={(event) => onCompetitorChange(0, event.target.value)}
            />
            <Input
              placeholder="Secondary market player"
              value={competitors[1] ?? ''}
              onChange={(event) => onCompetitorChange(1, event.target.value)}
            />
            <Input
              placeholder="Emerging challenger"
              value={competitors[2] ?? ''}
              onChange={(event) => onCompetitorChange(2, event.target.value)}
            />
          </div>
        </Field>
        <Field label="Search Intent Keywords">
          <Textarea
            className="min-h-24"
            placeholder="Comma-separated terms (e.g., hydrating serum, serum kulit sensitif, SPF daily serum...)"
            value={searchIntentKeywords}
            onChange={(event) =>
              onSearchIntentKeywordsChange(event.target.value)
            }
          />
        </Field>
        <Field label="Ideal Customer Segment">
          <BasicSelect
            placeholder={customerSegment || 'Select primary segment...'}
            values={[
              'Stressed Young Professional',
              'Skincare Hobbyist',
              'Sensitive Skin Seeker',
            ]}
            value={customerSegment}
            onValueChange={onCustomerSegmentChange}
          />
        </Field>
        <Field label="Biggest Consumer Pain Point">
          <Textarea
            className="min-h-24"
            placeholder="Describe the friction your target audience experiences most frequently..."
            value={painPoint}
            onChange={(event) => onPainPointChange(event.target.value)}
          />
        </Field>
        <div>
          <div className="mb-4 flex items-center justify-between text-xs font-medium uppercase tracking-[0.18em]">
            <span>Target Price Range</span>
            <span>Rp89K - Rp159K</span>
          </div>
          <div className="relative h-1 rounded-full bg-muted">
            <div className="absolute left-0 top-0 h-full w-1/2 rounded-full bg-foreground" />
            <div className="absolute -top-1.5 left-1/2 size-4 rounded-full bg-foreground" />
          </div>
          <div className="mt-3 flex justify-between text-[10px] text-muted-foreground">
            <span>Rp50K</span>
            <span>Rp119K</span>
            <span>Rp300K+</span>
          </div>
        </div>
        <StepActions
          onBack={onBack}
          onNext={onNext}
          isNextDisabled={isNextDisabled}
        />
      </div>
    </OnboardingShell>
  )
}
