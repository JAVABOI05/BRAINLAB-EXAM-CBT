import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/app/lib/adminAuth";
import { adminHasPermission } from "@/app/lib/adminRoles";
import { getSupabaseServerClient } from "@/app/lib/supabaseServer";
import { getCommunicationServicesConfig } from "@/app/lib/platformConfig";

export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminSession(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasPerm = await adminHasPermission("mail.view", admin.role);
    if (!hasPerm && !["super_admin", "platform_admin", "community_moderator"].includes(admin.role)) {
      return NextResponse.json({ error: "Insufficient privileges" }, { status: 403 });
    }

    const supabase = getSupabaseServerClient();
    const config = await getCommunicationServicesConfig();

    const now = Date.now();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayMs = startOfToday.getTime();
    const sevenDaysAgoMs = now - 7 * 86400 * 1000;
    const thirtyDaysAgoMs = now - 30 * 86400 * 1000;
    const sevenDaysIso = new Date(sevenDaysAgoMs).toISOString();
    const thirtyDaysIso = new Date(thirtyDaysAgoMs).toISOString();

    // 1. Fetch Email and Communication telemetry in parallel
    const [
      totalContactsRes,
      activeSubscribersRes,
      suppressedRes,
      openTicketsRes,
      pendingApprovalCampaignsRes,
      totalCampaignsRes,
      recentCampaignsRes,
      recentInboundRes,
      inboundMessagesCountRes,
      recentEventsRes,
      allCampaignsRes,
    ] = await Promise.all([
      supabase.from("mail_contacts").select("id", { count: "exact", head: true }),
      supabase.from("mail_contacts").select("id", { count: "exact", head: true }).eq("marketing_consent", true).eq("is_suppressed", false),
      supabase.from("mail_contacts").select("id", { count: "exact", head: true }).eq("is_suppressed", true),
      supabase.from("mail_conversations").select("id", { count: "exact", head: true }).in("status", ["open", "pending"]),
      supabase.from("mail_campaigns").select("id", { count: "exact", head: true }).eq("status", "pending_approval"),
      supabase.from("mail_campaigns").select("id", { count: "exact", head: true }),
      supabase.from("mail_campaigns").select("*").order("created_at", { ascending: false }).limit(5),
      supabase
        .from("mail_conversations")
        .select("id, recipient_inbox, customer_email, customer_name, subject, status, priority, message_count, last_message_at")
        .order("last_message_at", { ascending: false })
        .limit(6),
      supabase.from("mail_messages").select("id", { count: "exact", head: true }).eq("direction", "inbound"),
      supabase.from("mail_events").select("*").order("created_at", { ascending: false }).limit(10),
      supabase.from("mail_campaigns").select("stats").in("status", ["sent", "sending"]),
    ]);

    const totalContacts = totalContactsRes.count || 0;
    const activeSubscribers = activeSubscribersRes.count || 0;
    const suppressed = suppressedRes.count || 0;
    const openTickets = openTicketsRes.count || 0;
    const pendingApprovalCount = pendingApprovalCampaignsRes.count || 0;
    const totalCampaigns = totalCampaignsRes.count || 0;
    const inboundTotal = inboundMessagesCountRes.count || 0;

    // 2. Aggregate delivery telemetry across campaigns
    const allCampaigns = allCampaignsRes.data || [];
    let totalSent = 0;
    let totalDelivered = 0;
    let totalOpened = 0;
    let totalClicked = 0;
    let totalBounced = 0;
    let totalComplained = 0;

    allCampaigns.forEach((c) => {
      const s = (c.stats || {}) as Record<string, number>;
      totalSent += s.sent || 0;
      totalDelivered += s.delivered || 0;
      totalOpened += s.opened || 0;
      totalClicked += s.clicked || 0;
      totalBounced += s.bounced || 0;
      totalComplained += s.complained || 0;
    });

    const deliveryRate = totalSent > 0 ? ((totalDelivered / totalSent) * 100).toFixed(1) : "0.0";
    const openRate = totalDelivered > 0 ? ((totalOpened / totalDelivered) * 100).toFixed(1) : "0.0";
    const clickRate = totalDelivered > 0 ? ((totalClicked / totalDelivered) * 100).toFixed(1) : "0.0";
    const bounceRate = totalSent > 0 ? ((totalBounced / totalSent) * 100).toFixed(2) : "0.00";

    return NextResponse.json({
      success: true,
      metrics: {
        totalContacts,
        activeSubscribers,
        suppressed,
        openTickets,
        pendingApprovalCount,
        totalCampaigns,
        totalSent,
        totalDelivered,
        deliveryRate: `${deliveryRate}%`,
        openRate: `${openRate}%`,
        clickRate: `${clickRate}%`,
        bounceRate: `${bounceRate}%`,
        inboundTotal,
      },
      providers: {
        resendConfigured: !!(config?.resend?.api_key || process.env.RESEND_API_KEY),
        resendSender: config?.resend?.from_email || "BrainLab Academy <support@mail.brainlabacademy.com.ng>",
        sendingDomain: "mail.brainlabacademy.com.ng",
        // DNS verification is not queried live by this endpoint. Never claim a record is verified here.
        cloudflareInboundReady: null,
        dkimVerified: null,
        spfAligned: null,
        dmarcEnforced: null,
        mxConfigured: null,
      },
      recentInbound: recentInboundRes.data || [],
      recentCampaigns: recentCampaignsRes.data || [],
      recentEvents: recentEventsRes.data || [],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load overview data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
