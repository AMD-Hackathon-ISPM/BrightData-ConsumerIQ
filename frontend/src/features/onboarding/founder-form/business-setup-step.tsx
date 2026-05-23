import type { FormEvent } from 'react'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { OnboardingShell, StepFooter } from './shared'

const PHYSICAL_PRODUCT_INDUSTRIES = [
  'Beauty & Personal Care',
  'Fashion & Apparel',
  'Food & Beverage',
  'Home & Lifestyle',
  'Electronics & Gadgets',
]

const REGIONS = [
  'Africa',
  'Asia',
  'Europe',
  'North America',
  'South America',
  'Oceania',
  'Antarctica',
]

const GEN_RANGES = [
  '1 - 12 years old (Gen Alpha)',
  '13 - 28 years old (Gen Z)',
  '29 - 44 years old (Millennials)',
  '45 - 60 years old (Gen X)',
  '61 - 79 years old (Baby Boomers)',
  '80+ years old (Silent Generation)'
]

const GENDERS = ['Female', 'Male', 'All genders']

const SALES_CHANNELS = ['Online store / website', 'Omnichannel']

type BusinessSetupStepProps = {
  onBack: () => void
  onNext: () => void
  workspaceName: string
  industry: string
  region: string
  country: string
  targetGen: string
  targetGender: string
  targetMarketDetail: string
  salesChannel: string
  onWorkspaceNameChange: (value: string) => void
  onIndustryChange: (value: string) => void
  onRegionChange: (value: string) => void
  onCountryChange: (value: string) => void
  onTargetGenChange: (value: string) => void
  onTargetGenderChange: (value: string) => void
  onTargetMarketDetailChange: (value: string) => void
  onSalesChannelChange: (value: string) => void
  isNextDisabled?: boolean
}

export function BusinessSetupStep({
  onBack,
  onNext,
  workspaceName,
  industry,
  region,
  country,
  targetGen,
  targetGender,
  targetMarketDetail,
  salesChannel,
  onWorkspaceNameChange,
  onIndustryChange,
  onRegionChange,
  onCountryChange,
  onTargetGenChange,
  onTargetGenderChange,
  onTargetMarketDetailChange,
  onSalesChannelChange,
  isNextDisabled,
}: BusinessSetupStepProps) {
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isNextDisabled) return
    onNext()
  }

  return (
    <OnboardingShell step={1} totalSteps={3} progress={33}>
      <form className="flex flex-col" onSubmit={submit} noValidate>
        <FieldGroup className="gap-6">
          <div className="mb-4 flex flex-col items-start gap-2 text-left">
            <h1 className="text-3xl font-medium tracking-tight">
              Business setup
            </h1>
            <p className="text-sm text-balance text-muted-foreground">
              A few framing details so we know where to point the lens.
            </p>
          </div>

          <Field>
            <FieldLabel htmlFor="workspaceName">
              Workspace / brand name
            </FieldLabel>
            <Input
              id="workspaceName"
              autoComplete="organization"
              placeholder="e.g. Lina's Beauty Co."
              required
              value={workspaceName}
              onChange={(event) => onWorkspaceNameChange(event.target.value)}
            />
            <FieldDescription>
              Shows up in your sidebar — anything that makes sense to you.
            </FieldDescription>
            <FieldError />
          </Field>

          <Field>
            <FieldLabel htmlFor="industry">What are you launching?</FieldLabel>
            <Select value={industry} onValueChange={onIndustryChange}>
              <SelectTrigger className="h-11 w-full" id="industry">
                <SelectValue placeholder="Pick a category" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Physical product</SelectLabel>
                  {PHYSICAL_PRODUCT_INDUSTRIES.map((entry) => (
                    <SelectItem key={entry} value={entry}>
                      {entry}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <FieldDescription>
              Categories most exposed to go-to-market failure.
            </FieldDescription>
            <FieldError />
          </Field>

          <FieldGroup className="rounded-lg border bg-muted/20 p-5">
            <div className="-mt-1 mb-1">
              <p className="text-sm font-medium text-foreground">
                Target region / market
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Country + demographic detail. Also sets your dashboard
                currency.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="region">Region</FieldLabel>
                <Select value={region} onValueChange={onRegionChange}>
                  <SelectTrigger className="h-11 w-full" id="region">
                    <SelectValue placeholder="Pick a region" />
                  </SelectTrigger>
                  <SelectContent>
                    {REGIONS.map((entry) => (
                      <SelectItem key={entry} value={entry}>
                        {entry}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError />
              </Field>

              <Field>
                <FieldLabel htmlFor="country">Country</FieldLabel>
                <Input
                  id="country"
                  autoComplete="country-name"
                  placeholder="e.g. Indonesia"
                  required
                  value={country}
                  onChange={(event) => onCountryChange(event.target.value)}
                />
                <FieldError />
              </Field>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="targetGen">Gen Target</FieldLabel>
                <Select value={targetGen} onValueChange={onTargetGenChange}>
                  <SelectTrigger className="h-11 w-full" id="targetGen">
                    <SelectValue placeholder="Pick an gen range" />
                  </SelectTrigger>
                  <SelectContent>
                    {GEN_RANGES.map((entry) => (
                      <SelectItem key={entry} value={entry}>
                        {entry}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError />
              </Field>

              <Field>
                <FieldLabel htmlFor="targetGender">Gender</FieldLabel>
                <Select
                  value={targetGender}
                  onValueChange={onTargetGenderChange}
                >
                  <SelectTrigger className="h-11 w-full" id="targetGender">
                    <SelectValue placeholder="Pick a gender" />
                  </SelectTrigger>
                  <SelectContent>
                    {GENDERS.map((entry) => (
                      <SelectItem key={entry} value={entry}>
                        {entry}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError />
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="targetMarketDetail">
                Added details{' '}
                <span className="text-muted-foreground">(optional)</span>
              </FieldLabel>
              <Textarea
                id="targetMarketDetail"
                className="min-h-20"
                placeholder="e.g. urban, mid-income, beauty-savvy early adopters…"
                value={targetMarketDetail}
                onChange={(event) =>
                  onTargetMarketDetailChange(event.target.value)
                }
              />
              <FieldError />
            </Field>
          </FieldGroup>

          <Field>
            <FieldLabel htmlFor="salesChannel">Sales channel</FieldLabel>
            <Select value={salesChannel} onValueChange={onSalesChannelChange}>
              <SelectTrigger className="h-11 w-full" id="salesChannel">
                <SelectValue placeholder="Pick a channel" />
              </SelectTrigger>
              <SelectContent>
                {SALES_CHANNELS.map((entry) => (
                  <SelectItem key={entry} value={entry}>
                    {entry}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError />
          </Field>

          <StepFooter onBack={onBack} isDisabled={isNextDisabled} />
        </FieldGroup>
      </form>
    </OnboardingShell>
  )
}
