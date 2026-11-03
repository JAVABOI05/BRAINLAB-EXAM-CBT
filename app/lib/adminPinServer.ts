// Server-side helper to verify Admin Security PIN session token on protected API endpoints
import type { NextRequest } from "next/server";
import crypto from "crypto";

const PIN_COOKIE_NAME = "brainlab_admin_pin_session";

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
