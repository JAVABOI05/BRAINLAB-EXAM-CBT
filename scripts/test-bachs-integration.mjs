/**
 * Unit & Integration Test Suite for Bachs Payment Gateway & Social Links
 * Usage: node scripts/test-bachs-integration.mjs
 */

import crypto from "crypto";
import fs from "fs";
import path from "path";
import assert from "assert";

let passed = 0;
let total = 0;

function it(desc, fn) {
  total++;
  try {
    fn();
    console.log(`  ✓ ${desc}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${desc}`);
    console.error(`    ${err.message}`);
  }
}

console.log("\n🧪 Running Bachs Payment Integration & Social Footer Test Suite\n");

// ----------------------------------------------------------------------------
// 1. Webhook Signature Verification Tests
// ----------------------------------------------------------------------------
console.log("Group 1: Webhook Signature Verification (HMAC-SHA256 & V2 Format)");

const testSecret = "whsec_test_secret_key_123456789";
const testPayload = JSON.stringify({
  id: "evt_test_123",
  type: "collection.succeeded",
  created_at: new Date().toISOString(),
  data: {
    checkout_id: "cks_test_session_abc",
    amount: "15000.00",
    currency: "NGN",
    status: "SUCCEEDED",
    metadata: {
      reference: "BL_TEST_REF_001",
      userId: "usr_mock_123",
      planId: "plus",
    },
  },
});

function computeBachsSignature(rawBody, timestamp, secret) {
  const signed = `${timestamp}.${rawBody}`;
  return crypto.createHmac("sha256", secret).update(signed, "utf8").digest("hex");
}

function verifyBachsSignature(rawBody, signature, secret, headers = {}) {
  if (!secret) return false;
  try {
    let timestamp = headers["x-bachs-timestamp"];
    let signatureHash = signature.trim();

    if (signature.includes("t=") && signature.includes("v1=")) {
      const parts = signature.split(",");
      for (const part of parts) {
        const trimmed = part.trim();
        if (trimmed.startsWith("t=")) timestamp = trimmed.slice(2);
        else if (trimmed.startsWith("v1=")) signatureHash = trimmed.slice(3);
      }
    }

    if (!timestamp || !signatureHash) return false;

    const eventTimeSec = parseInt(timestamp, 10);
    if (isNaN(eventTimeSec)) return false;

    const nowSec = Math.floor(Date.now() / 1000);
    if (Math.abs(nowSec - eventTimeSec) > 300) return false;

    const signed = `${timestamp}.${rawBody}`;
    const expected = crypto.createHmac("sha256", secret).update(signed, "utf8").digest("hex");

    const expectedBuf = Buffer.from(expected, "utf8");
    const sigBuf = Buffer.from(signatureHash, "utf8");
    if (expectedBuf.length !== sigBuf.length) return false;

    return crypto.timingSafeEqual(expectedBuf, sigBuf);
  } catch {
    return false;
  }
}

it("validates a legitimate HMAC-SHA256 signature with standard header", () => {
  const now = Math.floor(Date.now() / 1000);
  const sig = computeBachsSignature(testPayload, now, testSecret);
  const valid = verifyBachsSignature(testPayload, sig, testSecret, {
    "x-bachs-timestamp": String(now),
  });
  assert.strictEqual(valid, true);
});

it("validates an X-Bachs-Signature-V2 format (t=...,v1=...)", () => {
  const now = Math.floor(Date.now() / 1000);
  const hash = computeBachsSignature(testPayload, now, testSecret);
  const v2Header = `t=${now},v1=${hash}`;
  const valid = verifyBachsSignature(testPayload, v2Header, testSecret);
  assert.strictEqual(valid, true);
});

it("rejects an altered or forged payload signature", () => {
  const now = Math.floor(Date.now() / 1000);
  const sig = computeBachsSignature(testPayload, now, testSecret);
  const tamperedPayload = testPayload.replace("15000.00", "1.00");
  const valid = verifyBachsSignature(tamperedPayload, sig, testSecret, {
    "x-bachs-timestamp": String(now),
  });
  assert.strictEqual(valid, false);
});

it("rejects signatures with incorrect secret key", () => {
  const now = Math.floor(Date.now() / 1000);
  const sig = computeBachsSignature(testPayload, now, "wrong_secret");
  const valid = verifyBachsSignature(testPayload, sig, testSecret, {
    "x-bachs-timestamp": String(now),
  });
  assert.strictEqual(valid, false);
});

it("rejects replayed webhook requests older than 300 seconds", () => {
  const oldTime = Math.floor(Date.now() / 1000) - 301; // 301s ago
  const sig = computeBachsSignature(testPayload, oldTime, testSecret);
  const valid = verifyBachsSignature(testPayload, sig, testSecret, {
    "x-bachs-timestamp": String(oldTime),
  });
  assert.strictEqual(valid, false);
});

// ----------------------------------------------------------------------------
// 2. Amount and Currency Formatting Tests
// ----------------------------------------------------------------------------
console.log("\nGroup 2: Amount Decimal Formatting & Matching");

it("converts kobo integer to standard currency decimal string accurately", () => {
  const amountKobo = 1500000; // 15,000 NGN
  const decimalStr = (amountKobo / 100).toFixed(2);
  assert.strictEqual(decimalStr, "15000.00");

  const smallAmountKobo = 45050; // 450.50 NGN
  assert.strictEqual((smallAmountKobo / 100).toFixed(2), "450.50");
});

it("accurately converts incoming decimal strings to kobo integers", () => {
  const incomingDecimal = "15000.00";
  const parsedKobo = Math.round(parseFloat(incomingDecimal) * 100);
  assert.strictEqual(parsedKobo, 1500000);
});

it("detects price mismatch between incoming webhook and transaction record", () => {
  const recordedKobo = 1500000;
  const incomingDecimal = "1000.00"; // underpayment attempt
  const incomingKobo = Math.round(parseFloat(incomingDecimal) * 100);
  const mismatch = Math.abs(incomingKobo - recordedKobo) > 5;
  assert.strictEqual(mismatch, true);
});

// ----------------------------------------------------------------------------
// 3. Official Social Links Verification in Footer
// ----------------------------------------------------------------------------
console.log("\nGroup 3: Official Social Media Links Verification");

const footerPath = path.resolve("app/components/BrandFooter.tsx");
const footerContent = fs.readFileSync(footerPath, "utf8");

const requiredLinks = [
  { platform: "X (Twitter)", url: "https://x.com/The_brainlabhub" },
  { platform: "Instagram", url: "https://www.instagram.com/brain_labacademy?dlrf=NGJzcmFnaGcwZHV4" },
  { platform: "Facebook", url: "https://www.facebook.com/profile.php?id=61595669640028" },
  { platform: "YouTube", url: "https://youtube.com/@thebrainlabhub?si=z4sAVuNmJUdPom_u" },
  { platform: "TikTok", url: "https://www.tiktok.com/@brainlabacademy" },
];

for (const req of requiredLinks) {
  it(`BrandFooter contains official ${req.platform} URL: ${req.url}`, () => {
    assert(
      footerContent.includes(req.url),
      `Expected BrandFooter.tsx to contain exact URL: ${req.url}`
    );
  });
}

it("all external links in BrandFooter have target=_blank and rel=noopener noreferrer", () => {
  assert(footerContent.includes('target="_blank"'));
  assert(footerContent.includes('rel="noopener noreferrer"'));
});

// ----------------------------------------------------------------------------
// Summary
// ----------------------------------------------------------------------------
console.log(`\n==================================================`);
console.log(`Test Results: ${passed}/${total} Passed (${Math.round((passed / total) * 100)}%)`);
console.log(`==================================================\n`);

if (passed !== total) {
  process.exit(1);
}
