export type FounderFormState = {
  fullName: string
  workEmail: string
  password: string
  workspaceName: string
  industry: string
  region: string
  marketplace: string
  competitors: string[]
  searchIntentKeywords: string
  customerSegment: string
  painPoint: string
  priceRangeMin: number
  priceRangeMax: number
}

export type FounderFormPayload = {
  fullName: string
  workEmail: string
  password: string
  workspaceName: string
  industry: string
  region: string
  marketplace: string
  competitors: string[]
  searchIntentKeywords: string[]
  customerSegment: string
  painPoint: string
  priceRangeMin: number
  priceRangeMax: number
}
