// Centralized WhatsApp Helpdesk & Alerts Configuration for BrainLab Academy
import { getFooterConfig } from "./platformConfig";
import {
  CANONICAL_PHONE_DIGITS,
  CANONICAL_PHONE_DISPLAY,
  CANONICAL_WHATSAPP_CHANNEL,
} from "./contactConfig";

export const DEFAULT_WHATSAPP_NUMBER = CANONICAL_PHONE_DIGITS;
export const DEFAULT_SUPPORT_PHONE = CANONICAL_PHONE_DISPLAY;
export const DEFAULT_WHATSAPP_CHANNEL = CANONICAL_WHATSAPP_CHANNEL;

/**
 * Normalizes a phone number into international format without symbols (e.g. "2349074310204").
 */
export function normalizeWhatsAppNumber(phone?: string | null): string {
  if (!phone) return DEFAULT_WHATSAPP_NUMBER;
  let clean = phone.replace(/[^0-9]/g, "");
  if (!clean) return DEFAULT_WHATSAPP_NUMBER;

  // If local Nigerian number with leading 0 (e.g. 09074310204), convert to 2349074310204
  if (clean.startsWith("0") && clean.length === 11) {
    clean = "234" + clean.slice(1);
  } else if (!clean.startsWith("234") && clean.length === 10) {
    clean = "234" + clean;
  }

  return clean;
}

/**
 * Normalizes a phone number for dial links (e.g. "+2349074310204").
 */
export function normalizeDialPhone(phone?: string | null): string {
  if (!phone) return "+2349074310204";
  const clean = phone.replace(/[^\d+]/g, "");
  return clean.startsWith("+") ? clean : `+${clean}`;
}

/**
 * Generates an official WhatsApp click-to-chat URL with optional prefilled message.
 */
export function getWhatsAppChatUrl(
  message: string = "Hello BrainLab Academy, I need assistance with CBT practice.",
  phone: string = DEFAULT_WHATSAPP_NUMBER
): string {
  const normalized = normalizeWhatsAppNumber(phone);
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

/**
 * Returns official WhatsApp channel URL.
 */
export function getWhatsAppChannelUrl(): string {
  return DEFAULT_WHATSAPP_CHANNEL;
}

/**
 * Dynamically fetches the configured WhatsApp number from the platform settings.
 */
export async function getConfiguredWhatsAppNumber(): Promise<string> {
  try {
    const config = await getFooterConfig();
    if (config?.whatsapp_number) {
      return normalizeWhatsAppNumber(config.whatsapp_number);
    }
  } catch {
    // Fall back to default
  }
  return DEFAULT_WHATSAPP_NUMBER;
}

/**
 * Dynamically fetches the configured support phone from platform settings.
 */
export async function getConfiguredSupportPhone(): Promise<{ display: string; dial: string }> {
  try {
    const config = await getFooterConfig();
    const display = config?.support_phone || DEFAULT_SUPPORT_PHONE;
    const dial = normalizeDialPhone(display);
    return { display, dial };
  } catch {
    return { display: DEFAULT_SUPPORT_PHONE, dial: "+2349074310204" };
  }
}

/**
 * Dynamically generates a WhatsApp click-to-chat URL using database configuration.
 */
export async function getConfiguredWhatsAppChatUrl(
  message: string = "Hello BrainLab Academy, I need assistance."
): Promise<string> {
  const num = await getConfiguredWhatsAppNumber();
  return getWhatsAppChatUrl(message, num);
}
