// Shared state for the tournament hub — single load, fan-out to every tab.
import { createContext, useContext, type ReactNode } from "react";
import type { HubData } from "@/lib/queries";

export interface HubContextValue {
  tournamentId: string;
  data: HubData;
  refresh: () => Promise<void>;
  /** Pre-computed lookup used by every tab (faster than .find everywhere). */
  entrantNameById: Map<string, string>;
}

const HubContext = createContext<HubContextValue | null>(null);

export function HubProvider({ value, children }: { value: HubContextValue; children: ReactNode }) {
  return <HubContext.Provider value={value}>{children}</HubContext.Provider>;
}

export function useHub(): HubContextValue {
  const ctx = useContext(HubContext);
  if (!ctx) throw new Error("useHub must be used inside <HubProvider>");
  return ctx;
}
