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
  saveSubmittedSession: (
    session: Omit<PipelineSession, "state" | "startedAt">,
  ) => void;
  markCompleted: () => void;
  clearSession: () => void;
};

export const useFounderPipelineStore = create<FounderPipelineStore>()(
  persist(
    (set) => ({
      activeSession: null,
      saveSubmittedSession: (session) =>
        set({
          activeSession: {
            ...session,
            state: "running",
            startedAt: Date.now(),
          },
        }),
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
      version: 1,
    },
  ),
);
