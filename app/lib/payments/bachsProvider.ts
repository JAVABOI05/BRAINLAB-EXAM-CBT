import crypto from "crypto";
import type {
  PaymentProvider,
  PaymentInitParams,
  PaymentInitResult,
  PaymentVerifyResult,
} from "./types";

export class BachsPaymentProvider implements PaymentProvider {
  name = "bachs";
  private apiKey: string;
  private webhookSecret: string;
  isLive: boolean;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.BACHS_API_KEY || "";
    this.webhookSecret = process.env.BACHS_WEBHOOK_SECRET || "";

    const env =
      process.env.BACHS_ENVIRONMENT ||
      (this.apiKey.startsWith("sk_live_") ? "production" : "sandbox");

    this.isLive = env === "production";
    this.baseUrl = this.isLive
      ? "https://api.bachs.io/v1"
      : "https://sandbox-api.bachs.io/v1";
  }

  async initializePayment(params: PaymentInitParams): Promise<PaymentInitResult> {
    const isTestMode = !this.isLive;
    const currency = (params.currency || "NGN").toUpperCase();
    const decimalAmount = (params.amountKobo / 100).toFixed(2);

    // Never simulate a checkout in production: a fake URL must not look like a payable order.
    if (!this.apiKey && process.env.NODE_ENV === "production") {
      return {
        ok: false,
        reference: params.reference,
        error: "BACHS_API_KEY is required for production payments.",
        isTestMode: false,
      };
    }

    // Local development only: explicit simulation when no secret key is configured.
    if (!this.apiKey) {
      const mockCallback = params.callbackUrl || "/account/subscription/callback";
      const simulationUrl = `${mockCallback}?reference=${encodeURIComponent(
        params.reference
      )}&simulated=true&provider=bachs`;

      return {
        ok: true,
        reference: params.reference,
        authorizationUrl: simulationUrl,
        sessionId: `sim_bachs_${Date.now()}`,
        isTestMode: true,
      };
    }

    try {
      const callbackBase = params.callbackUrl || "/account/subscription/callback";
      const successUrl = `${callbackBase}?reference=${encodeURIComponent(
        params.reference
      )}&provider=bachs`;
      const cancelUrl = `${callbackBase.replace(
        "/account/subscription/callback",
        "/pricing"
      )}?cancelled=true&reference=${encodeURIComponent(params.reference)}`;

      const body = {
        pricing: {
          currency,
          amount: decimalAmount,
        },
        customer: {
          email: params.email,
        },
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          reference: params.reference,
          userId: params.userId,
          planId: params.planId,
          amountKobo: String(params.amountKobo),
          currency,
          couponCode: params.couponCode || "",
          ...params.metadata,
        },
      };

      const res = await fetch(`${this.baseUrl}/checkout-sessions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        return {
          ok: false,
          reference: params.reference,
          error:
            data.message ||
            data.error ||
            `Failed to create Bachs checkout session (HTTP ${res.status})`,
          isTestMode,
        };
      }

      const checkoutUrl = data.checkout_url || data.url;
      const sessionId = data.id || data.checkout_id;

      if (!checkoutUrl) {
        return {
          ok: false,
          reference: params.reference,
          error: "Bachs did not return a valid checkout URL.",
          isTestMode,
        };
      }

      return {
        ok: true,
        reference: params.reference,
        authorizationUrl: checkoutUrl,
        sessionId,
        isTestMode,
      };
    } catch (err) {
      return {
        ok: false,
        reference: params.reference,
        error:
          err instanceof Error
            ? err.message
            : "Network error during Bachs checkout session initialization",
        isTestMode,
      };
    }
  }

  async verifyPayment(
    reference: string,
    providerReference?: string
  ): Promise<PaymentVerifyResult> {
    // Simulation is strictly non-production. Missing credentials in production
    // must fail closed instead of manufacturing a successful verification.
    if (!this.apiKey) {
      if (process.env.NODE_ENV === "production") {
        return {
          ok: false,
          reference,
          status: "failed",
          amountKobo: 0,
          error: "BACHS_API_KEY is required for production payment verification.",
        };
      }

      return {
        ok: true,
        reference,
        status: "success",
        amountKobo: 0,
        currency: "NGN",
        paidAt: new Date().toISOString(),
        channel: "bachs_sandbox_simulation",
      };
    }

    // References that explicitly identify a simulated payment can never be
    // accepted as real payments when production credentials are present.
    if (reference.startsWith("test_sim_") || reference.includes("simulated")) {
      return {
        ok: false,
        reference,
        status: "failed",
        amountKobo: 0,
        error: "Simulated payment references are not valid for provider verification.",
      };
    }

    // If we have the Bachs checkout session ID (providerReference), fetch from Bachs
    if (providerReference) {
      try {
        const res = await fetch(
          `${this.baseUrl}/checkout-sessions/${encodeURIComponent(providerReference)}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${this.apiKey}`,
            },
          }
        );

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          return {
            ok: false,
            reference,
            status: "failed",
            amountKobo: 0,
            error:
              data.message ||
              `Bachs checkout session retrieval failed (HTTP ${res.status})`,
          };
        }

        const session = data.data || data;
        const rawStatus = String(session.status || "").toLowerCase();
        const paymentStatus = String(session.payment_status || "").toLowerCase();

        const isSuccess =
          rawStatus === "completed" ||
          rawStatus === "succeeded" ||
          paymentStatus === "paid" ||
          paymentStatus === "succeeded";

        const isPending =
          rawStatus === "open" ||
          rawStatus === "pending" ||
          paymentStatus === "pending";

        const amountDecimal = parseFloat(
          session.pricing?.amount || session.amount || "0"
        );
        const amountKobo = Math.round(amountDecimal * 100);

        return {
          ok: true,
          reference: session.metadata?.reference || reference,
          status: isSuccess ? "success" : isPending ? "pending" : "failed",
          amountKobo,
          currency: session.pricing?.currency || session.currency || "NGN",
          paidAt: session.completed_at || session.created_at || new Date().toISOString(),
          channel: "bachs_checkout",
          customerEmail: session.customer?.email,
          metadata: session.metadata,
        };
      } catch (err) {
        return {
          ok: false,
          reference,
          status: "failed",
          amountKobo: 0,
          error:
            err instanceof Error
              ? err.message
              : "Verification request failed connecting to Bachs",
        };
      }
    }

    // Without a provider reference, return pending state awaiting webhook or provider ref
    return {
      ok: true,
      reference,
      status: "pending",
      amountKobo: 0,
      currency: "NGN",
    };
  }

  verifyWebhookSignature(
    rawBody: string,
    signature: string,
    headers?: Record<string, string | null | undefined>
  ): boolean {
    if (!this.webhookSecret) return false;

    try {
      // 1. Resolve timestamp
      let timestamp = headers?.["x-bachs-timestamp"];
      let signatureHash = signature.trim();

      // Check if signature contains v2 format: t={timestamp},v1={hash}
      if (signature.includes("t=") && signature.includes("v1=")) {
        const parts = signature.split(",");
        for (const part of parts) {
          const trimmed = part.trim();
          if (trimmed.startsWith("t=")) {
            timestamp = trimmed.slice(2);
          } else if (trimmed.startsWith("v1=")) {
            signatureHash = trimmed.slice(3);
          }
        }
      } else if (headers?.["x-bachs-signature-v2"]) {
        const v2Header = headers["x-bachs-signature-v2"];
        const parts = v2Header.split(",");
        for (const part of parts) {
          const trimmed = part.trim();
          if (trimmed.startsWith("t=")) {
            timestamp = trimmed.slice(2);
          } else if (trimmed.startsWith("v1=")) {
            signatureHash = trimmed.slice(3);
          }
        }
      }

      if (!timestamp || !signatureHash) {
        return false;
      }

      // 2. Tolerance check: 300 seconds window to prevent replay attacks
      const eventTimeSec = parseInt(timestamp, 10);
      if (isNaN(eventTimeSec)) {
        return false;
      }

      const nowSec = Math.floor(Date.now() / 1000);
      const toleranceSec = 300; // 5 minutes
      if (Math.abs(nowSec - eventTimeSec) > toleranceSec) {
        return false;
      }

      // 3. Reconstruct signed message: timestamp + "." + rawBody
      const signedPayload = `${timestamp}.${rawBody}`;

      // 4. Compute expected HMAC-SHA256 hex digest
      const expectedHash = crypto
        .createHmac("sha256", this.webhookSecret)
        .update(signedPayload, "utf8")
        .digest("hex");

      // 5. Constant-time safe comparison
      const expectedBuffer = Buffer.from(expectedHash, "utf8");
      const signatureBuffer = Buffer.from(signatureHash, "utf8");

      if (expectedBuffer.length !== signatureBuffer.length) {
        return false;
      }

      return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
    } catch {
      return false;
    }
  }
}

export const bachsPaymentProvider = new BachsPaymentProvider();
