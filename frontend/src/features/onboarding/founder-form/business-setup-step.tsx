import type { FormEvent } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
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
import { cn } from '@/lib/utils'
import { COUNTRIES, type MarketRegion } from './country-options'
import { OnboardingShell, StepFooter } from './shared'

const PHYSICAL_PRODUCT_INDUSTRIES = [
  'Beauty & Personal Care',
  'Fashion & Apparel',
  'Food & Beverage',
  'Home & Lifestyle',
  'Electronics & Gadgets',
]

const REGIONS: MarketRegion[] = [
  'Africa',
  'Asia',
  'Europe',
  'North America',
  'South America',
  'Oceania',
]

const GEN_RANGES = [
  '1 - 12 years old (Gen Alpha)',
  '13 - 28 years old (Gen Z)',
  '29 - 44 years old (Millennials)',
  '45 - 60 years old (Gen X)',
  '61 - 79 years old (Baby Boomers)',
  '80+ years old (Silent Generation)',
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
  targetGen: string[]
  targetGender: string
  targetMarketDetail: string
  salesChannel: string
  onWorkspaceNameChange: (value: string) => void
  onIndustryChange: (value: string) => void
  onRegionChange: (value: string) => void
  onCountryChange: (value: string) => void
  onCountryCodeChange: (value: string) => void
  onTargetGenChange: (value: string[]) => void
  onTargetGenderChange: (value: string) => void
  onTargetMarketDetailChange: (value: string) => void
  onSalesChannelChange: (value: string) => void
  isNextDisabled?: boolean
}

type MultiListProps = {
  id: string
  options: string[]
  placeholder: string
  value: string[]
  onChange: (value: string[]) => void
}

function MultiList({
  id,
  options,
  placeholder,
  value,
  onChange,
}: MultiListProps) {
  const selected = new Set(value)
  const summary =
    value.length === 0
      ? placeholder
      : value.length <= 2
        ? value.join(', ')
        : `${value.slice(0, 2).join(', ')} +${value.length - 2} more`

  const toggleOption = (option: string) => {
    if (selected.has(option)) {
      onChange(value.filter((entry) => entry !== option))
      return
    }

    onChange([...value, option])
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          aria-label={placeholder}
          className="flex h-9 w-full cursor-pointer items-center justify-between gap-1.5 rounded-md border border-control bg-background-surface-100 px-3 py-2 text-left text-sm font-normal whitespace-nowrap transition-colors outline-none hover:border-border-stronger hover:bg-background-selection focus-visible:border-sidebar-ring focus-visible:ring-3 focus-visible:ring-sidebar-ring/50 data-[state=open]:border-border-stronger data-[state=open]:bg-background-selection"
          id={id}
          type="button"
        >
          <span
            className={cn(
              'min-w-0 truncate',
              value.length === 0 && 'text-foreground-muted',
            )}
          >
            {summary}
          </span>
          <ChevronsUpDown className="size-3.5 text-foreground-muted" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-(--radix-popover-trigger-width) gap-1 p-1"
      >
        {options.map((option) => {
          const isChecked = selected.has(option)

          return (
            <button
              className="flex min-h-8 w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-foreground-light outline-none hover:bg-background-overlay-hover hover:text-foreground-default focus:bg-background-overlay-hover focus:text-foreground-default"
              key={option}
              onClick={() => toggleOption(option)}
              type="button"
            >
              <span
                aria-hidden="true"
                className={cn(
                  'flex size-4 shrink-0 items-center justify-center rounded-sm border border-border-default',
                  isChecked &&
                    'border-brand-default bg-brand-default/30 text-brand-default',
                )}
              >
                {isChecked ? <Check className="size-3" /> : null}
              </span>
              <span className="min-w-0 flex-1">{option}</span>
            </button>
          )
        })}
      </PopoverContent>
    </Popover>
  )
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
  onCountryCodeChange,
  onTargetGenChange,
  onTargetGenderChange,
  onTargetMarketDetailChange,
  onSalesChannelChange,
  isNextDisabled,
}: BusinessSetupStepProps) {
  const countryOptions = COUNTRIES.filter((entry) => entry.region === region)
  const allCountriesUnavailable =
    countryOptions.length > 0 &&
    countryOptions.every((entry) => entry.dataStatus === 'unavailable')

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
            <p className="text-sm text-balance text-foreground-light">
              A few framing details so we know where to point the lens.
            </p>
          </div>

          <Field>
            <FieldLabel htmlFor="workspaceName">
              Workspace or brand name
            </FieldLabel>
            <Input
              id="workspaceName"
              autoComplete="organization"
              className="bg-background-surface-100 placeholder:text-foreground-muted placeholder:opacity-100 dark:bg-background-surface-100"
              placeholder="e.g. Lina's Beauty Co."
              required
              value={workspaceName}
              onChange={(event) => onWorkspaceNameChange(event.target.value)}
            />
            <FieldError />
          </Field>

          <Field>
            <FieldLabel htmlFor="industry">What are you launching?</FieldLabel>
            <Select value={industry} onValueChange={onIndustryChange}>
              <SelectTrigger className="h-11 w-full" id="industry">
                <SelectValue placeholder="Choose a product category" />
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
            <FieldError />
          </Field>

          <FieldGroup className="rounded-lg border border-border-default bg-background-muted/20 p-5">
            <div className="-mt-1 mb-1">
              <p className="text-sm font-medium text-foreground-default">
                Target market
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="region">Region</FieldLabel>
                <Select value={region} onValueChange={onRegionChange}>
                  <SelectTrigger className="h-11 w-full" id="region">
                    <SelectValue placeholder="Choose a region" />
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
                {allCountriesUnavailable ? (
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        className="flex h-11 w-full cursor-pointer items-center justify-between gap-1.5 rounded-md border border-control bg-background-surface-100 px-3 py-2 text-left text-sm font-normal whitespace-nowrap transition-colors outline-none hover:border-border-stronger hover:bg-background-selection focus-visible:border-sidebar-ring focus-visible:ring-3 focus-visible:ring-sidebar-ring/50 data-[state=open]:border-border-stronger data-[state=open]:bg-background-selection"
                        id="country"
                        type="button"
                      >
                        <span className="min-w-0 truncate text-foreground-muted">
                          No country data available
                        </span>
                        <ChevronsUpDown className="size-3.5 text-foreground-muted" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      align="start"
                      className="w-(--radix-popover-trigger-width) gap-1 p-1"
                    >
                
                      {countryOptions.map((entry) => (
                        <div
                          className="flex min-h-8 w-full cursor-not-allowed items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm text-foreground-muted opacity-45"
                          key={entry.name}
                        >
                          <span className="min-w-0 truncate">
                            {entry.name}
                          </span>
                          <span className="shrink-0 text-[11px]">
                            {entry.code.toUpperCase()} · No data
                          </span>
                        </div>
                      ))}
                    </PopoverContent>
                  </Popover>
                ) : (
                  <Select
                    disabled={!region}
                    value={country}
                    onValueChange={(value) => {
                      const selected = countryOptions.find(
                        (entry) => entry.name === value,
                      )

                      if (!selected || selected.dataStatus === 'unavailable') {
                        onCountryChange('')
                        onCountryCodeChange('')
                        return
                      }

                      onCountryChange(selected.name)
                      onCountryCodeChange(selected.code)
                    }}
                  >
                    <SelectTrigger className="h-11 w-full" id="country">
                      <SelectValue
                        placeholder={
                          region ? 'Choose a country' : 'Choose a region first'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {countryOptions.map((entry) => {
                        const isUnavailable =
                          entry.dataStatus === 'unavailable'

                        return (
                          <SelectItem
                            className={cn(
                              !isUnavailable &&
                                'text-foreground-default focus:bg-background-overlay-hover focus:text-foreground-default',
                              isUnavailable &&
                                'cursor-not-allowed text-foreground-muted opacity-35',
                            )}
                            disabled={isUnavailable}
                            key={entry.name}
                            value={entry.name}
                          >
                            <span className="flex w-full min-w-0 items-center justify-between gap-3">
                              <span className="min-w-0 truncate">
                                {entry.name}
                              </span>
                              <span
                                className={cn(
                                  'shrink-0 text-[11px]',
                                  isUnavailable
                                    ? 'text-foreground-muted'
                                    : 'text-emerald-400',
                                )}
                              >
                                {entry.code.toUpperCase()} ·{' '}
                                {isUnavailable ? 'No data' : 'Available'}
                              </span>
                            </span>
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                )}
                <FieldError />
              </Field>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="targetGen">Target age range</FieldLabel>
                <MultiList
                  id="targetGen"
                  onChange={onTargetGenChange}
                  options={GEN_RANGES}
                  placeholder="Choose your audience age range"
                  value={targetGen}
                />
                <FieldError />
              </Field>

              <Field>
                <FieldLabel htmlFor="targetGender">Target gender</FieldLabel>
                <Select
                  value={targetGender}
                  onValueChange={onTargetGenderChange}
                >
                  <SelectTrigger className="h-11 w-full" id="targetGender">
                    <SelectValue placeholder="Choose the target gender" />
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
                Audience details{' '}
                <span className="text-foreground-muted">(optional)</span>
              </FieldLabel>
              <Textarea
                id="targetMarketDetail"
                className="min-h-20 bg-background-surface-100 dark:bg-background-surface-100"
                placeholder="Describe the audience context, such as location, income level, habits, or specific needs..."
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
                <SelectValue placeholder="Choose a sales channel" />
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
