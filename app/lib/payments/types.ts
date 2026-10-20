export interface PaymentInitParams {
  email: string;
  amountKobo: number;
  reference: string;
  planId: string;
  userId: string;
  couponCode?: string;
  callbackUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentInitResult {
  ok: boolean;
  authorizationUrl?: string;
  reference: string;
  accessCode?: string;
  error?: string;
  isTestMode: boolean;
}

export interface PaymentVerifyResult {
  ok: boolean;
  reference: string;
  status: "success" | "failed" | "abandoned" | "pending";
  amountKobo: number;
  paidAt?: string;
  channel?: string;
  customerEmail?: string;
  metadata?: Record<string, unknown>;
  error?: string;
}

export interface PaymentProvider {
  name: string;
  isLive: boolean;
  initializePayment(params: PaymentInitParams): Promise<PaymentInitResult>;
  verifyPayment(reference: string): Promise<PaymentVerifyResult>;
  verifyWebhookSignature(rawBody: string, signature: string): boolean;
}
