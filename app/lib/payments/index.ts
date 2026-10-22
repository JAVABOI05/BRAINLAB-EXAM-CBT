import type { PaymentProvider } from "./types";
import { paystackPaymentProvider } from "./paystackProvider";
import { bachsPaymentProvider } from "./bachsProvider";

export * from "./types";
export { paystackPaymentProvider } from "./paystackProvider";
export { bachsPaymentProvider } from "./bachsProvider";

export function getPaymentProvider(providerName?: string | null): PaymentProvider {
  const normalized = (providerName || "").trim().toLowerCase();

  if (normalized === "bachs") {
    return bachsPaymentProvider;
  }

  if (normalized === "paystack") {
    return paystackPaymentProvider;
  }

  // Fallback to configured default or active provider
  const defaultProvider = process.env.DEFAULT_PAYMENT_PROVIDER?.toLowerCase();
  if (defaultProvider === "bachs") {
    return bachsPaymentProvider;
  }

  if (defaultProvider === "paystack") {
    return paystackPaymentProvider;
  }

  // If Bachs key is provided and Paystack is not, default to Bachs
  if (process.env.BACHS_API_KEY && !process.env.PAYSTACK_SECRET_KEY) {
    return bachsPaymentProvider;
  }

  // Default standard provider
  return paystackPaymentProvider;
}

// Global default payment provider export for backwards-compatibility
export const paymentProvider = getPaymentProvider();
