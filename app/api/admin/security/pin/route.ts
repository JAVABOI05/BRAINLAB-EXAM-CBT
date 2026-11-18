import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getAdminSession } from "@/app/lib/adminAuth";
import { getSupabaseServerClient, getSupabasePublicServerClient } from "@/app/lib/supabaseServer";

export const dynamic = "force-dynamic";

const PIN_CONFIG_KEY = "admin_security_pin";
const PIN_COOKIE_NAME = "brainlab_admin_pin_session";
const PIN_COOKIE_MAX_AGE = 60 * 60 * 4; // 4 hours

// In-memory rate limiting for PIN verification attempts
const attemptTracker = new Map<string, { count: number; lockedUntil: number }>();

function getSecretKey(): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!secret) {
    throw new Error("Missing cryptographic key for Admin PIN verification.");
  }
  return secret;
}

function hashPin(pin: string, salt: string): string {
  return crypto.pbkdf2Sync(pin.trim(), salt, 10000, 32, "sha256").toString("hex");
}

function createSessionToken(userId: string, role: string): string {
  const secret = getSecretKey();
  const timestamp = Date.now();
  const expiresAt = timestamp + PIN_COOKIE_MAX_AGE * 1000;
  const payload = `${userId}:${role}:${expiresAt}`;
  const signature = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return Buffer.from(`${payload}:${signature}`).toString("base64");
}

function verifySessionToken(token: string): { valid: boolean; userId?: string; role?: string } {
  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const parts = decoded.split(":");
    if (parts.length !== 4) return { valid: false };

    const [userId, role, expiresAtStr, signature] = parts;
    const expiresAt = parseInt(expiresAtStr, 10);
    if (isNaN(expiresAt) || Date.now() > expiresAt) {
      return { valid: false };
    }

    const payload = `${userId}:${role}:${expiresAtStr}`;
    const secret = getSecretKey();
    const expectedSignature = crypto.createHmac("sha256", secret).update(payload).digest("hex");

    if (crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return { valid: true, userId, role };
    }
  } catch {
    // Malformed token
  }
  return { valid: false };
}

async function getStoredPinRecord(): Promise<{ hash: string; salt: string; isSet: boolean }> {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("exam_config")
      .select("config_value")
      .eq("config_key", PIN_CONFIG_KEY)
      .maybeSingle();

    if (!error && data?.config_value && typeof data.config_value === "object") {
      const val = data.config_value as { hash?: string; salt?: string };
      if (val.hash && val.salt) {
        return { hash: val.hash, salt: val.salt, isSet: true };
      }
    }
  } catch (err) {
    console.warn("[adminPin] Error reading PIN record from exam_config:", err);
  }

  return {
    hash: null as any,
    salt: null as any,
    isSet: false,
  };
}

export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminSession(request);
    if (!admin) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const cookieToken = request.cookies.get(PIN_COOKIE_NAME)?.value;
    let isVerified = false;
    if (cookieToken) {
      const session = verifySessionToken(cookieToken);
      if (session.valid && session.userId === admin.id) {
        isVerified = true;
      }
    }

    const pinRecord = await getStoredPinRecord();
    const canManage = admin.role === "super_admin" || admin.role === "platform_admin";

    return NextResponse.json({
      ok: true,
      isSet: pinRecord.isSet,
      isVerified,
      canManage,
      adminEmail: admin.email,
      adminRole: admin.role,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed to retrieve PIN status." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminSession(request);
    if (!admin) {
      return NextResponse.json({ ok: false, error: "Unauthorized. Administrator session required." }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const action = body.action || "verify";

    // 1. ACTION: LOCK
    if (action === "lock") {
      const response = NextResponse.json({ ok: true, verified: false, message: "Security PIN session locked." });
      response.cookies.set(PIN_COOKIE_NAME, "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 0,
      });
      return response;
    }

    // 2. ACTION: VERIFY
    if (action === "verify") {
      const pin = String(body.pin || "").trim();
      if (!pin) {
        return NextResponse.json({ ok: false, error: "Please enter your Security PIN." }, { status: 400 });
      }

      // Check rate limiting by admin ID
      const rateKey = admin.id;
      const tracker = attemptTracker.get(rateKey);
      if (tracker && tracker.lockedUntil > Date.now()) {
        const remainingSec = Math.ceil((tracker.lockedUntil - Date.now()) / 1000);
        return NextResponse.json(
          { ok: false, error: `Too many incorrect attempts. Please wait ${remainingSec} seconds before trying again.` },
          { status: 429 }
        );
      }

      const pinRecord = await getStoredPinRecord();
      if (!pinRecord.isSet || !pinRecord.hash || !pinRecord.salt) {
        return NextResponse.json(
          {
            ok: false,
            error: "Security PIN has not been initialized yet. Please initialize your security PIN to continue.",
            setupRequired: true,
            canSetup: admin.role === "super_admin" || admin.role === "platform_admin",
          },
          { status: 400 }
        );
      }
      const inputHash = hashPin(pin, pinRecord.salt);

      const isValid = crypto.timingSafeEqual(Buffer.from(inputHash), Buffer.from(pinRecord.hash));

      if (!isValid) {
        // Record failed attempt
        const count = (tracker?.count || 0) + 1;
        if (count >= 5) {
          attemptTracker.set(rateKey, { count: 0, lockedUntil: Date.now() + 2 * 60 * 1000 }); // 2 min lockout
          return NextResponse.json(
            { ok: false, error: "Incorrect PIN. Account temporarily locked for 2 minutes due to 5 failed attempts." },
            { status: 429 }
          );
        } else {
          attemptTracker.set(rateKey, { count, lockedUntil: 0 });
          return NextResponse.json(
            { ok: false, error: `Incorrect Security PIN. (${5 - count} attempts remaining)` },
            { status: 400 }
          );
        }
      }

      // Successful verification: reset rate limiting tracker
      attemptTracker.delete(rateKey);

      const token = createSessionToken(admin.id, admin.role);
      const response = NextResponse.json({
        ok: true,
        verified: true,
        message: "Security PIN verified successfully.",
      });

      response.cookies.set(PIN_COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: PIN_COOKIE_MAX_AGE,
      });

      return response;
    }

    // 2b. ACTION: SETUP (Initialize PIN if not set)
    if (action === "setup") {
      if (admin.role !== "super_admin" && admin.role !== "platform_admin") {
        return NextResponse.json({ ok: false, error: "Only Super Admin or Platform Admin can initialize the Security PIN." }, { status: 403 });
      }
      const newPin = String(body.newPin || "").trim();
      if (!newPin || newPin.length < 4 || newPin.length > 12) {
        return NextResponse.json({ ok: false, error: "Security PIN must be between 4 and 12 characters." }, { status: 400 });
      }
      const pinRecord = await getStoredPinRecord();
      if (pinRecord.isSet) {
        return NextResponse.json({ ok: false, error: "Security PIN is already initialized. Use update or reset action to change it." }, { status: 400 });
      }
      const newSalt = crypto.randomBytes(16).toString("hex");
      const newHash = hashPin(newPin, newSalt);
      const supabase = getSupabaseServerClient();
      const { error: upsertErr } = await supabase.from("exam_config").upsert(
        {
          config_key: PIN_CONFIG_KEY,
          config_value: {
            hash: newHash,
            salt: newSalt,
            updated_at: new Date().toISOString(),
            updated_by: admin.email,
            is_set: true,
          },
          updated_at: new Date().toISOString(),
        },
        { onConflict: "config_key" }
      );
      if (upsertErr) {
        return NextResponse.json({ ok: false, error: "Failed to initialize PIN: " + upsertErr.message }, { status: 500 });
      }
      attemptTracker.delete(admin.id);
      const token = createSessionToken(admin.id, admin.role);
      const response = NextResponse.json({
        ok: true,
        verified: true,
        message: "Security PIN initialized successfully. Workspace unlocked.",
      });
      response.cookies.set(PIN_COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: PIN_COOKIE_MAX_AGE,
      });
      return response;
    }

    // 2c. ACTION: RESET (Google identity re-authentication)
    if (action === "reset") {
      if (admin.role !== "super_admin" && admin.role !== "platform_admin") {
        return NextResponse.json({ ok: false, error: "Only Super Admin or Platform Admin can reset the Security PIN." }, { status: 403 });
      }

      const reauthAccessToken = String(body.reauthAccessToken || "").trim();
      const newPin = String(body.newPin || "").trim();
      if (!reauthAccessToken) {
        return NextResponse.json({ ok: false, error: "Please complete Google sign-in before resetting the PIN." }, { status: 400 });
      }
      if (!newPin || newPin.length < 4 || newPin.length > 12) {
        return NextResponse.json({ ok: false, error: "New Security PIN must be between 4 and 12 characters." }, { status: 400 });
      }

      try {
        const publicClient = getSupabasePublicServerClient();
        const { data: authData, error: authError } = await publicClient.auth.getUser(reauthAccessToken);
        const authenticatedUser = authData?.user;
        const hasGoogleIdentity = authenticatedUser?.app_metadata?.provider === "google" || authenticatedUser?.identities?.some((identity) => identity.provider === "google");
        const tokenPayload = reauthAccessToken.split(".")[1];
        const claims = tokenPayload ? JSON.parse(Buffer.from(tokenPayload, "base64url").toString("utf8")) as { auth_time?: number } : {};
        const authTime = Number(claims.auth_time || 0);
        const isFreshAuthentication = authTime > 0 && Math.floor(Date.now() / 1000) - authTime <= 5 * 60;

        if (authError || !authenticatedUser || authenticatedUser.id !== admin.id || !hasGoogleIdentity || !isFreshAuthentication) {
          return NextResponse.json({ ok: false, error: "Google verification is missing, expired, or does not match this administrator. Please sign in with Google again." }, { status: 401 });
        }
      } catch (authErr) {
        console.error("[adminPin] Google identity verification error:", authErr);
        return NextResponse.json({ ok: false, error: "Unable to verify Google sign-in. Please try again." }, { status: 401 });
      }

    // Generate new salt and hash
      const newSalt = crypto.randomBytes(16).toString("hex");
      const newHash = hashPin(newPin, newSalt);
      const supabase = getSupabaseServerClient();
      const { error: upsertErr } = await supabase.from("exam_config").upsert(
        {
          config_key: PIN_CONFIG_KEY,
          config_value: {
            hash: newHash,
            salt: newSalt,
            updated_at: new Date().toISOString(),
            updated_by: admin.email,
            is_set: true,
          },
          updated_at: new Date().toISOString(),
        },
        { onConflict: "config_key" }
      );

      if (upsertErr) {
        return NextResponse.json({ ok: false, error: "Failed to reset PIN: " + upsertErr.message }, { status: 500 });
      }

      // Clear any lockout tracker
      attemptTracker.delete(admin.id);

      const token = createSessionToken(admin.id, admin.role);
      const response = NextResponse.json({
        ok: true,
        verified: true,
        message: "Admin Security PIN reset successfully. Workspace unlocked.",
      });

      response.cookies.set(PIN_COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: PIN_COOKIE_MAX_AGE,
      });

      return response;
    }

    // 3. ACTION: UPDATE (Change PIN)
    if (action === "update") {
      if (admin.role !== "super_admin" && admin.role !== "platform_admin") {
        return NextResponse.json({ ok: false, error: "Only Super Admin or Platform Admin can update the Security PIN." }, { status: 403 });
      }

      const currentPin = String(body.currentPin || "").trim();
      const newPin = String(body.newPin || "").trim();

      if (!currentPin) {
        return NextResponse.json({ ok: false, error: "Current PIN is required." }, { status: 400 });
      }

      if (!newPin || newPin.length < 4 || newPin.length > 12) {
        return NextResponse.json({ ok: false, error: "New Security PIN must be between 4 and 12 characters." }, { status: 400 });
      }

      const pinRecord = await getStoredPinRecord();
      if (!pinRecord.isSet || !pinRecord.hash || !pinRecord.salt) {
        return NextResponse.json(
          { ok: false, error: "Security PIN has not been initialized yet. Use the setup action to establish your initial PIN." },
          { status: 400 }
        );
      }
      const currentInputHash = hashPin(currentPin, pinRecord.salt);
      const isCurrentValid = crypto.timingSafeEqual(Buffer.from(currentInputHash), Buffer.from(pinRecord.hash));

      if (!isCurrentValid) {
        return NextResponse.json({ ok: false, error: "The current PIN you entered is incorrect." }, { status: 400 });
      }

      // Generate a new random salt and hash
      const newSalt = crypto.randomBytes(16).toString("hex");
      const newHash = hashPin(newPin, newSalt);

      const supabase = getSupabaseServerClient();
      const { error: upsertError } = await supabase.from("exam_config").upsert(
        {
          config_key: PIN_CONFIG_KEY,
          config_value: {
            hash: newHash,
            salt: newSalt,
            updated_at: new Date().toISOString(),
            updated_by: admin.email,
            is_set: true,
          },
          updated_at: new Date().toISOString(),
        },
        { onConflict: "config_key" }
      );

      if (upsertError) {
        return NextResponse.json({ ok: false, error: "Failed to save new PIN in database." }, { status: 500 });
      }

      // Renew session cookie with the new PIN verified
      const token = createSessionToken(admin.id, admin.role);
      const response = NextResponse.json({
        ok: true,
        verified: true,
        message: "Admin Security PIN updated successfully.",
      });

      response.cookies.set(PIN_COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: PIN_COOKIE_MAX_AGE,
      });

      return response;
    }

    return NextResponse.json({ ok: false, error: "Invalid action." }, { status: 400 });
  } catch (err: unknown) {
    console.error("[api/admin/security/pin] Error:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Internal PIN verification error." },
      { status: 500 }
    );
  }
}
