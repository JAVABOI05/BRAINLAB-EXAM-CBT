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
      sentRecipientsRes,
      deliveredRecipientsRes,
      openedEventsRes,
      clickedEventsRes,
      bouncedRecipientsRes,
      complainedRecipientsRes,
      failedRecipientsRes,
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
      supabase.from("mail_campaign_recipients").select("id", { count: "exact", head: true }).in("status", ["sent", "delivered", "bounced", "complained"]),
      supabase.from("mail_campaign_recipients").select("id", { count: "exact", head: true }).eq("status", "delivered"),
      supabase.from("mail_events").select("id", { count: "exact", head: true }).eq("event_type", "email.opened"),
      supabase.from("mail_events").select("id", { count: "exact", head: true }).eq("event_type", "email.clicked"),
      supabase.from("mail_campaign_recipients").select("id", { count: "exact", head: true }).eq("status", "bounced"),
      supabase.from("mail_campaign_recipients").select("id", { count: "exact", head: true }).eq("status", "complained"),
      supabase.from("mail_campaign_recipients").select("id", { count: "exact", head: true }).eq("status", "failed"),
    ]);

    const totalContacts = totalContactsRes.count || 0;
    const activeSubscribers = activeSubscribersRes.count || 0;
    const suppressed = suppressedRes.count || 0;
    const openTickets = openTicketsRes.count || 0;
    const pendingApprovalCount = pendingApprovalCampaignsRes.count || 0;
    const totalCampaigns = totalCampaignsRes.count || 0;
    const inboundTotal = inboundMessagesCountRes.count || 0;

    // Delivery metrics are derived from recipient and webhook event records, not placeholder campaign defaults.
    const totalSent = sentRecipientsRes.count || 0;
    const totalDelivered = deliveredRecipientsRes.count || 0;
    const totalOpened = openedEventsRes.count || 0;
    const totalClicked = clickedEventsRes.count || 0;
    const totalBounced = bouncedRecipientsRes.count || 0;
    const totalComplained = complainedRecipientsRes.count || 0;
    const totalFailed = failedRecipientsRes.count || 0;

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
        totalFailed,
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
