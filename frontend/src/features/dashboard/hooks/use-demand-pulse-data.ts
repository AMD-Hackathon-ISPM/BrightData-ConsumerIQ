import {
  demandPulseFixture,
  type DemandPulseData,
} from "../data/demand-pulse";

type DemandPulseDataState = {
  data: DemandPulseData;
  isLoading: boolean;
  error: Error | null;
  isFallback: boolean;
};

const fixtureState: DemandPulseDataState = {
  data: demandPulseFixture,
  isLoading: false,
  error: null,
  isFallback: true,
};

export function useDemandPulseData(): DemandPulseDataState {
  return fixtureState;
}
