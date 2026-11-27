export const CANDIDATE_IDENTITY_FIELDS = [
  "full_name",
  "candidate_number",
  "phone",
  "email",
] as const;

export type CandidateIdentityField = (typeof CANDIDATE_IDENTITY_FIELDS)[number];
export type CandidateIdentityFieldMode = "hidden" | "optional" | "required";
export type CandidateIdentityConfig = {
  version: 1;
  fields: Partial<Record<CandidateIdentityField, CandidateIdentityFieldMode>>;
};
export type CandidateIdentityValues = Partial<Record<CandidateIdentityField, string | null>>;

type ValidationResult<T> = { ok: true; value: T } | { ok: false; error: string };

const FIELD_SET = new Set<string>(CANDIDATE_IDENTITY_FIELDS);
const MODE_SET = new Set<string>(["hidden", "optional", "required"]);
const CONFIG_MAX_LENGTH = 2_048;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Validates the persisted assessment policy. A null policy is handled by the
 * caller as legacy/no-extra-identity behaviour; this function validates only
 * configured policies.
 */
export function validateCandidateIdentityConfig(value: unknown): ValidationResult<CandidateIdentityConfig> {
  if (!isRecord(value) || Object.keys(value).some((key) => key !== "version" && key !== "fields")) {
    return { ok: false, error: "Candidate identity settings are invalid." };
  }
  if (JSON.stringify(value).length > CONFIG_MAX_LENGTH || value.version !== 1 || !isRecord(value.fields)) {
    return { ok: false, error: "Candidate identity settings are invalid." };
  }

  const fields: CandidateIdentityConfig["fields"] = {};
  for (const [field, mode] of Object.entries(value.fields)) {
    if (!FIELD_SET.has(field) || typeof mode !== "string" || !MODE_SET.has(mode)) {
      return { ok: false, error: "Candidate identity settings contain an unsupported field or rule." };
    }
    fields[field as CandidateIdentityField] = mode as CandidateIdentityFieldMode;
  }

  if (!Object.values(fields).some((mode) => mode !== "hidden")) {
    return { ok: false, error: "At least one candidate identity field must be visible." };
  }

  return { ok: true, value: { version: 1, fields } };
}

function normalizeField(field: CandidateIdentityField, raw: unknown): ValidationResult<string | null> {
  if (raw === null || raw === undefined) return { ok: true, value: null };
  if (typeof raw !== "string") return { ok: false, error: "Enter valid candidate details." };

  const value = raw.trim().replace(/\s+/g, " ");
  if (!value) return { ok: true, value: null };

  if (field === "full_name") {
    if (value.length < 2 || value.length > 100 || !/[\p{L}]/u.test(value)) {
      return { ok: false, error: "Enter a name between 2 and 100 characters." };
    }
    return { ok: true, value };
  }

  if (field === "candidate_number") {
    if (value.length > 40 || !/^[A-Za-z0-9][A-Za-z0-9/_-]*$/.test(value)) {
      return { ok: false, error: "Enter a valid candidate number (letters, numbers, /, _ or -)." };
    }
    return { ok: true, value };
  }

  if (field === "email") {
    const normalized = value.toLowerCase();
    if (normalized.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalized)) {
      return { ok: false, error: "Enter a valid email address." };
    }
    return { ok: true, value: normalized };
  }

  // Phone values are stored in international format to avoid ambiguous local
  // numbers. The UI can provide a country-code hint, but must not guess it.
  if (value.length > 16 || !/^\+[1-9]\d{6,14}$/.test(value)) {
    return { ok: false, error: "Enter a phone number in international format, e.g. +2348012345678." };
  }
  return { ok: true, value };
}

/**
 * Validates submitted values against the assessment's persisted policy.
 * Unknown and hidden keys are rejected, required values are enforced, and
 * optional empty strings are normalized to null.
 */
export function validateCandidateIdentityValues(
  config: CandidateIdentityConfig,
  input: unknown,
): ValidationResult<CandidateIdentityValues> {
  if (!isRecord(input) || Object.keys(input).some((key) => !FIELD_SET.has(key))) {
    return { ok: false, error: "Candidate details contain an unsupported field." };
  }

  const normalized: CandidateIdentityValues = {};
  for (const field of CANDIDATE_IDENTITY_FIELDS) {
    const mode = config.fields[field] ?? "hidden";
    const supplied = Object.prototype.hasOwnProperty.call(input, field);

    if (mode === "hidden") {
      if (supplied) return { ok: false, error: "A hidden candidate field was submitted." };
      continue;
    }

    const result = normalizeField(field, supplied ? input[field] : null);
    if (!result.ok) return result;
    if (mode === "required" && result.value === null) {
      return { ok: false, error: "Complete all required candidate details." };
    }
    normalized[field] = result.value;
  }

  return { ok: true, value: normalized };
}
