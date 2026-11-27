import assert from "node:assert/strict";
import {
  validateCandidateIdentityConfig,
  validateCandidateIdentityValues,
} from "../app/lib/candidateIdentity";

const validConfig = {
  version: 1,
  fields: {
    full_name: "required",
    candidate_number: "optional",
    email: "optional",
    phone: "hidden",
  },
} as const;

function config(value: unknown) {
  const result = validateCandidateIdentityConfig(value);
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error(result.error);
  return result.value;
}

console.log("Candidate identity validation tests");

assert.equal(validateCandidateIdentityConfig(null).ok, false);
assert.equal(validateCandidateIdentityConfig({ version: 2, fields: { full_name: "required" } }).ok, false);
assert.equal(validateCandidateIdentityConfig({ version: 1, fields: { unknown: "required" } }).ok, false);
assert.equal(validateCandidateIdentityConfig({ version: 1, fields: { full_name: "mandatory" } }).ok, false);
assert.equal(validateCandidateIdentityConfig({ version: 1, fields: { full_name: "hidden" } }).ok, false);
assert.equal(validateCandidateIdentityConfig({ version: 1, extra: true, fields: { full_name: "required" } }).ok, false);
console.log("  ✓ rejects invalid versions, unknown fields, modes, and empty visible policies");

const policy = config(validConfig);
const accepted = validateCandidateIdentityValues(policy, {
  full_name: "  Ada   Lovelace ",
  candidate_number: " BL/2026-01 ",
  email: " ADA@EXAMPLE.COM ",
});
assert.equal(accepted.ok, true);
if (accepted.ok) {
  assert.deepEqual(accepted.value, {
    full_name: "Ada Lovelace",
    candidate_number: "BL/2026-01",
    email: "ada@example.com",
  });
}
console.log("  ✓ trims and normalizes visible candidate values");

assert.equal(validateCandidateIdentityValues(policy, { candidate_number: "BL-01" }).ok, false);
assert.equal(validateCandidateIdentityValues(policy, { full_name: "A" }).ok, false);
assert.equal(validateCandidateIdentityValues(policy, { full_name: "Ada", phone: "+2348012345678" }).ok, false);
assert.equal(validateCandidateIdentityValues(policy, { full_name: "Ada", extra: "value" }).ok, false);
assert.equal(validateCandidateIdentityValues(policy, { full_name: "Ada", email: "not-an-email" }).ok, false);
assert.equal(validateCandidateIdentityValues(policy, { full_name: "Ada", email: "a@b.c" }).ok, false);
assert.equal(validateCandidateIdentityValues(policy, { full_name: "Ada", candidate_number: "BL 01" }).ok, false);
assert.equal(validateCandidateIdentityValues(policy, { full_name: "Ada", candidate_number: "x".repeat(41) }).ok, false);
assert.equal(validateCandidateIdentityValues(policy, { full_name: "Ada", email: "x".repeat(4_200) }).ok, false);
console.log("  ✓ rejects missing required, hidden, unknown, malformed, and oversized values");

const optionalEmpty = validateCandidateIdentityValues(policy, { full_name: "Ada", candidate_number: "   " });
assert.equal(optionalEmpty.ok, true);
if (optionalEmpty.ok) assert.equal(optionalEmpty.value.candidate_number, null);
console.log("  ✓ normalizes blank optional values to null");

const phonePolicy = config({ version: 1, fields: { phone: "required" } });
assert.equal(validateCandidateIdentityValues(phonePolicy, { phone: "+2348012345678" }).ok, true);
assert.equal(validateCandidateIdentityValues(phonePolicy, { phone: "08012345678" }).ok, false);
assert.equal(validateCandidateIdentityValues(phonePolicy, { phone: "+0123456789" }).ok, false);
console.log("  ✓ accepts international phone format and rejects ambiguous local numbers");

console.log("Candidate identity validation tests: ALL CHECKS PASSED");
