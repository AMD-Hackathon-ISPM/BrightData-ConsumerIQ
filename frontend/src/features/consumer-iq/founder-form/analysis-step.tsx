import { Target } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { BasicSelect, Field, OnboardingShell, StepActions } from './shared'

type AnalysisStepProps = {
  onBack: () => void
  onNext: () => void
  workspaceName: string
  industry: string
  region: string
  marketplace: string
  onWorkspaceNameChange: (value: string) => void
  onIndustryChange: (value: string) => void
  onRegionChange: (value: string) => void
  onMarketplaceChange: (value: string) => void
  isNextDisabled?: boolean
}

export function AnalysisStep({
  onBack,
  onNext,
  workspaceName,
  industry,
  region,
  marketplace,
  onWorkspaceNameChange,
  onIndustryChange,
  onRegionChange,
  onMarketplaceChange,
  isNextDisabled,
}: AnalysisStepProps) {
  return (
    <OnboardingShell footer="STEP 02/04" progress={50}>
      <h1 className="text-3xl font-semibold tracking-tight">
        What are we analyzing?
      </h1>
      <p className="mt-3 text-muted-foreground">
        Define the industry and region you want to dominate.
      </p>

      <div className="mt-10 grid gap-7">
        <Field label="Workspace Name">
          <Input
            placeholder="e.g. My Market Research"
            value={workspaceName}
            onChange={(event) => onWorkspaceNameChange(event.target.value)}
          />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Industry">
            <BasicSelect
              placeholder={industry || 'Select industry'}
              values={[
                'Beauty & Personal Care',
                'Food & Beverage',
                'Home & Lifestyle',
                'Fashion & Apparel',
              ]}
              onValueChange={onIndustryChange}
              value={industry}
            />
          </Field>
          <Field label="Region">
            <BasicSelect
              placeholder={region || 'Select region'}
              values={['Indonesia', 'Southeast Asia', 'United States', 'Global']}
              onValueChange={onRegionChange}
              value={region}
            />
          </Field>
        </div>
        <Field label="Primary Marketplace Focus">
          <BasicSelect
            placeholder={marketplace || 'Select marketplace'}
            values={['Shopee', 'Tokopedia', 'TikTok Shop', 'Lazada']}
            onValueChange={onMarketplaceChange}
            value={marketplace}
          />
        </Field>
        <div className="flex gap-4 rounded-lg border bg-muted/60 p-5">
          <Target className="mt-1 size-5 text-foreground" />
          <div>
            <p className="font-medium">Targeting Tip</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Narrowing your region helps our AI models surface localized
              cultural nuances that broader searches often miss.
            </p>
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
