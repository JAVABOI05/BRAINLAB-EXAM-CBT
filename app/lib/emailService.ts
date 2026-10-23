/**
 * BrainLab Academy — Transactional Email Service (Resend Integration)
 *
 * This module provides a resilient, server-side transactional email dispatcher
 * powered by Resend (https://resend.com). It handles access code delivery,
 * exam receipts, account verification, and learner notifications.
 *
 * SENDER CONFIGURATION:
 * - Production: Set RESEND_API_KEY and RESEND_FROM_EMAIL in your environment.
 *   Default production sender: "BrainLab Academy <support@brainlab.edu.ng>"
 * - Development/Test fallback: "BrainLab Academy <onboarding@resend.dev>"
 *
 * SIMULATION MODE:
 * - If RESEND_API_KEY is not defined, this service automatically logs the payload
 *   to the server console and resolves successfully without throwing errors.
 *   This ensures seamless local development and staging testing.
 *
 * DOMAIN VERIFICATION (DNS Records for brainlab.edu.ng):
 * 1. SPF: TXT @ "v=spf1 include:resend.com ~all"
 * 2. DKIM: CNAME resend._domainkey -> dkim.resend.com
 * 3. DMARC: TXT _dmarc -> "v=DMARC1; p=none; rua=mailto:admin@brainlab.edu.ng"
 */

export interface SendEmailPayload {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  tags?: { name: string; value: string }[];
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  simulated?: boolean;
}

export interface WelcomeEmailParams {
  to: string;
  studentName: string;
  loginUrl?: string;
}

export interface AccessCodeEmailParams {
  to: string;
  studentName: string;
  accessCode: string;
  examTitle: string;
  expiryDate?: string;
  portalUrl?: string;
}

export interface ExamResultEmailParams {
  to: string;
  studentName: string;
  examTitle: string;
  scorePercent: number;
  totalQuestions: number;
  passed: boolean;
  certificateUrl?: string;
}

export interface PasswordResetEmailParams {
  to: string;
  studentName?: string;
  resetUrl: string;
}

const RESEND_API_ENDPOINT = "https://api.resend.com/emails";
const DEFAULT_SENDER =
  process.env.RESEND_FROM_EMAIL ||
  (process.env.NODE_ENV === "production"
    ? "BrainLab Academy <support@brainlab.edu.ng>"
    : "BrainLab Academy <onboarding@resend.dev>");
const DEFAULT_REPLY_TO = "support@brainlab.edu.ng";

/**
 * Low-level email dispatcher using the Resend REST API via native fetch.
 * Zero external npm package dependencies, 100% Next.js 16 & React 19 compatible.
 */
export async function sendEmail(payload: SendEmailPayload): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;

  // Graceful simulation fallback when no API key is configured
  if (!apiKey || apiKey.trim() === "") {
    console.warn(
      `[EmailService: Simulated Mode] RESEND_API_KEY is not set.\n` +
      `  Recipient : ${Array.isArray(payload.to) ? payload.to.join(", ") : payload.to}\n` +
      `  Subject   : ${payload.subject}\n` +
      `  Status    : Message simulated successfully.`
    );
    return {
      success: true,
      messageId: `sim_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      simulated: true,
    };
  }

  try {
    const recipients = Array.isArray(payload.to) ? payload.to : [payload.to];
    const response = await fetch(RESEND_API_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: DEFAULT_SENDER,
        to: recipients,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
        reply_to: payload.replyTo || DEFAULT_REPLY_TO,
        tags: payload.tags,
      }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMessage = data?.message || `HTTP ${response.status}: Failed to send email via Resend`;
      console.error("[EmailService] Resend API error:", errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    }

    return {
      success: true,
      messageId: data?.id || `resend_${Date.now()}`,
      simulated: false,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown network error";
    console.error("[EmailService] Exception dispatching email:", errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Base email layout wrapper with professional 2026 EdTech responsive HTML styling.
 */
function wrapEmailTemplate(title: string, bodyContent: string): string {
  const year = new Date().getFullYear();
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f1f5f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:600px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);border:1px solid #e2e8f0;" cellspacing="0" cellpadding="0">
          
          <!-- Header Bar -->
          <tr>
            <td style="background-color:#00112b;padding:28px 36px;text-align:left;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <span style="color:#ffffff;font-size:22px;font-weight:800;letter-spacing:-0.5px;">BrainLab<span style="color:#38bdf8;">.</span></span>
                    <div style="color:#94a3b8;font-size:12px;margin-top:4px;letter-spacing:0.5px;text-transform:uppercase;font-weight:600;">Excellence in Examination Preparation</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content Body -->
          <tr>
            <td style="padding:36px;background-color:#ffffff;">
              ${bodyContent}
            </td>
          </tr>

          <!-- Official Footer -->
          <tr>
            <td style="background-color:#f8fafc;padding:24px 36px;border-top:1px solid #e2e8f0;text-align:center;">
              <p style="margin:0 0 8px 0;font-size:12px;color:#64748b;line-height:1.6;">
                Official correspondence from <strong>BrainLab Academy</strong>.<br>
                For learner support, reach us at <a href="mailto:support@brainlab.edu.ng" style="color:#0284c7;text-decoration:none;font-weight:600;">support@brainlab.edu.ng</a> or via WhatsApp.
              </p>
              <p style="margin:0;font-size:11px;color:#94a3b8;">
                &copy; ${year} BrainLab Academy. All rights reserved. Lagos, Nigeria.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * 1. Send Welcome Email to newly registered students.
 */
export async function sendWelcomeEmail(params: WelcomeEmailParams): Promise<SendEmailResult> {
  const { to, studentName, loginUrl = "https://brainlabacademy.com.ng/account" } = params;

  const html = wrapEmailTemplate(
    "Welcome to BrainLab Academy",
    `
    <h1 style="margin:0 0 16px 0;font-size:24px;font-weight:800;color:#0f172a;">Welcome to BrainLab, ${studentName}!</h1>
    <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#334155;">
      We're excited to have you join Nigeria's purpose-built examination preparation platform. Whether you are aiming for top percentiles in <strong>JAMB UTME</strong>, <strong>WAEC SSCE</strong>, or <strong>NECO</strong>, you now have access to computer-based testing, curriculum breakdowns, and AI-powered tutor explanations.
    </p>

    <div style="background-color:#f8fafc;border-left:4px solid #0284c7;padding:16px 20px;border-radius:0 8px 8px 0;margin:24px 0;">
      <h3 style="margin:0 0 8px 0;font-size:14px;font-weight:700;color:#0f172a;">Quick Start Checklist:</h3>
      <ul style="margin:0;padding-left:18px;font-size:13px;line-height:1.8;color:#475569;">
        <li>Take a free diagnostic test to pinpoint subject weaknesses.</li>
        <li>Review topic summaries in the <strong>Learning Hub</strong>.</li>
        <li>Join scheduled live revision sessions with our tutors.</li>
      </ul>
    </div>

    <div style="text-align:center;margin:32px 0 24px 0;">
      <a href="${loginUrl}" style="background-color:#0284c7;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:12px 28px;border-radius:8px;display:inline-block;box-shadow:0 2px 4px rgba(2,132,199,0.25);">
        Launch CBT Portal &rarr;
      </a>
    </div>

    <p style="margin:0;font-size:13px;line-height:1.6;color:#64748b;">
      If you have questions at any step, simply reply to this email or contact our learner helpdesk at <a href="mailto:support@brainlab.edu.ng" style="color:#0284c7;">support@brainlab.edu.ng</a>.
    </p>
    `
  );

  return sendEmail({
    to,
    subject: "Welcome to BrainLab Academy — Prepare Smarter, Progress Further",
    html,
  });
}

/**
 * 2. Send Examination Access Code delivery email.
 */
export async function sendAccessCodeEmail(params: AccessCodeEmailParams): Promise<SendEmailResult> {
  const {
    to,
    studentName,
    accessCode,
    examTitle,
    expiryDate,
    portalUrl = "https://brainlabacademy.com.ng/access",
  } = params;

  const html = wrapEmailTemplate(
    `Your Examination Access Code for ${examTitle}`,
    `
    <h1 style="margin:0 0 16px 0;font-size:22px;font-weight:800;color:#0f172a;">Your CBT Exam Access Code</h1>
    <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#334155;">
      Hello ${studentName}, here is your official examination access credentials for <strong>${examTitle}</strong>.
    </p>

    <!-- Highlighted Access Code Box -->
    <div style="background-color:#f0f9ff;border:2px dashed #38bdf8;border-radius:12px;padding:24px;text-align:center;margin:28px 0;">
      <div style="font-size:12px;text-transform:uppercase;letter-spacing:1px;font-weight:700;color:#0369a1;margin-bottom:8px;">Access PIN / Passcode</div>
      <div style="font-size:32px;font-weight:900;letter-spacing:4px;color:#0c4a6e;font-family:Courier,monospace;">${accessCode}</div>
      ${expiryDate ? `<div style="font-size:12px;color:#64748b;margin-top:8px;">Valid until: <strong>${expiryDate}</strong></div>` : ""}
    </div>

    <h3 style="margin:20px 0 8px 0;font-size:14px;font-weight:700;color:#0f172a;">How to use this code:</h3>
    <ol style="margin:0 0 24px 0;padding-left:20px;font-size:13px;line-height:1.8;color:#475569;">
      <li>Navigate to the Exam Access portal: <a href="${portalUrl}" style="color:#0284c7;">brainlabacademy.com.ng/access</a></li>
      <li>Enter your student email and paste the PIN above.</li>
      <li>Ensure you have a stable internet connection before beginning.</li>
    </ol>

    <div style="text-align:center;margin:28px 0;">
      <a href="${portalUrl}" style="background-color:#0284c7;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:12px 28px;border-radius:8px;display:inline-block;">
        Enter Exam Portal &rarr;
      </a>
    </div>

    <div style="background-color:#fffbeb;border:1px solid #fef3c7;border-radius:8px;padding:12px 16px;font-size:12px;color:#92400e;line-height:1.5;">
      <strong>Security Notice:</strong> This code is tied to your student account and is strictly single-candidate. Do not share or publish this PIN.
    </div>
    `
  );

  return sendEmail({
    to,
    subject: `Your BrainLab CBT Access Code: ${accessCode} (${examTitle})`,
    html,
  });
}

/**
 * 3. Send Official Examination Result Receipt email.
 */
export async function sendExamResultReceipt(params: ExamResultEmailParams): Promise<SendEmailResult> {
  const {
    to,
    studentName,
    examTitle,
    scorePercent,
    totalQuestions,
    passed,
    certificateUrl,
  } = params;

  const statusColor = passed ? "#16a34a" : "#dc2626";
  const statusLabel = passed ? "PASS" : "NEEDS REVISION";

  const html = wrapEmailTemplate(
    `Official Examination Receipt: ${examTitle}`,
    `
    <h1 style="margin:0 0 16px 0;font-size:22px;font-weight:800;color:#0f172a;">Examination Completion Receipt</h1>
    <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#334155;">
      Well done, ${studentName}! Your answers for <strong>${examTitle}</strong> have been recorded and graded.
    </p>

    <!-- Score Card -->
    <div style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:24px;text-align:center;margin:24px 0;">
      <div style="font-size:12px;text-transform:uppercase;letter-spacing:1px;font-weight:700;color:#64748b;margin-bottom:6px;">Your Final Score</div>
      <div style="font-size:44px;font-weight:900;color:${statusColor};line-height:1.1;">${Math.round(scorePercent)}%</div>
      <div style="margin-top:10px;">
        <span style="background-color:${passed ? "#dcfce7" : "#fee2e2"};color:${statusColor};font-size:12px;font-weight:800;padding:4px 12px;border-radius:999px;letter-spacing:0.5px;">
          ${statusLabel}
        </span>
      </div>
      <div style="font-size:12px;color:#64748b;margin-top:12px;">Based on ${totalQuestions} examination items.</div>
    </div>

    ${certificateUrl ? `
    <div style="background-color:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px;text-align:center;margin:24px 0;">
      <p style="margin:0 0 12px 0;font-size:13px;font-weight:600;color:#1e40af;">🎓 Digital Certificate Issued!</p>
      <a href="${certificateUrl}" style="background-color:#2563eb;color:#ffffff;text-decoration:none;font-size:13px;font-weight:700;padding:10px 20px;border-radius:6px;display:inline-block;">
        View &amp; Verify Credential &rarr;
      </a>
    </div>
    ` : ""}

    <div style="text-align:center;margin:28px 0;">
      <a href="https://brainlabacademy.com.ng/leaderboard" style="background-color:#0f172a;color:#ffffff;text-decoration:none;font-size:13px;font-weight:700;padding:10px 24px;border-radius:8px;display:inline-block;">
        View National Leaderboard
      </a>
    </div>

    <p style="margin:0;font-size:12px;color:#64748b;line-height:1.5;">
      You can review your detailed subject strengths, question breakdown, and personalized AI tips by logging into your dashboard.
    </p>
    `
  );

  return sendEmail({
    to,
    subject: `Exam Result: ${examTitle} — ${Math.round(scorePercent)}% (${statusLabel})`,
    html,
  });
}

/**
 * 4. Send Password Reset / Security Verification link.
 */
export async function sendPasswordResetEmail(params: PasswordResetEmailParams): Promise<SendEmailResult> {
  const { to, studentName = "Learner", resetUrl } = params;

  const html = wrapEmailTemplate(
    "Reset Your BrainLab Password",
    `
    <h1 style="margin:0 0 16px 0;font-size:22px;font-weight:800;color:#0f172a;">Password Reset Request</h1>
    <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#334155;">
      Hello ${studentName}, we received a request to reset the password for your BrainLab Academy account. Click the button below to choose a new password:
    </p>

    <div style="text-align:center;margin:32px 0;">
      <a href="${resetUrl}" style="background-color:#0284c7;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:12px 28px;border-radius:8px;display:inline-block;">
        Reset Password &rarr;
      </a>
    </div>

    <p style="margin:0 0 12px 0;font-size:13px;line-height:1.6;color:#64748b;">
      This password reset link will expire in <strong>60 minutes</strong>. If you did not make this request, you can safely ignore this email; your account remains secure.
    </p>
    <p style="margin:0;font-size:11px;color:#94a3b8;word-break:break-all;">
      Button not working? Paste this URL in your browser: ${resetUrl}
    </p>
    `
  );

  return sendEmail({
    to,
    subject: "Reset your BrainLab Academy password",
    html,
  });
}
