"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";

export type AppearancePreference = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";
type ThemeContextValue = {
  appearance: AppearancePreference;
  resolvedTheme: ResolvedTheme;
  setAppearance: (appearance: AppearancePreference) => void;
};

const STORAGE_KEY = "brainlab-appearance";
const APPEARANCE_EVENT = "brainlab-appearance-change";
const ThemeContext = createContext<ThemeContextValue | null>(null);

function getStoredAppearance(): AppearancePreference {
  if (typeof window === "undefined") return "system";
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
  } catch {
    return "system";
  }
}

function subscribeAppearance(onChange: () => void) {
  window.addEventListener(APPEARANCE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(APPEARANCE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function getSystemAppearance(): ResolvedTheme {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function subscribeSystemAppearance(onChange: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

export function LearnerThemeProvider({ children }: { children: React.ReactNode }) {
  // useSyncExternalStore keeps the server and initial hydration snapshots aligned,
  // then reads the saved browser preference without a synchronous effect update.
  const appearance = useSyncExternalStore<AppearancePreference>(subscribeAppearance, getStoredAppearance, () => "system");
  const system = useSyncExternalStore<ResolvedTheme>(subscribeSystemAppearance, getSystemAppearance, () => "light");

  const setAppearance = useCallback((next: AppearancePreference) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // The selected appearance still applies for this session if storage is blocked.
    }
    window.dispatchEvent(new Event(APPEARANCE_EVENT));
  }, []);

  const resolvedTheme: ResolvedTheme = appearance === "system" ? system : appearance;
  const value = useMemo(() => ({ appearance, resolvedTheme, setAppearance }), [appearance, resolvedTheme, setAppearance]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useLearnerTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useLearnerTheme must be used within LearnerThemeProvider.");
  return context;
}
