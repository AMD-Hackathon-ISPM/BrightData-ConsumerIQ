import { getAuthToken } from "@/lib/auth";
import type { FounderFormState } from "./types";

function authHeader(): Record<string, string> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const PERSONA_TASK_KEY = "ciq_persona_task_id";

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

type SubmittedFounderFormPayload = {
  fullName?: string;
  workEmail?: string;
  workspaceName?: string;
  industry?: string;
  region?: string;
  marketplace?: string;
  customerSegment?: string;
  painPoint?: string;
  priceRangeMin?: number;
  priceRangeMax?: number;
  country?: string;
  countryCode?: string;
  targetMarketDetail?: string;
  productName?: string;
  productDescription?: string;
  uniqueSellingPoint?: string;
  mainFeatures?: string;
  competitiveAdvantage?: string;
};

export type FounderFormRecord = {
  id: string;
  status: string;
  createdAt?: string;
  payload: SubmittedFounderFormPayload;
};

const TARGET_GENDERS = new Set(["Female", "Male", "All genders"]);

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function numberValue(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function splitCustomerSegment(segment: unknown) {
  const parts = text(segment)
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const targetGender = parts.find((part) => TARGET_GENDERS.has(part)) ?? "";
  const targetGen = parts.filter(
    (part) =>
      part !== targetGender &&
      (part.includes("years old") ||
        part.includes("Gen ") ||
        part.includes("Baby Boomers") ||
        part.includes("Silent Generation")),
  );
  return { targetGen, targetGender };
}

export function mapFounderFormPayload(
  payload: SubmittedFounderFormPayload,
): FounderFormState {
  const { targetGen, targetGender } = splitCustomerSegment(
    payload.customerSegment,
  );
  return {
    fullName: text(payload.fullName),
    workEmail: text(payload.workEmail),
    password: "AUTHENTICATED_USER",
    workspaceName: text(payload.workspaceName),
    industry: text(payload.industry),
    region: text(payload.region),
    country: text(payload.country),
    countryCode: text(payload.countryCode),
    targetGen,
    targetGender,
    targetMarketDetail: text(payload.targetMarketDetail),
    salesChannel: text(payload.marketplace),
    problemToSolve: text(payload.painPoint),
    productName: text(payload.productName),
    productDescription: text(payload.productDescription),
    uniqueSellingPoint: text(payload.uniqueSellingPoint),
    mainFeatures: text(payload.mainFeatures),
    competitiveAdvantage: text(payload.competitiveAdvantage),
    priceRangeMin: numberValue(payload.priceRangeMin),
    priceRangeMax: numberValue(payload.priceRangeMax),
    researchGoals: [],
  };
}

export async function fetchFounderForm(
  formId: string,
): Promise<FounderFormRecord> {
  const response = await fetch(`/go-api/founder-form/${formId}`, {
    headers: authHeader(),
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "form fetch failed");
  }
  const record = (await response.json()) as Omit<FounderFormRecord, "payload"> & {
    payload: SubmittedFounderFormPayload | string;
  };
  return {
    ...record,
    payload:
      typeof record.payload === "string"
        ? JSON.parse(record.payload)
        : record.payload,
  };
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
