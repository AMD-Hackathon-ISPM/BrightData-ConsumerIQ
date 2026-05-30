import { getAuthToken } from "@/lib/auth";
import type { FounderFormState } from "./types";

function authHeader(): Record<string, string> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const PERSONA_TASK_KEY = "ciq_persona_task_id";

export async function requestEmailWhenReady(formId: string): Promise<void> {
  const response = await fetch(`/api/form-pipeline/${formId}/notify`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader() },
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "notify request failed");
  }
}

export async function startPersonaDecode(
  state: FounderFormState,
): Promise<{ taskId: string }> {
  const response = await fetch("/api/persona-decode", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify({
      category: state.industry,
      country: state.countryCode,
      marketplace: state.salesChannel,
      customerSegment: [state.targetGen, state.targetGender]
        .filter(Boolean)
        .join(", "),
      painPoint: state.problemToSolve,
      priceRangeMin: state.priceRangeMin,
      priceRangeMax: state.priceRangeMax,
      productName: state.productName,
      productDescription: state.productDescription,
      region: state.region,
    }),
  });
  if (!response.ok) throw new Error("persona decode request failed");
  return response.json() as Promise<{ taskId: string }>;
}

export type SubmitFounderFormResponse = {
  id: string;
  status: string;
  token: string;
  user_id: number;
};

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
    searchIntentKeywords: [state.productName, state.industry].filter(Boolean),
    customerSegment: [state.targetGen, state.targetGender]
      .filter(Boolean)
      .join(", "),
    painPoint: state.problemToSolve,
    priceRangeMin: state.priceRangeMin,
    priceRangeMax: state.priceRangeMax,
    country: state.country,
    countryCode: state.countryCode,
    targetMarketDetail: state.targetMarketDetail,
    productName: state.productName,
    productDescription: state.productDescription,
    uniqueSellingPoint: state.uniqueSellingPoint,
    mainFeatures: state.mainFeatures,
    competitiveAdvantage: state.competitiveAdvantage,
  };

  const response = await fetch("/go-api/founder-form/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Request failed");
  }

  return response.json() as Promise<SubmitFounderFormResponse>;
}
