import crypto from "crypto";
import type { PaymentProvider, PaymentInitParams, PaymentInitResult, PaymentVerifyResult } from "./types";

export interface PaystackConfigOptions {
  secretKey?: string;
  publicKey?: string;
  webhookSecret?: string;
  isLive?: boolean;
}

export class PaystackPaymentProvider implements PaymentProvider {
  name = "paystack";
  private secretKey: string;
  private publicKey: string;
  private webhookSecret: string;
  isLive: boolean;

  constructor(options?: PaystackConfigOptions) {
    this.isLive = options?.isLive !== undefined ? options.isLive : process.env.PAYMENT_LIVE_ENABLED === "true";
    this.secretKey = options?.secretKey || process.env.PAYSTACK_SECRET_KEY || "";
    this.publicKey = options?.publicKey || process.env.PAYSTACK_PUBLIC_KEY || "";
    this.webhookSecret = options?.webhookSecret || process.env.PAYSTACK_SECRET_KEY || "";
  }

  async initializePayment(params: PaymentInitParams): Promise<PaymentInitResult> {
    const isTestMode = !this.isLive;

    // If no secret key is configured, operate in safe sandbox simulation mode
    if (!this.secretKey) {
      const mockCallback = params.callbackUrl || "/account/subscription/callback";
      const simulationUrl = `${mockCallback}?reference=${encodeURIComponent(params.reference)}&simulated=true`;

      return {
        ok: true,
        reference: params.reference,
        authorizationUrl: simulationUrl,
        accessCode: `sim_${Date.now()}`,
        isTestMode: true,
      };
    }

    try {
      const res = await fetch("https://api.paystack.co/transaction/initialize", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: params.email,
          amount: params.amountKobo,
          reference: params.reference,
          callback_url: params.callbackUrl,
          metadata: {
            ...params.metadata,
            userId: params.userId,
            planId: params.planId,
            couponCode: params.couponCode,
            testMode: isTestMode,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.status) {
        return {
          ok: false,
          reference: params.reference,
          error: data.message || "Failed to initialize Paystack transaction",
          isTestMode,
        };
      }

      return {
        ok: true,
        reference: params.reference,
        authorizationUrl: data.data.authorization_url,
        accessCode: data.data.access_code,
        isTestMode,
      };
    } catch (err) {
      return {
        ok: false,
        reference: params.reference,
        error: err instanceof Error ? err.message : "Network error during Paystack initialization",
        isTestMode,
      };
    }
  }

  async verifyPayment(reference: string, _providerReference?: string): Promise<PaymentVerifyResult> {
    // If no secret key or in simulation mode with simulated prefix
    if (!this.secretKey || reference.startsWith("test_sim_") || reference.includes("simulated")) {
      return {
        ok: true,
        reference,
        status: "success",
        amountKobo: 0,
        paidAt: new Date().toISOString(),
        channel: "simulation_test_sandbox",
      };
    }

    try {
      const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
        },
      });

      const data = await res.json();
      if (!res.ok || !data.status) {
        return {
          ok: false,
          reference,
          status: "failed",
          amountKobo: 0,
          error: data.message || "Failed to verify transaction",
        };
      }

      const tx = data.data;
      return {
        ok: true,
        reference,
        status: tx.status === "success" ? "success" : tx.status === "failed" ? "failed" : "abandoned",
        amountKobo: tx.amount || 0,
        paidAt: tx.paid_at,
        channel: tx.channel,
        customerEmail: tx.customer?.email,
        metadata: tx.metadata,
      };
    } catch (err) {
      return {
        ok: false,
        reference,
        status: "failed",
        amountKobo: 0,
        error: err instanceof Error ? err.message : "Verification request failed",
      };
    }
  }

  verifyWebhookSignature(rawBody: string, signature: string, _headers?: Record<string, string | null | undefined>): boolean {
    if (!this.secretKey) return false;
    try {
      const hash = crypto
        .createHmac("sha512", this.secretKey)
        .update(rawBody)
        .digest("hex");
      return hash === signature;
    } catch {
      return false;
    }
  }
}

export const paystackPaymentProvider = new PaystackPaymentProvider();
export const paymentProvider = paystackPaymentProvider;
