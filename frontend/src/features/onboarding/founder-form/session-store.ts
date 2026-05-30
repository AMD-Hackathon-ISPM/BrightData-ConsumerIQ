import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { FounderFormState } from "./types";

type PipelineSessionState = "running" | "completed";

type PipelineSession = {
  formId: string;
  formState: FounderFormState;
  email: string;
  fullName: string;
  token: string;
  state: PipelineSessionState;
  startedAt: number;
};

type FounderPipelineStore = {
  activeSession: PipelineSession | null;
  draftFormState: FounderFormState | null;
  draftStep: number;
  saveSubmittedSession: (
    session: Omit<PipelineSession, "state" | "startedAt">,
  ) => void;
  saveDraft: (formState: FounderFormState) => void;
  setDraftStep: (step: number) => void;
  clearDraft: () => void;
  markCompleted: () => void;
  clearSession: () => void;
};

export const useFounderPipelineStore = create<FounderPipelineStore>()(
  persist(
    (set) => ({
      activeSession: null,
      draftFormState: null,
      draftStep: 1,
      saveSubmittedSession: (session) =>
        set({
          activeSession: {
            ...session,
            state: "running",
            startedAt: Date.now(),
          },
        }),
      saveDraft: (formState) => set({ draftFormState: formState }),
      setDraftStep: (step) => set({ draftStep: Math.max(1, step) }),
      clearDraft: () => set({ draftFormState: null, draftStep: 1 }),
      markCompleted: () =>
        set((current) => ({
          activeSession: current.activeSession
            ? { ...current.activeSession, state: "completed" }
            : null,
        })),
      clearSession: () => set({ activeSession: null }),
    }),
    {
      name: "consumeriq:founder-pipeline",
      version: 2,
      partialize: (state) => ({
        activeSession: state.activeSession,
        draftFormState: state.draftFormState,
        draftStep: state.draftStep,
      }),
      migrate: (state) => {
        const stored = (state ?? {}) as Partial<FounderPipelineStore>;
        return {
          activeSession: stored.activeSession ?? null,
          draftFormState: stored.draftFormState ?? null,
          draftStep: stored.draftStep ?? 1,
        } as FounderPipelineStore;
      },
    },
  ),
);
