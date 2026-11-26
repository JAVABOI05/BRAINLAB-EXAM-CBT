/**
 * BrainLab Academy - Single Canonical Contact Configuration
 * 
 * Requirement Task 6: One single source of truth for WhatsApp number,
 * WhatsApp channel link, support email, admissions email, and phone numbers.
 * Removes duplicate or conflicting contact values across the entire platform.
 */

export interface ContactConfig {
  phone: {
    display: string;      // e.g. "+234 907 431 0204"
    rawDigits: string;    // e.g. "2349074310204"
    dialUri: string;      // e.g. "tel:+2349074310204"
  };
  whatsapp: {
    number: string;       // e.g. "2349074310204"
    chatUrl: string;      // e.g. "https://wa.me/2349074310204?text=..."
    channelUrl: string;   // official broadcast channel
  };
  email: {
    support: string;
    enquiries: string;
    press: string;
  };
  office: {
    city: string;
    country: string;
    region: string;
  };
  socials: {
    whatsappChannel: string;
    instagram: string;
    tiktok: string;
    youtube: string;
    x: string;
    facebook: string;
    linkedin: string;
  };
}

/**
 * Normalizes phone number into E.164 digits format (e.g. 2349074310204).
 */
export function normalizePhoneDigits(phone: string): string {
  let clean = phone.replace(/[^0-9]/g, "");
  if (clean.startsWith("0") && clean.length === 11) {
    clean = "234" + clean.slice(1);
  } else if (!clean.startsWith("234") && clean.length === 10) {
    clean = "234" + clean;
  }
  return clean;
}

/**
 * Normalizes phone number into tel: URI with international plus.
 */
export function formatDialUri(digitsOrFormatted: string): string {
  const digits = normalizePhoneDigits(digitsOrFormatted);
  return `tel:+${digits}`;
}

/**
 * Generates official WhatsApp click-to-chat URL with optional prefilled message.
 */
export function buildWhatsAppChatUrl(message: string, phoneDigits = CANONICAL_PHONE_DIGITS): string {
  const digits = normalizePhoneDigits(phoneDigits);
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export const CANONICAL_PHONE_DISPLAY = "+234 808 926 7399";
export const CANONICAL_PHONE_DIGITS = "2348089267399";
export const CANONICAL_WHATSAPP_CHANNEL = "https://whatsapp.com/channel/0029Vb75fko3mFXyaqlnk70m";
export const CANONICAL_SUPPORT_EMAIL = "support@brainlabacademy.com";
export const CANONICAL_ENQUIRIES_EMAIL = "enquiries@brainlabacademy.com";

export const CONTACT_CONFIG: ContactConfig = {
  phone: {
    display: CANONICAL_PHONE_DISPLAY,
    rawDigits: CANONICAL_PHONE_DIGITS,
    dialUri: formatDialUri(CANONICAL_PHONE_DIGITS),
  },
  whatsapp: {
    number: CANONICAL_PHONE_DIGITS,
    chatUrl: buildWhatsAppChatUrl("Hello BrainLab Academy, I would like to inquire about CBT Practice and Learning Hub."),
    channelUrl: CANONICAL_WHATSAPP_CHANNEL,
  },
  email: {
    support: CANONICAL_SUPPORT_EMAIL,
    enquiries: CANONICAL_ENQUIRIES_EMAIL,
    press: "press@brainlabacademy.com",
  },
  office: {
    city: "Lagos",
    country: "Nigeria",
    region: "West Africa",
  },
  socials: {
    whatsappChannel: CANONICAL_WHATSAPP_CHANNEL,
    instagram: "https://www.instagram.com/brain_labacademy?dlrf=NGJzcmFnaGcwZHV4",
    tiktok: "https://www.tiktok.com/@brainlabacademy",
    youtube: "https://youtube.com/@thebrainlabhub?si=z4sAVuNmJUdPom_u",
    x: "https://x.com/brainlabacademy",
    facebook: "https://facebook.com/brainlabacademy",
    linkedin: "https://linkedin.com/company/brainlabacademy",
  },
};

/**
 * Strict parity check: verify that display phone and destination tel: / wa.me:
 * strictly target the same underlying E.164 digits.
 */
export function verifyContactParity(config: ContactConfig = CONTACT_CONFIG): boolean {
  const displayDigits = normalizePhoneDigits(config.phone.display);
  const rawDigits = config.phone.rawDigits;
  const dialDigits = normalizePhoneDigits(config.phone.dialUri);
  const waDigits = config.whatsapp.number;

  const matchesRaw = displayDigits === rawDigits;
  const matchesDial = displayDigits === dialDigits;
  const matchesWa = displayDigits === waDigits;

  return matchesRaw && matchesDial && matchesWa;
}
