// Client helper for Admin Security PIN verification and session management
import { supabase } from "./supabase";

const LOCAL_STORAGE_VERIFIED_KEY = "brainlab_admin_pin_verified";
const LOCAL_STORAGE_TIMESTAMP_KEY = "brainlab_admin_pin_verified_at";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 4; // 4 hours

export interface PinStatusResult {
  ok: boolean;
  isSet: boolean;
  isVerified: boolean;
  canManage?: boolean;
  adminEmail?: string;
  adminRole?: string;
  error?: string;
}

export interface PinVerifyResult {
  ok: boolean;
  verified?: boolean;
  isDefault?: boolean;
  message?: string;
  error?: string;
}

export function isAdminPinLocallyVerified(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const isVerified = sessionStorage.getItem(LOCAL_STORAGE_VERIFIED_KEY) === "true";
    if (!isVerified) return false;

    const timestamp = parseInt(sessionStorage.getItem(LOCAL_STORAGE_TIMESTAMP_KEY) || "0", 10);
    if (!timestamp || Date.now() - timestamp > SESSION_DURATION_MS) {
      sessionStorage.removeItem(LOCAL_STORAGE_VERIFIED_KEY);
      sessionStorage.removeItem(LOCAL_STORAGE_TIMESTAMP_KEY);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function setAdminPinLocallyVerified(verified: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (verified) {
      sessionStorage.setItem(LOCAL_STORAGE_VERIFIED_KEY, "true");
      sessionStorage.setItem(LOCAL_STORAGE_TIMESTAMP_KEY, Date.now().toString());
    } else {
      sessionStorage.removeItem(LOCAL_STORAGE_VERIFIED_KEY);
      sessionStorage.removeItem(LOCAL_STORAGE_TIMESTAMP_KEY);
    }
  } catch {
    // Ignore storage restrictions
  }
}

async function getAuthHeader(): Promise<Record<string, string>> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
  } catch {
    return {};
  }
}

export async function checkAdminPinStatus(): Promise<PinStatusResult> {
  try {
    const authHeader = await getAuthHeader();
    const res = await fetch("/api/admin/security/pin", {
      headers: { ...authHeader },
      cache: "no-store",
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return {
        ok: false,
        isSet: false,
        isVerified: false,
        error: data.error || "Failed to check PIN status.",
      };
    }

    const data = await res.json();
    if (data.isVerified) {
      setAdminPinLocallyVerified(true);
    } else if (!isAdminPinLocallyVerified()) {
      setAdminPinLocallyVerified(false);
    }

    return {
      ok: true,
      isSet: !!data.isSet,
      isVerified: !!data.isVerified || isAdminPinLocallyVerified(),
      canManage: !!data.canManage,
      adminEmail: data.adminEmail || "",
      adminRole: data.adminRole || "",
    };
  } catch (err) {
    return {
      ok: false,
      isSet: false,
      isVerified: isAdminPinLocallyVerified(),
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}

export async function verifyAdminPin(pin: string): Promise<PinVerifyResult> {
  try {
    const authHeader = await getAuthHeader();
    const res = await fetch("/api/admin/security/pin", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeader,
      },
      body: JSON.stringify({ action: "verify", pin }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      setAdminPinLocallyVerified(false);
      return {
        ok: false,
        error: data.error || "Incorrect Security PIN. Please try again.",
      };
    }

    setAdminPinLocallyVerified(true);
    return {
      ok: true,
      verified: true,
      message: data.message || "Security PIN verified successfully.",
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Could not verify PIN. Check your connection.",
    };
  }
}

export async function setupAdminPin(newPin: string): Promise<PinVerifyResult> {
  try {
    const authHeader = await getAuthHeader();
    const res = await fetch("/api/admin/security/pin", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeader,
      },
      body: JSON.stringify({ action: "setup", newPin }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      return {
        ok: false,
        error: data.error || "Failed to initialize Security PIN.",
      };
    }

    setAdminPinLocallyVerified(true);
    return {
      ok: true,
      verified: true,
      message: data.message || "Security PIN initialized successfully.",
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to connect to PIN service.",
    };
  }
}

export async function resetAdminPin(params: { newPin: string }): Promise<PinVerifyResult> {
  try {
    const authHeader = await getAuthHeader();
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    const reauthAccessToken = sessionData.session?.access_token;
    if (sessionError || !reauthAccessToken) {
      return { ok: false, error: "Please sign in with Google again before resetting the PIN." };
    }
    const res = await fetch("/api/admin/security/pin", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeader,
      },
      body: JSON.stringify({
        action: "reset",
        reauthAccessToken,
        newPin: params.newPin,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      return {
        ok: false,
        error: data.error || "Failed to reset Security PIN.",
      };
    }

    setAdminPinLocallyVerified(true);
    return {
      ok: true,
      verified: true,
      message: data.message || "Security PIN reset successfully.",
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to connect to PIN service.",
    };
  }
}

export async function updateAdminPin(currentPin: string, newPin: string): Promise<PinVerifyResult> {
  try {
    const authHeader = await getAuthHeader();
    const res = await fetch("/api/admin/security/pin", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeader,
      },
      body: JSON.stringify({ action: "update", currentPin, newPin }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      return {
        ok: false,
        error: data.error || "Failed to update Security PIN.",
      };
    }

    setAdminPinLocallyVerified(true);
    return {
      ok: true,
      message: data.message || "Security PIN updated successfully.",
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to connect to PIN service.",
    };
  }
}

export async function lockAdminPin(): Promise<void> {
  setAdminPinLocallyVerified(false);
  try {
    const authHeader = await getAuthHeader();
    await fetch("/api/admin/security/pin", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeader,
      },
      body: JSON.stringify({ action: "lock" }),
    });
  } catch {
    // Non-fatal
  }
}
