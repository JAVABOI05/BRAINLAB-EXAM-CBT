import type {
  PaymentProvider,
  PaymentInitParams,
  PaymentInitResult,
  PaymentVerifyResult,
} from "./types";

export class BankTransferPaymentProvider implements PaymentProvider {
  name = "bank_transfer";
  isLive = true;

  async initializePayment(params: PaymentInitParams): Promise<PaymentInitResult> {
    const callback = params.callbackUrl || "/account/subscription/callback";
    const authUrl = `${callback}?reference=${encodeURIComponent(
      params.reference
    )}&provider=bank_transfer&bank_pending=true&amount=${params.amountKobo / 100}`;

    return {
      ok: true,
      reference: params.reference,
      authorizationUrl: authUrl,
      isTestMode: false,
    };
  }

  async verifyPayment(reference: string): Promise<PaymentVerifyResult> {
    return {
      ok: true,
      reference,
      status: "pending",
      amountKobo: 0,
      channel: "bank_transfer",
    };
  }

  verifyWebhookSignature(): boolean {
    return true;
  }
}

export const bankTransferPaymentProvider = new BankTransferPaymentProvider();
