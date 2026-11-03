// Server-side helper to verify Admin Security PIN session token on protected API endpoints
import type { NextRequest } from "next/server";
import crypto from "crypto";
import { getSupabaseServerClient } from "./supabaseServer";

const PIN_COOKIE_NAME = "brainlab_admin_pin_session";
const PIN_CONFIG_KEY = "admin_security_pin";
const DEFAULT_PIN = "1234";

function getSecretKey(): string {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "brainlab-admin-security-pin-secret-key-2026"
  );
}

export function isPinSessionValid(request: NextRequest, adminId?: string): boolean {
  try {
    const token = request.cookies.get(PIN_COOKIE_NAME)?.value;
    if (!token) return false;

    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const parts = decoded.split(":");
    if (parts.length !== 4) return false;

    const [userId, role, expiresAtStr, signature] = parts;
    const expiresAt = parseInt(expiresAtStr, 10);
    if (isNaN(expiresAt) || Date.now() > expiresAt) {
      return false;
    }

    if (adminId && userId !== adminId) {
      return false;
    }

    const payload = `${userId}:${role}:${expiresAtStr}`;
    const secret = getSecretKey();
    const expectedSignature = crypto.createHmac("sha256", secret).update(payload).digest("hex");

    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  } catch {
    return false;
  }
}

export async function verifyAdminPin(pin: string): Promise<boolean> {
  try {
    if (!pin || typeof pin !== "string") return false;
    const cleanPin = pin.trim();
    if (!cleanPin) return false;

    // Check against stored PIN in exam_config
    const supabase = getSupabaseServerClient();
    const { data } = await supabase
      .from("exam_config")
      .select("config_value")
      .eq("config_key", PIN_CONFIG_KEY)
      .maybeSingle();

    if (data?.config_value && typeof data.config_value === "object") {
      const val = data.config_value as { hash?: string; salt?: string };
      if (val.hash && val.salt) {
        const computed = crypto.pbkdf2Sync(cleanPin, val.salt, 10000, 32, "sha256").toString("hex");
        if (crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(val.hash))) {
          return true;
        }
      }
    }

    // Fallback to default PIN ("1234")
    const defaultSalt = "brainlab_default_salt";
    const defaultHash = crypto.pbkdf2Sync(DEFAULT_PIN, defaultSalt, 10000, 32, "sha256").toString("hex");
    const testHash = crypto.pbkdf2Sync(cleanPin, defaultSalt, 10000, 32, "sha256").toString("hex");
    return crypto.timingSafeEqual(Buffer.from(testHash), Buffer.from(defaultHash));
  } catch {
    return false;
  }
}
