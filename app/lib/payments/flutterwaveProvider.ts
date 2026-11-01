import crypto from "crypto";
import type {
  PaymentProvider,
  PaymentInitParams,
  PaymentInitResult,
  PaymentVerifyResult,
} from "./types";

export interface FlutterwaveConfigOptions {
  publicKey?: string;
  secretKey?: string;
  webhookSecret?: string;
  isLive?: boolean;
}

export class FlutterwavePaymentProvider implements PaymentProvider {
  name = "flutterwave";
  private secretKey: string;
  private publicKey: string;
  private webhookSecret: string;
  isLive: boolean;

  constructor(options?: FlutterwaveConfigOptions) {
    this.secretKey = options?.secretKey || process.env.FLUTTERWAVE_SECRET_KEY || "";
    this.publicKey = options?.publicKey || process.env.FLUTTERWAVE_PUBLIC_KEY || "";
    this.webhookSecret = options?.webhookSecret || process.env.FLUTTERWAVE_SECRET_HASH || "";
    this.isLive = options?.isLive !== undefined ? options.isLive : process.env.PAYMENT_LIVE_ENABLED !== "false";
  }

  async initializePayment(params: PaymentInitParams): Promise<PaymentInitResult> {
    const isTestMode = !this.isLive;
    const amountNaira = params.amountKobo / 100;

    if (!this.secretKey) {
      return {
        ok: false,
        reference: params.reference,
        error: "Flutterwave live secret key is not configured. Please contact the administrator or select another payment method.",
        isTestMode: false,
      };
    }

    try {
      const res = await fetch("https://api.flutterwave.com/v3/payments", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tx_ref: params.reference,
          amount: amountNaira,
          currency: (params.currency || "NGN").toUpperCase(),
          redirect_url: params.callbackUrl,
          customer: {
            email: params.email,
          },
          customizations: {
            title: "BrainLab Academy CBT",
            description: `Payment for BrainLab plan`,
            logo: "https://www.brainlabacademy.com.ng/brainlab-logo.png",
          },
          meta: {
            userId: params.userId,
            planId: params.planId,
            couponCode: params.couponCode,
            testMode: isTestMode,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok || data.status !== "success" || !data.data?.link) {
        return {
          ok: false,
          reference: params.reference,
          error: data.message || "Failed to initialize Flutterwave transaction",
          isTestMode,
        };
      }

      return {
        ok: true,
        reference: params.reference,
        authorizationUrl: data.data.link,
        isTestMode,
      };
    } catch (err) {
      return {
        ok: false,
        reference: params.reference,
        error: err instanceof Error ? err.message : "Network error contacting Flutterwave",
        isTestMode,
      };
    }
  }

  async verifyPayment(reference: string, providerReference?: string): Promise<PaymentVerifyResult> {
    if (!this.secretKey) {
      return {
        ok: false,
        reference,
        status: "failed",
        amountKobo: 0,
        error: "Flutterwave secret key is missing; cannot verify payment.",
      };
    }

    try {
      const endpoint = providerReference
        ? `https://api.flutterwave.com/v3/transactions/${providerReference}/verify`
        : `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(reference)}`;

      const res = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
        },
      });

      const data = await res.json();
      if (!res.ok || data.status !== "success" || !data.data) {
        return {
          ok: false,
          reference,
          status: "failed",
          amountKobo: 0,
          error: data.message || "Flutterwave transaction verification failed",
        };
      }

      const tx = data.data;
      const isSuccessful = tx.status === "successful";

      return {
        ok: isSuccessful,
        reference,
        status: isSuccessful ? "success" : "failed",
        amountKobo: Math.round(Number(tx.amount || 0) * 100),
        currency: tx.currency,
        paidAt: tx.created_at || new Date().toISOString(),
        channel: tx.payment_type || "card",
        customerEmail: tx.customer?.email,
        metadata: tx.meta,
      };
    } catch (err) {
      return {
        ok: false,
        reference,
        status: "failed",
        amountKobo: 0,
        error: err instanceof Error ? err.message : "Network error verifying Flutterwave transaction",
      };
    }
  }

  verifyWebhookSignature(
    rawBody: string,
    signature: string,
    headers?: Record<string, string | null | undefined>
  ): boolean {
    const secretHash = this.webhookSecret || process.env.FLUTTERWAVE_SECRET_HASH;
    if (!secretHash) return false;

    const headerHash = headers?.["verif-hash"] || signature;
    return headerHash === secretHash;
  }
}

export const flutterwavePaymentProvider = new FlutterwavePaymentProvider();
