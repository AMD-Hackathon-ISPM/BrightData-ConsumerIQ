import type { FounderFormState } from './types'

export type SubmitFounderFormResponse = {
  id: string
  status: string
  token: string
  user_id: number
}

export async function submitFounderForm(
  state: FounderFormState,
): Promise<SubmitFounderFormResponse> {
  const payload = {
    fullName: state.fullName,
    workEmail: state.workEmail,
    password: state.password,
    workspaceName: state.workspaceName,
    industry: state.industry,
    region: state.region,
    marketplace: state.salesChannel,
    competitors: [] as string[],
    searchIntentKeywords: state.researchGoals,
    customerSegment: [state.targetGen.join(', '), state.targetGender]
      .filter(Boolean)
      .join(', '),
    painPoint: state.problemToSolve,
    priceRangeMin: state.priceRangeMin,
    priceRangeMax: state.priceRangeMax,
    country: state.country,
    targetMarketDetail: state.targetMarketDetail,
    productName: state.productName,
    productDescription: state.productDescription,
    uniqueSellingPoint: state.uniqueSellingPoint,
    mainFeatures: state.mainFeatures,
    competitiveAdvantage: state.competitiveAdvantage,
    priceRangeMid: Math.round((state.priceRangeMin + state.priceRangeMax) / 2),
  }

  const response = await fetch('/go-api/founder-form/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || 'Request failed')
  }

  return response.json() as Promise<SubmitFounderFormResponse>
}
