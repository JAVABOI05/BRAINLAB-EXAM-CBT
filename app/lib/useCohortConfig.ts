"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_COHORT_CONFIG,
  type CohortPlatformConfig,
  getCohortConfig,
  buildCohortWhatsAppUrl,
} from "./platformConfig";

let cachedCohortConfig: CohortPlatformConfig = DEFAULT_COHORT_CONFIG;
let hasInitialized = false;
const listeners = new Set<(cfg: CohortPlatformConfig) => void>();

function notifyListeners(cfg: CohortPlatformConfig) {
  cachedCohortConfig = cfg;
  listeners.forEach((listener) => {
    try {
      listener(cfg);
    } catch {}
  });
}

/**
 * React hook that returns the active Cohort configuration.
 * Dynamically updates across all pages when an admin renames or creates a new cohort.
 */
export function useCohortConfig(): CohortPlatformConfig & {
  cohortWhatsAppUrl: string;
} {
  const [config, setConfig] = useState<CohortPlatformConfig>(cachedCohortConfig);

  useEffect(() => {
    listeners.add(setConfig);

    // 1. Immediately read from localStorage if present
    if (typeof window !== "undefined") {
      try {
        const local = localStorage.getItem("brainlab_cfg_cohort_platform_config");
        if (local) {
          const parsed = JSON.parse(local);
          if (parsed && typeof parsed.active_cohort_name === "string" && parsed.active_cohort_name.trim()) {
            notifyListeners({ ...DEFAULT_COHORT_CONFIG, ...parsed });
          }
        }
      } catch {}
    }

    // 2. Fetch authoritative configuration from platformConfig
    if (!hasInitialized) {
      hasInitialized = true;
      getCohortConfig().then((fetched) => {
        if (fetched && fetched.active_cohort_name) {
          notifyListeners(fetched);
        }
      });
    }

    return () => {
      listeners.delete(setConfig);
    };
  }, []);

  const cohortWhatsAppUrl = buildCohortWhatsAppUrl(
    config.active_cohort_name,
    config.whatsapp_inquiry_digits
  );

  return {
    ...config,
    cohortWhatsAppUrl,
  };
}

/**
 * Dispatches an immediate state update when the admin updates the cohort in the admin panel.
 */
export function updateClientCohortConfig(newConfig: CohortPlatformConfig) {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("brainlab_cfg_cohort_platform_config", JSON.stringify(newConfig));
    } catch {}
  }
  notifyListeners(newConfig);
}
