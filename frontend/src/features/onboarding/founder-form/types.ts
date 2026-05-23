export type FounderFormState = {
  fullName: string
  workEmail: string
  password: string

  workspaceName: string
  industry: string
  region: string
  country: string
  targetAge: string
  targetGender: string
  targetMarketDetail: string
  salesChannel: string

  problemToSolve: string
  productName: string
  productDescription: string
  uniqueSellingPoint: string
  mainFeatures: string
  competitiveAdvantage: string
  priceRangeMin: number
  priceRangeMid: number
  priceRangeMax: number

  researchGoals: string[]
}

export type FounderFormPayload = FounderFormState
