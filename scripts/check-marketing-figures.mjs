#!/usr/bin/env node

/**
 * CI Guard: BrainLab S7 Anti-Hardcoded Figures Verifier
 * 
 * Standing Rule S7:
 * "No hardcoded figures: every number on the site comes from a live aggregate query
 * or an admin setting with an as-of date. If unavailable, hide the figure.
 * Never fall back to a stale or invented number."
 * 
 * Scans marketing components and content configurations for invented figures
 * (e.g. "98% pass rate", "50,000 students", "4.9 stars", "10,000 questions").
 */

import fs from "fs";
import path from "path";

const SCAN_TARGETS = [
  "app/components/public",
  "app/components/home",
  "app/components/ui",
  "app/lib/contentConfig.ts",
  "app/lib/contactConfig.ts",
];

// Documented Allowlist for non-figure numeric tokens (years, viewports, timings, phone codes)
const ALLOWED_LITERALS = new Set([
  // Years
  "2024", "2025", "2026", "2027",
  // Standard Viewports
  "320", "360", "390", "768", "1024", "1280", "1440",
  // Standard Touch Target & SVG bounds
  "24", "44", "48", "100",
  // Standard phone country code & length
  "234", "10", "11",
  // Official standard exam specs
  "400", // JAMB total composite score specification
  "40",  // Standard subject question count
]);

// Patterns that indicate hardcoded marketing metric claims
const SUSPICIOUS_METRIC_PATTERNS = [
  /\b\d{1,3}(?:,\d{3})*\+?\s*(?:students|learners|users|candidates|schools|tutors|questions|downloads)\b/i,
  /\b\d{1,2}(?:\.\d+)?%\s*(?:pass\s*rate|success\s*rate|accuracy|improvement|score\s*increase)\b/i,
  /\b\d(?:\.\d+)?\s*(?:\/\s*5|\s*stars?|\s*rating)\b/i,
  /\b(?:over|more than|exceeding)\s+\d{1,3}(?:,\d{3})*\b/i,
];

let totalViolations = 0;
let filesScanned = 0;

function scanFile(filePath) {
  filesScanned++;
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/);

  lines.forEach((line, index) => {
    // Ignore pure comment lines or imports
    const trimmed = line.trim();
    if (trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*") || trimmed.startsWith("import ")) {
      return;
    }

    // Check suspicious marketing figures
    for (const pattern of SUSPICIOUS_METRIC_PATTERNS) {
      const match = line.match(pattern);
      if (match) {
        // Check if line carries a verified claim attribute or asOfDate, or describes the official UTME test blueprint
        const hasClaimVerification =
          line.includes("asOfDate") ||
          line.includes("LIVE_AGGREGATE") ||
          line.includes("ADMIN_SET") ||
          line.includes("claimId");

        const isExamBlueprintSpec =
          /\b(?:180|60|40)\s*questions\b/i.test(match[0]) &&
          (line.includes("Blueprint") ||
            line.includes("Mins") ||
            line.includes("UTME") ||
            line.includes("Standard") ||
            line.includes("JAMB"));

        if (!hasClaimVerification && !isExamBlueprintSpec) {
          console.error(
            `\x1b[31m[S7 VIOLATION]\x1b[0m ${filePath}:${index + 1}`
          );
          console.error(`  Matched hardcoded metric: "${match[0]}"`);
          console.error(`  Line: ${trimmed}`);
          totalViolations++;
        }
      }
    }
  });
}

function walkDir(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(fullPath);
    } else if (/\.(tsx|ts|jsx|js)$/.test(entry.name)) {
      scanFile(fullPath);
    }
  }
}

console.log("=========================================================================");
console.log("  BRAINLAB CI: S7 ANTI-HARDCODED FIGURES & METRIC SCANNER");
console.log("=========================================================================\n");

for (const target of SCAN_TARGETS) {
  const resolved = path.join(process.cwd(), target);
  if (fs.existsSync(resolved)) {
    const stat = fs.statSync(resolved);
    if (stat.isDirectory()) {
      walkDir(resolved);
    } else {
      scanFile(resolved);
    }
  }
}

console.log(`\nScan complete. ${filesScanned} files analyzed.`);

if (totalViolations > 0) {
  console.error(`\x1b[31mFAILED: Found ${totalViolations} hardcoded figure violation(s).\x1b[0m`);
  console.error("Rule S7 requires every number to come from a live aggregate query or an admin setting with an as-of date.");
  process.exit(1);
} else {
  console.log("\x1b[32m[PASS] S7 Rule Verified: Zero hardcoded or invented marketing metrics detected.\x1b[0m\n");
  process.exit(0);
}
