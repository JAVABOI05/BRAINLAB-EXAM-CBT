// Centralized WhatsApp Helpdesk & Alerts Configuration for BrainLab Academy

export const DEFAULT_WHATSAPP_NUMBER = "2349074310204";
export const DEFAULT_WHATSAPP_CHANNEL = "https://whatsapp.com/channel/0029Vb75fko3mFXyaqlnk70m";

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
