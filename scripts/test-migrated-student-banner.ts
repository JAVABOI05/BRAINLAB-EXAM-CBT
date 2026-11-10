/**
 * Verification Suite for Decision D6: Migrated-Student In-App Banner & Transactional Email
 */
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mock-project.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "mock-anon-key";

import fs from "fs";
import path from "path";
import assert from "assert";

let sendMigratedStudentNotificationEmail: any;

console.log("=========================================================================");
console.log("  BRAINLAB CI: MIGRATED-STUDENT COMMUNICATION (DECISION D6) VERIFICATION");
console.log("=========================================================================\n");

let passed = 0;

function check(name: string, condition: boolean) {
  if (condition) {
    console.log(`  ✓ ${name}`);
    passed++;
  } else {
    console.error(`  ✗ FAILED: ${name}`);
    process.exit(1);
  }
}

// 1. In-App Banner Component Architecture
const bannerPath = path.resolve(__dirname, "../app/components/dashboard/MigratedStudentBanner.tsx");
check("MigratedStudentBanner component file exists", fs.existsSync(bannerPath));

const bannerContent = fs.readFileSync(bannerPath, "utf-8");
check("MigratedStudentBanner exports default component", bannerContent.includes("export default function MigratedStudentBanner"));
check("MigratedStudentBanner queries access_migration_items status", bannerContent.includes("access_migration_items"));
check("MigratedStudentBanner verifies status = 'success'", bannerContent.includes("eq(\"status\", \"success\")"));
check("MigratedStudentBanner handles local dismissal persistence", bannerContent.includes("brainlab_migration_banner_dismissed"));
check("MigratedStudentBanner includes Start Practicing CTA link to /cbt", bannerContent.includes("href=\"/cbt\""));

// 2. Student Dashboard Integration
const dashboardPath = path.resolve(__dirname, "../app/dashboard/page.tsx");
const dashboardContent = fs.readFileSync(dashboardPath, "utf-8");
check("Dashboard imports MigratedStudentBanner", dashboardContent.includes("MigratedStudentBanner"));
check("Dashboard renders <MigratedStudentBanner />", dashboardContent.includes("<MigratedStudentBanner />"));

// 3. Transactional Email Dispatcher
const emailServicePath = path.resolve(__dirname, "../app/lib/emailService.ts");
const emailServiceContent = fs.readFileSync(emailServicePath, "utf-8");
check("emailService exports sendMigratedStudentNotificationEmail", emailServiceContent.includes("sendMigratedStudentNotificationEmail"));
check("emailService defines MigratedStudentEmailParams interface", emailServiceContent.includes("interface MigratedStudentEmailParams"));

// 4. Test Simulated Email Dispatch
async function testEmailDispatch() {
  const emailModule = await import("../app/lib/emailService");
  sendMigratedStudentNotificationEmail = emailModule.sendMigratedStudentNotificationEmail;

  const result = await sendMigratedStudentNotificationEmail({
    to: "test-student@example.com",
    studentName: "Ada Lovelace",
    tierName: "Apex Scholar",
    expiryDateText: "31 Dec 2026",
    featuresCount: 14,
  });

  check("Simulated email dispatch resolves with success: true", result.success === true);
  console.log("\n=========================================================================");
  console.log(`  DECISION D6 COMMUNICATION SUITE: ${passed} PASSED, 0 FAILED`);
  console.log("=========================================================================\n");
}

void testEmailDispatch();
