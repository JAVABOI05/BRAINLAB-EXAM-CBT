import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/app/lib/adminAuth";
import { adminHasPermission } from "@/app/lib/adminRoles";
import { getSupabaseServerClient } from "@/app/lib/supabaseServer";
import {
  getCommunicationServicesConfig,
  saveCommunicationServicesConfig,
  type CommunicationServicesConfig,
} from "@/app/lib/platformConfig";

export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminSession(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const config = await getCommunicationServicesConfig();

    // Fetch subscriber statistics
    const supabase = getSupabaseServerClient();
    const [subscribersRes, unsubscribedRes, totalContactsRes, gamificationProfilesRes] = await Promise.all([
      supabase
        .from("notification_preferences")
        .select("id", { count: "exact", head: true })
        .eq("unsubscribed_all", false),
      supabase
        .from("notification_preferences")
        .select("id", { count: "exact", head: true })
        .eq("unsubscribed_all", true),
      supabase
        .from("mail_contacts")
        .select("id", { count: "exact", head: true }),
      supabase
        .from("user_gamification_profiles")
        .select("id", { count: "exact", head: true }),
    ]);

    const contactsCount = totalContactsRes.count || 0;
    const unsubscribedCount = unsubscribedRes.count || 0;
    const totalCandidatesCount = Math.max(
      contactsCount,
      gamificationProfilesRes.count || 0,
      (subscribersRes.count || 0) + unsubscribedCount
    );
    const activeSubscribersCount = subscribersRes.count || Math.max(0, totalCandidatesCount - unsubscribedCount);

    // Sanitize secrets for non-super_admins
    const isSuper = admin.role === "super_admin" || admin.role === "platform_admin";
    const sanitizedConfig = {
      ...config,
      resend: {
        ...config.resend,
        api_key: isSuper || !config.resend.api_key
          ? config.resend.api_key
          : `••••••••${config.resend.api_key.slice(-4)}`,
      },
      zoho: {
        ...config.zoho,
        smtp_pass: isSuper || !config.zoho.smtp_pass
          ? config.zoho.smtp_pass
          : "••••••••",
      },
      cloudflare: {
        ...config.cloudflare,
        api_token: isSuper || !config.cloudflare.api_token
          ? config.cloudflare.api_token
          : `••••••••${config.cloudflare.api_token.slice(-4)}`,
        turnstile_secret_key: isSuper || !config.cloudflare.turnstile_secret_key
          ? config.cloudflare.turnstile_secret_key
          : `••••••••${config.cloudflare.turnstile_secret_key.slice(-4)}`,
      },
      termii: {
        ...config.termii,
        api_key: isSuper || !config.termii.api_key
          ? config.termii.api_key
          : `••••••••${config.termii.api_key.slice(-4)}`,
      },
    };

    return NextResponse.json({
      success: true,
      config: sanitizedConfig,
      telemetry: {
        totalCandidates: totalCandidatesCount,
        activeSubscribers: activeSubscribersCount || totalCandidatesCount,
        unsubscribed: unsubscribedCount,
        optOutRatePercent: totalCandidatesCount > 0
          ? ((unsubscribedCount / totalCandidatesCount) * 100).toFixed(1)
          : "0.0",
        providers: {
          resendReady: Boolean(config.resend.api_key),
          zohoReady: Boolean(config.zoho.smtp_user && config.zoho.smtp_pass),
          cloudflareReady: Boolean(config.cloudflare.api_token),
          termiiReady: Boolean(config.termii.api_key),
        },
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load config";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminSession(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasPerm = await adminHasPermission("cbt.config.manage", admin.role);
    if (!hasPerm && !["super_admin", "platform_admin"].includes(admin.role)) {
      return NextResponse.json(
        { error: "Insufficient privileges to modify communication provider credentials." },
        { status: 403 }
      );
    }

    const body = (await request.json().catch(() => null)) as CommunicationServicesConfig | null;
    if (!body) {
      return NextResponse.json({ error: "Invalid configuration payload" }, { status: 400 });
    }

    // Preserve existing secrets if masked string was sent back
    const existing = await getCommunicationServicesConfig();
    const unmask = (newVal: string | undefined, oldVal: string | undefined) =>
      newVal && newVal.startsWith("••••") ? oldVal || "" : newVal || "";

    const cleanConfig: CommunicationServicesConfig = {
      ...body,
      resend: {
        ...body.resend,
        api_key: unmask(body.resend?.api_key, existing.resend?.api_key),
      },
      zoho: {
        ...body.zoho,
        smtp_pass: unmask(body.zoho?.smtp_pass, existing.zoho?.smtp_pass),
      },
      cloudflare: {
        ...body.cloudflare,
        api_token: unmask(body.cloudflare?.api_token, existing.cloudflare?.api_token),
        turnstile_secret_key: unmask(
          body.cloudflare?.turnstile_secret_key,
          existing.cloudflare?.turnstile_secret_key
        ),
      },
      termii: {
        ...body.termii,
        api_key: unmask(body.termii?.api_key, existing.termii?.api_key),
      },
    };

    const saved = await saveCommunicationServicesConfig(
      cleanConfig,
      { id: admin.id, email: admin.email },
      `Administrator ${admin.email} updated communication gateway credentials`
    );

    if (!saved) {
      return NextResponse.json({ error: "Failed to persist configuration to platform database" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Communication provider credentials saved successfully.",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to save configuration";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
