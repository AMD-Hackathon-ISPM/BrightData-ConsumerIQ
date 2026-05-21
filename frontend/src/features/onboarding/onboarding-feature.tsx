import { useCallback, useState } from "react";
import { toast } from "sonner";
import {
  AnalysisStep,
  GeneratingStep,
  SignupStep,
  WhiteSpaceStep,
} from "./founder-form";
import { AnimatedPage } from "@/components/animated-page";
import { submitFounderForm } from "./founder-form/api";
import type { FounderFormPayload, FounderFormState } from "./founder-form/types";

export function ConsumerIQOnboarding({
  onComplete,
}: {
  onComplete: () => void
}) {
  const [step, setStep] = useState(1)
  const [submitStatus, setSubmitStatus] = useState<
    'idle' | 'submitting' | 'success' | 'error'
  >('idle')
  const [submittedFormId, setSubmittedFormId] = useState<string | null>(null)
  const [formState, setFormState] = useState<FounderFormState>({
    fullName: '',
    workEmail: '',
    password: '',
    workspaceName: '',
    industry: '',
    region: '',
    marketplace: '',
    competitors: ['', '', ''],
    searchIntentKeywords: '',
    customerSegment: '',
    painPoint: '',
    priceRangeMin: 89000,
    priceRangeMax: 159000,
  })

  const updateField = useCallback(
    <T extends keyof FounderFormState>(field: T, value: FounderFormState[T]) => {
      setFormState((current: FounderFormState) => ({
        ...current,
        [field]: value,
      }))
    },
    [],
  )

  const updateCompetitor = useCallback((index: number, value: string) => {
    setFormState((current: FounderFormState) => {
      const nextCompetitors = [...current.competitors]
      nextCompetitors[index] = value
      return { ...current, competitors: nextCompetitors }
    })
  }, [])

  const handleComplete = useCallback(async () => {
    if (submitStatus === 'success') {
      onComplete()
      return
    }

    if (submitStatus === 'submitting') {
      return
    }

    setSubmitStatus('submitting')
    setSubmittedFormId(null)

    const payload: FounderFormPayload = {
      fullName: formState.fullName,
      workEmail: formState.workEmail,
      password: formState.password,
      workspaceName: formState.workspaceName,
      industry: formState.industry,
      region: formState.region,
      marketplace: formState.marketplace,
      competitors: formState.competitors
        .map((entry: string) => entry.trim())
        .filter(Boolean),
      searchIntentKeywords: formState.searchIntentKeywords
        .split(',')
        .map((entry: string) => entry.trim())
        .filter(Boolean),
      customerSegment: formState.customerSegment,
      painPoint: formState.painPoint,
      priceRangeMin: formState.priceRangeMin,
      priceRangeMax: formState.priceRangeMax,
    }

    try {
      const response = await submitFounderForm(payload)
      setSubmittedFormId(response.id)
      setSubmitStatus('success')
    } catch (_error) {
      setSubmitStatus('error')
      toast.error('Unable to submit the founder form')
    }
  }, [formState, onComplete, submitStatus])

  const isSignupValid =
    formState.fullName.trim().length > 0 &&
    formState.workEmail.includes('@') &&
    formState.password.trim().length >= 8
  const isAnalysisValid =
    formState.workspaceName.trim().length > 0 &&
    formState.industry.trim().length > 0 &&
    formState.region.trim().length > 0 &&
    formState.marketplace.trim().length > 0
  const isWhiteSpaceValid =
    formState.competitors.some((entry: string) => entry.trim().length > 0) &&
    formState.searchIntentKeywords.trim().length > 0 &&
    formState.customerSegment.trim().length > 0 &&
    formState.painPoint.trim().length > 0

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-4xl items-center justify-center px-6 py-10">
        <AnimatedPage className="flex w-full justify-center" transitionKey={step}>
          {step === 1 ? (
            <SignupStep
              onNext={() => setStep(2)}
              fullName={formState.fullName}
              workEmail={formState.workEmail}
              password={formState.password}
              onFullNameChange={(value) => updateField('fullName', value)}
              onWorkEmailChange={(value) => updateField('workEmail', value)}
              onPasswordChange={(value) => updateField('password', value)}
              isNextDisabled={!isSignupValid}
            />
          ) : step === 2 ? (
            <AnalysisStep
              onBack={() => setStep(1)}
              onNext={() => setStep(3)}
              workspaceName={formState.workspaceName}
              industry={formState.industry}
              region={formState.region}
              marketplace={formState.marketplace}
              onWorkspaceNameChange={(value) =>
                updateField('workspaceName', value)
              }
              onIndustryChange={(value) => updateField('industry', value)}
              onRegionChange={(value) => updateField('region', value)}
              onMarketplaceChange={(value) => updateField('marketplace', value)}
              isNextDisabled={!isAnalysisValid}
            />
          ) : step === 3 ? (
            <WhiteSpaceStep
              onBack={() => setStep(2)}
              onNext={() => setStep(4)}
              competitors={formState.competitors}
              searchIntentKeywords={formState.searchIntentKeywords}
              customerSegment={formState.customerSegment}
              painPoint={formState.painPoint}
              onCompetitorChange={updateCompetitor}
              onSearchIntentKeywordsChange={(value) =>
                updateField('searchIntentKeywords', value)
              }
              onCustomerSegmentChange={(value) =>
                updateField('customerSegment', value)
              }
              onPainPointChange={(value) => updateField('painPoint', value)}
              isNextDisabled={!isWhiteSpaceValid}
            />
          ) : (
            <GeneratingStep
              onComplete={handleComplete}
              submitStatus={submitStatus}
              formId={submittedFormId}
            />
          )}
        </AnimatedPage>
      </div>
    </main>
  )
}
