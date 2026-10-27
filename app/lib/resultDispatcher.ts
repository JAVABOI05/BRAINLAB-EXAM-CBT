import { getSupabaseServerClient } from "./supabaseServer";
import { getExamSettings } from "./platformConfig";

export interface DispatchRecipient {
  resultId: string;
  name: string;
  phone: string;
  email?: string | null;
  score: number;
  total: number;
  subject: string;
  subjectScores?: Record<string, number>;
}

export interface DispatchResult {
  recipientId: string;
  channel: "sms" | "email" | "in_app" | "whatsapp";
  status: "sent" | "skipped" | "failed";
  messageId?: string;
  error?: string;
}

export interface BatchDispatchSummary {
  total: number;
  sent: number;
  skipped: number;
  failed: number;
  notificationsEnabled: boolean;
  results: DispatchResult[];
}

/**
 * Dispatches an SMS notification via Termii API (standard Nigerian telecom provider)
 * Falls back to simulation logging when TERMII_API_KEY is not configured in environment.
 */
export async function sendResultSMS(
  phone: string,
  candidateName: string,
  score: number,
  total: number,
  resultId: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const apiKey = process.env.TERMII_API_KEY;
  const senderId = process.env.TERMII_SENDER_ID || "BrainLab";
  const portalUrl = `https://www.brainlabacademy.com.ng/verify/${resultId}`;

  // Clean phone number to international format 234...
  let normalizedPhone = phone.trim().replace(/\D/g, "");
  if (normalizedPhone.startsWith("0")) {
    normalizedPhone = "234" + normalizedPhone.substring(1);
  }

  const message = `Hello ${candidateName}, your official BrainLab UTME Mock result is released. Score: ${score}/${total}. Verify slip: ${portalUrl}`;

  if (!apiKey) {
    console.log(`[ResultDispatcher] SMS simulation (TERMII_API_KEY not set) to ${normalizedPhone}: "${message}"`);
    return { success: true, messageId: `mock-sms-${Date.now()}` };
  }

  try {
    const res = await fetch("https://api.ng.termii.com/api/sms/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: normalizedPhone,
        from: senderId,
        sms: message,
        type: "plain",
        channel: "generic",
        api_key: apiKey,
      }),
    });

    const data = await res.json();
    if (res.ok && (data.code === "ok" || data.message === "Successfully Sent")) {
      return { success: true, messageId: data.message_id || data.messageId };
    }
    return { success: false, error: data.message || "Termii SMS dispatch failed" };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Network error calling Termii" };
  }
}

/**
 * Dispatches an Email notification via Resend API
 * Falls back to simulation logging when RESEND_API_KEY is not configured in environment.
 */
export async function sendResultEmail(
  email: string,
  candidateName: string,
  score: number,
  total: number,
  subject: string,
  subjectScores: Record<string, number> | undefined,
  resultId: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.SYSTEM_FROM_EMAIL || "BrainLab Academy <results@brainlabacademy.com.ng>";
  const verifyUrl = `https://www.brainlabacademy.com.ng/verify/${resultId}`;

  const subjectTableRows = Object.entries(subjectScores || {})
    .map(
      ([subj, val]) =>
        `<tr><td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">${subj}</td><td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; text-align: right; color: #0369a1; font-weight: bold;">${val}/100</td></tr>`
    )
    .join("");

  const htmlContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
      <div style="text-align: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 16px; margin-bottom: 24px;">
        <h1 style="color: #012153; margin: 0; font-size: 24px; font-weight: 900; letter-spacing: -0.5px;">BrainLab Academy CBT</h1>
        <p style="color: #64748b; font-size: 13px; margin-top: 4px; text-transform: uppercase; font-weight: 700; letter-spacing: 1px;">Official Examination Directorate Release</p>
      </div>
      
      <p style="font-size: 15px; color: #1e293b; line-height: 1.6;">Dear <strong>${candidateName}</strong>,</p>
      <p style="font-size: 14px; color: #475569; line-height: 1.6;">Your official CBT mock examination attempt has been verified and released by the Examination Directorate.</p>
      
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 24px 0; text-align: center;">
        <p style="font-size: 12px; font-weight: 800; text-transform: uppercase; color: #0284c7; letter-spacing: 1px; margin: 0;">Aggregate UTME Score</p>
        <p style="font-size: 44px; font-weight: 900; color: #012153; margin: 8px 0;">${score} <span style="font-size: 18px; color: #94a3b8; font-weight: 700;">/ ${total}</span></p>
        <p style="font-size: 13px; color: #059669; font-weight: 700; margin: 0;">Verified Grade &amp; Directorate Authentication</p>
      </div>

      ${
        subjectTableRows
          ? `
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px;">
        <thead>
          <tr style="background-color: #f1f5f9;">
            <th style="padding: 8px 12px; text-align: left; color: #475569;">Subject</th>
            <th style="padding: 8px 12px; text-align: right; color: #475569;">Score</th>
          </tr>
        </thead>
        <tbody>
          ${subjectTableRows}
        </tbody>
      </table>
      `
          : ""
      }

      <div style="text-align: center; margin-top: 32px;">
        <a href="${verifyUrl}" style="background-color: #012153; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-weight: 700; font-size: 14px; display: inline-block;">View Official Verified Slip &rarr;</a>
      </div>
      
      <p style="font-size: 11px; color: #94a3b8; text-align: center; margin-top: 36px; border-top: 1px solid #f1f5f9; padding-top: 16px;">
        BrainLab Academy Digital CBT Directorate &bull; Strict Proctoring Standards &bull; Ref: ${resultId.substring(0, 16)}
      </p>
    </div>
  `;

  if (!apiKey) {
    console.log(`[ResultDispatcher] Email simulation (RESEND_API_KEY not set) to ${email} for candidate ${candidateName}`);
    return { success: true, messageId: `mock-email-${Date.now()}` };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [email],
        subject: `Your Verified BrainLab CBT Result (${score}/${total})`,
        html: htmlContent,
      }),
    });

    const data = await res.json();
    if (res.ok && data.id) {
      return { success: true, messageId: data.id };
    }
    return { success: false, error: data.message || "Resend Email dispatch failed" };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Network error calling Resend" };
  }
}

/**
 * Dispatches a batch of released results across enabled notification channels.
 * Honors the administrative `result_notifications` toggle in `exam_settings`.
 */
export async function dispatchReleasedResults(
  recipients: DispatchRecipient[],
  channels: ("sms" | "email" | "in_app")[] = ["sms", "email", "in_app"]
): Promise<BatchDispatchSummary> {
  const settings = await getExamSettings();
  const notificationsEnabled = settings.result_notifications !== false;

  const summary: BatchDispatchSummary = {
    total: recipients.length,
    sent: 0,
    skipped: 0,
    failed: 0,
    notificationsEnabled,
    results: [],
  };

  if (!notificationsEnabled) {
    summary.skipped = recipients.length;
    summary.results = recipients.map((r) => ({
      recipientId: r.resultId,
      channel: "sms",
      status: "skipped",
      error: "Result notifications disabled by administrator",
    }));
    return summary;
  }

  const supabase = getSupabaseServerClient();

  for (const recipient of recipients) {
    let sentAtLeastOne = false;

    // 1. In-App Notification (Always reliable & free)
    if (channels.includes("in_app")) {
      try {
        await supabase.from("notifications").insert({
          user_id: null, // Broadcast or linked when candidate registers
          title: "Exam Result Released",
          message: `Hello ${recipient.name}, your CBT Mock result has been released. Total score: ${recipient.score}/${recipient.total}.`,
          type: "exam_result",
          action_url: `/verify/${recipient.resultId}`,
          metadata: {
            result_id: recipient.resultId,
            score: recipient.score,
            total: recipient.total,
            subject: recipient.subject,
          },
        });
        summary.results.push({
          recipientId: recipient.resultId,
          channel: "in_app",
          status: "sent",
        });
        sentAtLeastOne = true;
      } catch (err) {
        summary.results.push({
          recipientId: recipient.resultId,
          channel: "in_app",
          status: "failed",
          error: err instanceof Error ? err.message : "In-app insert error",
        });
      }
    }

    // 2. SMS Notification
    if (channels.includes("sms") && recipient.phone) {
      const smsRes = await sendResultSMS(
        recipient.phone,
        recipient.name,
        recipient.score,
        recipient.total,
        recipient.resultId
      );
      if (smsRes.success) {
        summary.results.push({
          recipientId: recipient.resultId,
          channel: "sms",
          status: "sent",
          messageId: smsRes.messageId,
        });
        sentAtLeastOne = true;
      } else {
        summary.results.push({
          recipientId: recipient.resultId,
          channel: "sms",
          status: "failed",
          error: smsRes.error,
        });
      }
    }

    // 3. Email Notification (if email provided)
    if (channels.includes("email") && recipient.email) {
      const emailRes = await sendResultEmail(
        recipient.email,
        recipient.name,
        recipient.score,
        recipient.total,
        recipient.subject,
        recipient.subjectScores,
        recipient.resultId
      );
      if (emailRes.success) {
        summary.results.push({
          recipientId: recipient.resultId,
          channel: "email",
          status: "sent",
          messageId: emailRes.messageId,
        });
        sentAtLeastOne = true;
      } else {
        summary.results.push({
          recipientId: recipient.resultId,
          channel: "email",
          status: "failed",
          error: emailRes.error,
        });
      }
    }

    if (sentAtLeastOne) {
      summary.sent += 1;
    } else {
      summary.failed += 1;
    }
  }

  return summary;
}
