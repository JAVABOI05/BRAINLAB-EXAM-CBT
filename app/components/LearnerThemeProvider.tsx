"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type AppearancePreference = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";
type ThemeContextValue = {
  appearance: AppearancePreference;
  resolvedTheme: ResolvedTheme;
  setAppearance: (appearance: AppearancePreference) => void;
};

const STORAGE_KEY = "brainlab-appearance";
const ThemeContext = createContext<ThemeContextValue | null>(null);

function systemTheme(): ResolvedTheme {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function LearnerThemeProvider({ children }: { children: React.ReactNode }) {
  const [appearance, setAppearanceState] = useState<AppearancePreference>("system");
  const [system, setSystem] = useState<ResolvedTheme>("light");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === "light" || stored === "dark" || stored === "system") setAppearanceState(stored);
    } catch {
      // Appearance remains usable for this session when browser storage is unavailable.
    }
    setSystem(systemTheme());
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setSystem(media.matches ? "dark" : "light");
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const setAppearance = useCallback((next: AppearancePreference) => {
    setAppearanceState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // The selected appearance still applies until the page is closed.
    }
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
