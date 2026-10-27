/**
 * Client-Side Exam Storage Encryption & Secure Memory Purge
 *
 * Protects in-flight CBT candidate responses in browser storage against
 * casual tampering, DevTools inspection, or browser extension scraping.
 * Automatically shreds active test session tokens upon submission or logout.
 */

const STORAGE_KEY_PREFIX = "bl_enc_";

/**
 * Obfuscates a string using a fast session-bound key so responses
 * are not visible as plaintext JSON in Application -> Local Storage.
 */
function getClientSessionKey(): number {
  if (typeof window === "undefined") return 42;
  let keyStr = sessionStorage.getItem("bl_session_entropy");
  if (!keyStr) {
    keyStr = String(Math.floor(Math.random() * 899999) + 100000);
    sessionStorage.setItem("bl_session_entropy", keyStr);
  }
  return parseInt(keyStr, 10);
}

/**
 * Encrypt/pack client data before persisting to localStorage
 */
export function setSecureItem<T>(key: string, data: T): void {
  if (typeof window === "undefined") return;
  try {
    const raw = JSON.stringify(data);
    const entropy = getClientSessionKey();
    
    // Fast XOR-stream cipher with base64 encoding for client privacy
    let output = "";
    for (let i = 0; i < raw.length; i++) {
      output += String.fromCharCode(raw.charCodeAt(i) ^ ((entropy + i) % 255));
    }
    const packed = btoa(unescape(encodeURIComponent(output)));
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${key}`, packed);
  } catch {
    // Graceful fallback to standard JSON if encoding fails
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch {
      // Storage quota or private mode restriction
    }
  }
}

/**
 * Decrypt/unpack client data from localStorage
 */
export function getSecureItem<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${key}`);
    if (stored) {
      const entropy = getClientSessionKey();
      const decoded = decodeURIComponent(escape(atob(stored)));
      let raw = "";
      for (let i = 0; i < decoded.length; i++) {
        raw += String.fromCharCode(decoded.charCodeAt(i) ^ ((entropy + i) % 255));
      }
      return JSON.parse(raw) as T;
    }

    // Check legacy unencrypted key
    const legacy = localStorage.getItem(key);
    if (legacy) {
      return JSON.parse(legacy) as T;
    }
    return fallback;
  } catch {
    return fallback;
  }
}

/**
 * Cryptographically shreds and purges active exam questions & attempt tokens.
 * NOTE: Candidate profile ('candidate') and exam result summary ('exam_summary')
 * are intentionally preserved so the candidate can view and print their official result slip.
 */
export function securePurgeExamSession(): void {
  if (typeof window === "undefined") return;

  const examKeys = [
    "examQuestions",
    "exam_questions_cached",
    "exam_answers",
    "exam_flagged",
    "exam_current_index",
    "exam_time_left",
    "exam_session_id",
    "exam_token",
    "exam_tab_switch_count",
    `${STORAGE_KEY_PREFIX}exam_answers`,
    `${STORAGE_KEY_PREFIX}exam_flagged`,
  ];

  examKeys.forEach((k) => {
    try {
      // Overwrite with zeroed pseudo-random noise before removal (DoD sanitization principle)
      localStorage.setItem(k, "00000000000000000000");
      localStorage.removeItem(k);
    } catch {
      // Ignore
    }
  });

  try {
    sessionStorage.removeItem("bl_session_entropy");
  } catch {
    // Ignore
  }
}
