/**
 * Comprehensive Test Suite for Password & PIN Strength Engine and Supabase Config Seeding
 * Run with: npx tsx scripts/test-password-strength-and-seeding.ts
 */

import { evaluatePasswordStrength } from "../app/lib/passwordStrength";
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// Simple env loader without extra dependency
function loadEnvFile(fileName: string) {
  const filePath = path.resolve(process.cwd(), fileName);
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  \x1b[32m✔\x1b[0m ${testName}`);
    passed++;
  } else {
    console.error(`  \x1b[31m✖\x1b[0m ${testName}${detail ? ` (${detail})` : ""}`);
    failed++;
  }
}

async function runTests() {
  console.log("\n========================================================");
  console.log(" BRAINLAB ACADEMY - PASSWORD & SECURITY VERIFICATION");
  console.log("========================================================\n");

  // 1. Student Password Evaluation Tests
  console.log("--- 1. Student Password Rules ---");
  {
    const empty = evaluatePasswordStrength("", "student");
    assert(empty.level === "empty" && !empty.isValid, "Empty password is level 'empty' and invalid");

    const short = evaluatePasswordStrength("Ab1!", "student");
    assert(short.level === "weak" && !short.isValid, "Under 8 chars ('Ab1!') is 'weak' and invalid");

    const forbidden = evaluatePasswordStrength("password123", "student");
    assert(forbidden.level === "weak" && !forbidden.isValid, "Forbidden dictionary ('password123') is 'weak' and invalid");

    const forbidden2 = evaluatePasswordStrength("student123", "student");
    assert(forbidden2.level === "weak" && !forbidden2.isValid, "Forbidden student dictionary ('student123') is 'weak' and invalid");

    const good = evaluatePasswordStrength("Student9", "student");
    assert(good.level === "good" && good.isValid, "8+ chars with letters and numbers ('Student9') is 'good' and valid");

    const strong = evaluatePasswordStrength("BrainLab2026!Exam", "student");
    assert(strong.level === "strong" && strong.isValid, "12+ chars mixed-case, numbers, and symbols ('BrainLab2026!Exam') is 'strong'");
  }

  // 2. Admin / Staff Password Evaluation Tests
  console.log("\n--- 2. Administrator Password Rules ---");
  {
    const adminShort = evaluatePasswordStrength("Adm1n!9", "admin");
    assert(adminShort.level === "weak" && !adminShort.isValid, "Under 10 chars ('Adm1n!9') is 'weak' and invalid for admin");

    const adminForbidden = evaluatePasswordStrength("administrator", "admin");
    assert(adminForbidden.level === "weak" && !adminForbidden.isValid, "Forbidden admin word ('administrator') is 'weak' and invalid");

    const adminGood = evaluatePasswordStrength("AdminCandidate2026", "admin");
    assert(adminGood.level === "good" && adminGood.isValid, "10+ chars without symbol is 'good' and valid");

    const adminStrong = evaluatePasswordStrength("Super#Admin!2026Safe", "admin");
    assert(adminStrong.level === "strong" && adminStrong.isValid, "10+ chars with mixed case, numbers, symbols is 'strong'");
  }

  // 3. Security PIN Evaluation Tests
  console.log("\n--- 3. Admin Security PIN Rules ---");
  {
    const pinTooShort = evaluatePasswordStrength("12", "pin");
    assert(pinTooShort.level === "weak" && !pinTooShort.isValid, "PIN under 4 digits ('12') is 'weak' and invalid");

    const pinForbidden = evaluatePasswordStrength("1234", "pin");
    assert(pinForbidden.level === "weak" && !pinForbidden.isValid, "Sequential PIN ('1234') is 'weak' and rejected");

    const pinRepeating = evaluatePasswordStrength("1111", "pin");
    assert(pinRepeating.level === "weak" && !pinRepeating.isValid, "Repeating PIN ('1111') is 'weak' and rejected");

    const pinAcceptable = evaluatePasswordStrength("9482", "pin");
    assert(pinAcceptable.level === "weak" && pinAcceptable.isValid, "4-digit varied PIN ('9482') is valid but weak");

    const pinGood = evaluatePasswordStrength("492817", "pin");
    assert(pinGood.level === "good" && pinGood.isValid, "6-digit varied PIN ('492817') is 'good'");

    const pinStrong = evaluatePasswordStrength("20262026", "pin");
    assert(pinStrong.level === "strong" && pinStrong.isValid, "8-digit PIN ('20262026') is 'strong'");
  }

  // 4. Supabase DB Seeding & Hash Verification
  console.log("\n--- 4. Supabase Config Seeding & Hash Verification ---");
  {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.warn("  \x1b[33m⚠\x1b[0m Skipping Supabase live query: SUPABASE URL or SERVICE_KEY missing in environment.");
    } else {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const requiredKeys = [
        "admin_security_pin",
        "website_content_config",
        "footer_config",
        "platform_feature_flags",
        "coupon_campaigns",
        "academic_config",
      ];

      const { data, error } = await supabase
        .from("exam_config")
        .select("config_key, config_value")
        .in("config_key", requiredKeys);

      assert(!error, "Connected to Supabase 'exam_config' without error", error?.message);

      if (data) {
        const foundMap = new Map(data.map((r) => [r.config_key, r.config_value]));

        for (const key of requiredKeys) {
          const val = foundMap.get(key);
          assert(!!val, `Row '${key}' exists in 'exam_config'`);
        }

        // Verify cryptographic hash on admin_security_pin
        const pinRecord = foundMap.get("admin_security_pin");
        if (pinRecord) {
          assert(pinRecord.is_set === true, "admin_security_pin is marked 'is_set: true'");
          assert(typeof pinRecord.hash === "string" && pinRecord.hash.length >= 64, "admin_security_pin has valid cryptographic hex hash");
          assert(typeof pinRecord.salt === "string" && pinRecord.salt.length >= 32, "admin_security_pin has random cryptographic salt");
          assert(!pinRecord.pin, "admin_security_pin does NOT contain plaintext 'pin' field");
          assert(!pinRecord.defaultHint, "admin_security_pin does NOT contain plaintext 'defaultHint'");
        }
      }
    }
  }

  console.log("\n========================================================");
  console.log(` RESULTS: ${passed} passed, ${failed} failed`);
  console.log("========================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

void runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
