import type { PaymentProvider } from "./types";
import { PaystackPaymentProvider, paystackPaymentProvider } from "./paystackProvider";
import { FlutterwavePaymentProvider, flutterwavePaymentProvider } from "./flutterwaveProvider";
import { BachsPaymentProvider, bachsPaymentProvider } from "./bachsProvider";
import { BankTransferPaymentProvider, bankTransferPaymentProvider } from "./bankTransferProvider";
import { getPaymentGatewaysConfig, type PaymentGatewaysConfig } from "../platformConfig";

export * from "./types";
export { paystackPaymentProvider, PaystackPaymentProvider } from "./paystackProvider";
export { flutterwavePaymentProvider, FlutterwavePaymentProvider } from "./flutterwaveProvider";
export { bachsPaymentProvider, BachsPaymentProvider } from "./bachsProvider";
export { bankTransferPaymentProvider, BankTransferPaymentProvider } from "./bankTransferProvider";

/**
 * Creates an instance of the requested payment provider using dynamic configuration
 * from the database (or environment variable fallbacks).
 */
export function createPaymentProviderFromConfig(
  providerName: "paystack" | "flutterwave" | "bachs" | "bank_transfer",
  config?: PaymentGatewaysConfig
): PaymentProvider {
  if (providerName === "bank_transfer") {
    return bankTransferPaymentProvider;
  }

  if (providerName === "flutterwave") {
    const flwConf = config?.providers.flutterwave;
    return new FlutterwavePaymentProvider({
      publicKey: flwConf?.public_key,
      secretKey: flwConf?.secret_key,
      webhookSecret: flwConf?.webhook_secret,
      isLive: flwConf ? flwConf.test_mode !== true : process.env.PAYMENT_LIVE_ENABLED !== "false",
    });
  }

  if (providerName === "bachs") {
    const bachsConf = config?.providers.bachs;
    return new BachsPaymentProvider({
      apiKey: bachsConf?.api_key,
      webhookSecret: bachsConf?.webhook_secret,
      isLive: bachsConf ? bachsConf.test_mode !== true : process.env.PAYMENT_LIVE_ENABLED !== "false",
    });
  }

  // Default: Paystack
  const psConf = config?.providers.paystack;
  return new PaystackPaymentProvider({
    publicKey: psConf?.public_key,
    secretKey: psConf?.secret_key,
    webhookSecret: psConf?.webhook_secret,
    isLive: psConf ? psConf.test_mode !== true : process.env.PAYMENT_LIVE_ENABLED !== "false",
  });
}

/**
 * Synchronous resolver for backwards compatibility (uses environment variables or pre-instantiated singletons)
 */
export function getPaymentProvider(
  providerName?: string | null,
  customConfig?: PaymentGatewaysConfig
): PaymentProvider {
  if (customConfig) {
    const chosen = (providerName || customConfig.active_provider || "paystack").toLowerCase();
    if (chosen === "bank_transfer") return bankTransferPaymentProvider;
    if (chosen === "flutterwave") return createPaymentProviderFromConfig("flutterwave", customConfig);
    if (chosen === "bachs") return createPaymentProviderFromConfig("bachs", customConfig);
    return createPaymentProviderFromConfig("paystack", customConfig);
  }

  const normalized = (providerName || "").trim().toLowerCase();

  if (normalized === "bank_transfer") {
    return bankTransferPaymentProvider;
  }

  if (normalized === "flutterwave") {
    return flutterwavePaymentProvider;
  }

  if (normalized === "bachs") {
    return bachsPaymentProvider;
  }

  if (normalized === "paystack") {
    return paystackPaymentProvider;
  }

  // Check env default
  const defaultProvider = process.env.DEFAULT_PAYMENT_PROVIDER?.toLowerCase();
  if (defaultProvider === "bank_transfer") return bankTransferPaymentProvider;
  if (defaultProvider === "flutterwave") return flutterwavePaymentProvider;
  if (defaultProvider === "bachs") return bachsPaymentProvider;
  if (defaultProvider === "paystack") return paystackPaymentProvider;

  // Fallback: If Bachs key is provided and Paystack is not
  if (process.env.BACHS_API_KEY && !process.env.PAYSTACK_SECRET_KEY) {
    return bachsPaymentProvider;
  }

  return paystackPaymentProvider;
}

/**
 * Asynchronously resolves the authoritative payment provider dynamically
 * reading the administrator's configuration from the database.
 */
export async function resolveActivePaymentProvider(
  requestedProvider?: string | null
): Promise<PaymentProvider> {
  try {
    const config = await getPaymentGatewaysConfig();
    const target = (requestedProvider || config.active_provider || "paystack").toLowerCase();
    if (target === "bank_transfer" && config.providers.bank_transfer?.enabled !== false) {
      return bankTransferPaymentProvider;
    }
    if (target === "flutterwave" && config.providers.flutterwave.enabled) {
      return createPaymentProviderFromConfig("flutterwave", config);
    }
    if (target === "bachs" && config.providers.bachs.enabled) {
      return createPaymentProviderFromConfig("bachs", config);
    }
    if (target === "paystack" && config.providers.paystack.enabled) {
      return createPaymentProviderFromConfig("paystack", config);
    }
    return createPaymentProviderFromConfig("paystack", config);
  } catch {
    return getPaymentProvider(requestedProvider);
  }
}

// Global default payment provider export for backwards-compatibility
export const paymentProvider = getPaymentProvider();
