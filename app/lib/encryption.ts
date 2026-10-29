import crypto from "crypto";

/**
 * Application-level AES-256-GCM encryption helpers.
 *
 * Keep encryption keys in server-side environment variables only. Never fall back
 * to a public, hardcoded key or silently return plaintext when encryption fails.
 */

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const PREFIX = "enc:v1:";

function getMasterKey(): Buffer {
  const secret =
    process.env.ENCRYPTION_SECRET ||
    process.env.BRAINLAB_PRIVATE_ENTRY_TOKEN ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!secret?.trim()) {
    throw new Error("Encryption key is not configured.");
  }

  return crypto.createHash("sha256").update(secret).digest();
}

/** Encrypts plaintext. Returns an empty string for empty input; never returns plaintext on failure. */
export function encryptSensitive(plaintext: string | null | undefined): string {
  if (!plaintext || typeof plaintext !== "string") return "";
  if (plaintext.startsWith(PREFIX)) return plaintext;

  try {
    const key = getMasterKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plaintext, "utf8", "hex");
    encrypted += cipher.final("hex");
    const authTag = cipher.getAuthTag().toString("hex");

    return `${PREFIX}${iv.toString("hex")}:${authTag}:${encrypted}`;
  } catch {
    // Fail closed: callers must not persist sensitive data as plaintext.
    throw new Error("Sensitive-data encryption failed; refusing to return plaintext.");
  }
}

/** Decrypts an encrypted payload. Invalid or unauthenticated ciphertext fails closed. */
export function decryptSensitive(payload: string | null | undefined): string {
  if (!payload || typeof payload !== "string") return "";
  if (!payload.startsWith(PREFIX)) return payload;

  const parts = payload.slice(PREFIX.length).split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted payload format.");
  }

  try {
    const [ivHex, authTagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    if (iv.length !== IV_LENGTH || authTag.length !== 16 || !/^(?:[0-9a-f]{2})*$/i.test(encryptedHex)) {
      throw new Error("Invalid encrypted payload.");
    }

    const decipher = crypto.createDecipheriv(ALGORITHM, getMasterKey(), iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch {
    throw new Error("Sensitive-data decryption failed; ciphertext was not trusted.");
  }
}

/** Deterministic blind index for exact-match searches without decrypting records. */
export function hashSearchable(value: string | null | undefined): string {
  if (!value || typeof value !== "string") return "";
  const key = getMasterKey();
  return crypto.createHmac("sha256", key).update(value.trim().toLowerCase()).digest("hex");
}

/** Masks PII for public display. */
export function maskPII(
  value: string | null | undefined,
  type: "auto" | "name" | "phone" | "email" = "auto"
): string {
  if (!value || typeof value !== "string") return "Anonymous";
  const clean = value.trim();

  let detectedType = type;
  if (detectedType === "auto") {
    if (clean.includes("@")) detectedType = "email";
    else if (/^[0-9+() -]{7,16}$/.test(clean)) detectedType = "phone";
    else detectedType = "name";
  }

  if (detectedType === "phone") {
    const digits = clean.replace(/\D/g, "");
    if (digits.length <= 6) return clean;
    return `${clean.slice(0, 4)}****${clean.slice(-3)}`;
  }

  if (detectedType === "email") {
    const [user, domain] = clean.split("@");
    if (!domain || user.length <= 2) return `***@${domain || "protected.net"}`;
    return `${user[0]}***${user[user.length - 1]}@${domain}`;
  }

  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    if (parts[0].length <= 3) return parts[0];
    return `${parts[0].slice(0, 3)}***`;
  }
  const first = parts[0];
  const lastInitial = parts[parts.length - 1][0]?.toUpperCase() || "";
  return `${first} ${lastInitial}.`;
}

/** Generates a cryptographic verification signature for result slips and certificates. */
export function generateResultSignature(
  resultId: string,
  candidateName: string,
  score: number,
  total: number
): string {
  const key = getMasterKey();
  const payload = `${resultId}:${candidateName.trim().toLowerCase()}:${score}/${total}`;
  return crypto.createHmac("sha256", key).update(payload).digest("hex").slice(0, 16).toUpperCase();
}
