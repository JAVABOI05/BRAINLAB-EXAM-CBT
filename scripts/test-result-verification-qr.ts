import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const resultPage = readFileSync("app/result/page.tsx", "utf8");
const verifyPage = readFileSync("app/verify/[id]/page.tsx", "utf8");
const qrComponent = readFileSync("app/components/VerificationQRCode.tsx", "utf8");
const migration = readFileSync(
  "supabase/migrations/20261117090000_public_exam_result_verification.sql",
  "utf8"
);

assert.match(resultPage, /window\.location\.origin/);
assert.match(resultPage, /encodeURIComponent\(summary\.result_id\)/);
assert.doesNotMatch(resultPage, /mock-result/);
assert.doesNotMatch(resultPage, /https:\/\/www\.brainlabacademy\.com\.ng\/verify\/\$\{/);

assert.match(qrComponent, /href=\{url\}/);
assert.match(qrComponent, /Open verification/);

assert.match(verifyPage, /verify_exam_result/);
assert.match(verifyPage, /Verification Temporarily Unavailable/);
assert.match(verifyPage, /verify_certificate/);

assert.match(migration, /show_results/);
assert.match(migration, /es\.id::text = r\.session_id/);
assert.match(migration, /submitted', 'completed', 'auto_submitted/);
assert.match(migration, /revoke all on function public\.verify_exam_result\(text\) from public/i);
assert.match(migration, /grant execute on function public\.verify_exam_result\(text\) to anon, authenticated/i);

console.log("QR/result verification source checks passed.");
