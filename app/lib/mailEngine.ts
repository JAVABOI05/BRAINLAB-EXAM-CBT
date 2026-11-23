import { randomUUID } from "node:crypto";
import { getSupabaseServerClient } from "@/app/lib/supabaseServer";
import { sendEmail, type SendEmailPayload } from "@/app/lib/emailService";

export type MailMessageKind = "transactional" | "marketing" | "service_notification";

export interface EnqueueMailInput {
  messageKind: MailMessageKind;
  payload: SendEmailPayload;
  idempotencyKey: string;
  metadata?: Record<string, unknown>;
  maxAttempts?: number;
}

export interface EnqueueMailResult {
  id: string;
  duplicate: boolean;
  status: string;
}

function getPrivilegedMailClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for the mail outbox.");
  }
  return getSupabaseServerClient();
}

/**
 * Persist a message before delivery. The unique idempotency key makes retries
 * safe when an upstream BrainLab event is delivered more than once.
 */
export async function enqueueMail(input: EnqueueMailInput): Promise<EnqueueMailResult> {
  const recipients = Array.isArray(input.payload.to) ? input.payload.to : [input.payload.to];
  if (recipients.length !== 1 || !recipients[0] || !recipients[0].includes("@")) {
    throw new Error("The mail outbox requires exactly one valid recipient per job.");
  }
  if (!input.idempotencyKey.trim()) {
    throw new Error("An idempotency key is required.");
  }

  const supabase = getPrivilegedMailClient();
  const row = {
    message_kind: input.messageKind,
    recipient_email: recipients[0].trim().toLowerCase(),
    payload: input.payload,
    idempotency_key: input.idempotencyKey,
    metadata: input.metadata || {},
    max_attempts: Math.min(10, Math.max(1, input.maxAttempts ?? 5)),
  };

  const { data, error } = await supabase
    .from("mail_outbox")
    .insert(row)
    .select("id,status")
    .single();

  if (!error && data) {
    return { id: data.id, status: data.status, duplicate: false };
  }

  if (error?.code === "23505") {
    const { data: existing, error: lookupError } = await supabase
      .from("mail_outbox")
      .select("id,status")
      .eq("idempotency_key", input.idempotencyKey)
      .single();
    if (!lookupError && existing) {
      return { id: existing.id, status: existing.status, duplicate: true };
    }
  }

  throw new Error(error?.message || "Unable to enqueue email.");
}

export interface MailWorkerResult {
  claimed: number;
  sent: number;
  retried: number;
  deadLettered: number;
}

async function finalizeCampaignIfComplete(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  campaignId: string
): Promise<void> {
  const { count: pendingCount, error: pendingError } = await supabase
    .from("mail_outbox")
    .select("id", { count: "exact", head: true })
    .filter("metadata->>campaignId", "eq", campaignId)
    .in("status", ["queued", "processing"]);
  if (pendingError) throw new Error(`Campaign queue status lookup failed: ${pendingError.message}`);
  if ((pendingCount || 0) > 0) return;

  const { data: recipients, error: recipientError } = await supabase
    .from("mail_campaign_recipients")
    .select("status")
    .eq("campaign_id", campaignId);
  if (recipientError) throw new Error(`Campaign recipient summary failed: ${recipientError.message}`);

  const { data: events, error: eventError } = await supabase
    .from("mail_events")
    .select("event_type")
    .eq("campaign_id", campaignId);
  if (eventError) throw new Error(`Campaign event summary failed: ${eventError.message}`);

  const rows = recipients || [];
  const eventRows = events || [];
  const stats = {
    sent: rows.filter((row) => ["sent", "delivered", "bounced", "complained"].includes(row.status)).length,
    delivered: rows.filter((row) => row.status === "delivered").length,
    opened: eventRows.filter((event) => event.event_type === "email.opened").length,
    clicked: eventRows.filter((event) => event.event_type === "email.clicked").length,
    bounced: rows.filter((row) => row.status === "bounced").length,
    complained: rows.filter((row) => row.status === "complained").length,
    failed: rows.filter((row) => row.status === "failed").length,
  };

  const { error: campaignError } = await supabase
    .from("mail_campaigns")
    .update({
      status: stats.sent > 0 ? "sent" : "failed",
      sent_at: new Date().toISOString(),
      stats,
      updated_at: new Date().toISOString(),
    })
    .eq("id", campaignId);
  if (campaignError) throw new Error(`Campaign finalization failed: ${campaignError.message}`);
}

export async function processMailOutboxBatch(batchSize = 20): Promise<MailWorkerResult> {
  const supabase = getPrivilegedMailClient();
  const workerId = `brainlab-mail-${randomUUID()}`;
  const { data: jobs, error } = await supabase.rpc("claim_mail_outbox_jobs", {
    p_limit: Math.min(100, Math.max(1, batchSize)),
    p_worker_id: workerId,
    p_lease_seconds: 300,
  });

  if (error) throw new Error(`Unable to claim mail jobs: ${error.message}`);

  const result: MailWorkerResult = {
    claimed: jobs?.length || 0,
    sent: 0,
    retried: 0,
    deadLettered: 0,
  };

  for (const job of jobs || []) {
    const payload = job.payload as SendEmailPayload;
    const sendResult = await sendEmail({
      ...payload,
      idempotencyKey: job.idempotency_key,
      allowSimulation: false,
    });

    if (sendResult.success && !sendResult.simulated && sendResult.messageId) {
      const { error: updateError } = await supabase
        .from("mail_outbox")
        .update({
          status: "sent",
          resend_email_id: sendResult.messageId,
          sent_at: new Date().toISOString(),
          locked_at: null,
          locked_by: null,
          last_error: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", job.id);

      if (updateError) throw new Error(`Could not mark mail job sent: ${updateError.message}`);

      const campaignRecipientId = (job.metadata as Record<string, unknown> | null)?.campaignRecipientId;
      if (typeof campaignRecipientId === "string") {
        const { error: recipientError } = await supabase
          .from("mail_campaign_recipients")
          .update({
            status: "sent",
            resend_id: sendResult.messageId,
            sent_at: new Date().toISOString(),
          })
          .eq("id", campaignRecipientId);
        if (recipientError) throw new Error(`Could not update campaign recipient: ${recipientError.message}`);
      }

      const campaignId = (job.metadata as Record<string, unknown> | null)?.campaignId;
      if (typeof campaignId === "string") await finalizeCampaignIfComplete(supabase, campaignId);

      result.sent++;
      continue;
    }

    const errorMessage = sendResult.simulated
      ? "Simulation is not a live delivery; configure Resend credentials before processing this job."
      : (sendResult.error || "Resend did not confirm delivery submission.");
    const exhausted = sendResult.simulated || job.attempt_count >= job.max_attempts;
    const retryDelaySeconds = Math.min(3600, 30 * (2 ** Math.max(0, job.attempt_count - 1)));

    const { error: updateError } = await supabase
      .from("mail_outbox")
      .update({
        status: exhausted ? "dead_letter" : "queued",
        available_at: new Date(Date.now() + retryDelaySeconds * 1000).toISOString(),
        locked_at: null,
        locked_by: null,
        last_error: errorMessage.slice(0, 4000),
        updated_at: new Date().toISOString(),
      })
      .eq("id", job.id);

    if (updateError) throw new Error(`Could not update failed mail job: ${updateError.message}`);

    const campaignRecipientId = (job.metadata as Record<string, unknown> | null)?.campaignRecipientId;
    if (exhausted && typeof campaignRecipientId === "string") {
      await supabase
        .from("mail_campaign_recipients")
        .update({ status: "failed", error_message: errorMessage.slice(0, 4000) })
        .eq("id", campaignRecipientId);
    }

    const campaignId = (job.metadata as Record<string, unknown> | null)?.campaignId;
    if (typeof campaignId === "string" && exhausted) await finalizeCampaignIfComplete(supabase, campaignId);

    if (exhausted) result.deadLettered++;
    else result.retried++;
  }

  return result;
}
