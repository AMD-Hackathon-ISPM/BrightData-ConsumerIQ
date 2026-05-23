import { useCallback, useState } from "react";
import { toast } from "sonner";
import {
  BusinessSetupStep,
  GeneratingStep,
  ProductContextStep,
  ResearchGoalsStep,
  SignupStep,
} from "./founder-form";
import { AnimatedPage } from "@/components/animated-page";
import { submitFounderForm } from "./founder-form/api";
import { useAuth } from "@/lib/auth";
import type { FounderFormPayload, FounderFormState } from "./founder-form/types";

export function ConsumerIQOnboarding({
  onComplete,
}: {
  onComplete: () => void
}) {
  const { user, loginWithToken } = useAuth()
  const [step, setStep] = useState(1)
  const [submitStatus, setSubmitStatus] = useState<
    'idle' | 'submitting' | 'success' | 'error'
  >('idle')
  const [submittedFormId, setSubmittedFormId] = useState<string | null>(null)
  const [formState, setFormState] = useState<FounderFormState>({
    fullName: user?.fullName ?? '',
    workEmail: user?.email ?? '',
    password: user ? 'AUTHENTICATED_USER' : '',

    workspaceName: '',
    industry: '',
    region: '',
    country: '',
    targetAge: '',
    targetGender: '',
    targetMarketDetail: '',
    salesChannel: '',

    problemToSolve: '',
    productName: '',
    productDescription: '',
    uniqueSellingPoint: '',
    mainFeatures: '',
    competitiveAdvantage: '',
    priceRangeMin: 89_000,
    priceRangeMid: 125_000,
    priceRangeMax: 159_000,

    researchGoals: [],
  })

  const updateField = useCallback(
    <T extends keyof FounderFormState>(
      field: T,
      value: FounderFormState[T],
    ) => {
      setFormState((current) => ({ ...current, [field]: value }))
    },
    [],
  )

  const handleComplete = useCallback(async () => {
    if (submitStatus === 'success' || submitStatus === 'error') {
      onComplete()
      return
    }
    if (submitStatus === 'submitting') {
      return
    }

    setSubmitStatus('submitting')
    setSubmittedFormId(null)

    const payload: FounderFormPayload = { ...formState }

    try {
      const response = await submitFounderForm(payload)
      setSubmittedFormId(response.id)
      loginWithToken(
        { fullName: formState.fullName, email: formState.workEmail },
        response.token,
      )
      setSubmitStatus('success')
    } catch (_error) {
      setSubmitStatus('error')
      toast.error('Unable to submit the founder form')
    }
  }, [formState, loginWithToken, onComplete, submitStatus])

  const isBusinessSetupValid =
    formState.workspaceName.trim().length > 0 &&
    formState.industry.trim().length > 0 &&
    formState.region.trim().length > 0 &&
    formState.country.trim().length > 0 &&
    formState.salesChannel.trim().length > 0
  const isProductContextValid =
    formState.problemToSolve.trim().length > 0 &&
    formState.productName.trim().length > 0 &&
    formState.productDescription.trim().length > 0
  const isResearchGoalsValid = formState.researchGoals.length > 0

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-4xl items-center justify-center px-6 py-10">
        <AnimatedPage
          className="flex w-full justify-center"
          transitionKey={step}
        >
          {step === 1 ? (
            <SignupStep
              onNext={() => setStep(2)}
              signedInAs={user?.email ?? null}
            />
          ) : step === 2 ? (
            <BusinessSetupStep
              onBack={() => setStep(1)}
              onNext={() => setStep(3)}
              workspaceName={formState.workspaceName}
              industry={formState.industry}
              region={formState.region}
              country={formState.country}
              targetAge={formState.targetAge}
              targetGender={formState.targetGender}
              targetMarketDetail={formState.targetMarketDetail}
              salesChannel={formState.salesChannel}
              onWorkspaceNameChange={(value) =>
                updateField('workspaceName', value)
              }
              onIndustryChange={(value) => updateField('industry', value)}
              onRegionChange={(value) => updateField('region', value)}
              onCountryChange={(value) => updateField('country', value)}
              onTargetAgeChange={(value) => updateField('targetAge', value)}
              onTargetGenderChange={(value) =>
                updateField('targetGender', value)
              }
              onTargetMarketDetailChange={(value) =>
                updateField('targetMarketDetail', value)
              }
              onSalesChannelChange={(value) =>
                updateField('salesChannel', value)
              }
              isNextDisabled={!isBusinessSetupValid}
            />
          ) : step === 3 ? (
            <ProductContextStep
              onBack={() => setStep(2)}
              onNext={() => setStep(4)}
              workspaceName={formState.workspaceName}
              industry={formState.industry}
              problemToSolve={formState.problemToSolve}
              productName={formState.productName}
              productDescription={formState.productDescription}
              uniqueSellingPoint={formState.uniqueSellingPoint}
              mainFeatures={formState.mainFeatures}
              competitiveAdvantage={formState.competitiveAdvantage}
              priceRangeMin={formState.priceRangeMin}
              priceRangeMid={formState.priceRangeMid}
              priceRangeMax={formState.priceRangeMax}
              onProblemChange={(value) => updateField('problemToSolve', value)}
              onProductNameChange={(value) =>
                updateField('productName', value)
              }
              onProductDescriptionChange={(value) =>
                updateField('productDescription', value)
              }
              onUniqueSellingPointChange={(value) =>
                updateField('uniqueSellingPoint', value)
              }
              onMainFeaturesChange={(value) =>
                updateField('mainFeatures', value)
              }
              onCompetitiveAdvantageChange={(value) =>
                updateField('competitiveAdvantage', value)
              }
              onPriceRangeChange={(min, mid, max) => {
                updateField('priceRangeMin', min)
                updateField('priceRangeMid', mid)
                updateField('priceRangeMax', max)
              }}
              isNextDisabled={!isProductContextValid}
            />
          ) : step === 4 ? (
            <ResearchGoalsStep
              onBack={() => setStep(3)}
              onNext={() => {
                setStep(5)
                void handleComplete()
              }}
              workspaceName={formState.workspaceName}
              industry={formState.industry}
              researchGoals={formState.researchGoals}
              onResearchGoalsChange={(next) =>
                updateField('researchGoals', next)
              }
              isNextDisabled={!isResearchGoalsValid}
            />
          ) : (
            <GeneratingStep
              onComplete={handleComplete}
              submitStatus={submitStatus}
              formId={submittedFormId}
              region={formState.region}
              industry={formState.industry}
            />
          )}
        </AnimatedPage>
      </div>
    </main>
  )
}
