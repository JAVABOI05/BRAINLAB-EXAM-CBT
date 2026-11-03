import { getSupabaseServerClient } from "../app/lib/supabaseServer";
import { getStudentSubscriptionAndEntitlements, isCurrentUserAdmin } from "../app/lib/subscriptionEntitlements";

async function runSubscriptionSyncTests() {
  console.log("=================================================================");
  console.log("BRAINLAB ACADEMY - SUBSCRIPTION & ENTITLEMENT SYNC TEST SUITE");
  console.log("=================================================================\n");

  const supabase = getSupabaseServerClient();
  let passed = 0;
  let failed = 0;

  function assert(condition: unknown, testName: string, details?: string) {
    if (Boolean(condition)) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}${details ? ` -> ${details}` : ""}`);
      failed++;
    }
  }

  // Pick a real candidate user in Staging
  const { data: users, error: userError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 5 });
  if (userError || !users?.users?.length) {
    throw new Error("Could not fetch test users from Staging database.");
  }

  const testUser = users.users[0];
  const testUserId = testUser.id;
  console.log(`Using test candidate account: ${testUser.email} (${testUserId})\n`);

  // SCENARIO A: Admin Manual Upgrade
  console.log("--- SCENARIO A: ADMIN MANUAL UPGRADE ---");
  const { data: grantData, error: grantError } = await supabase.rpc(
    "admin_grant_candidate_subscription",
    {
      p_user_id: testUserId,
      p_plan_id: "pro",
      p_duration_days: 45,
      p_reason: "Automated QA Verification",
      p_admin_email: "qa-admin@brainlab.test",
    }
  );

  assert(!grantError && grantData?.ok === true, "Admin manual upgrade RPC executes successfully", grantError?.message);
  assert(grantData?.plan_id === "pro", "RPC grants selected PRO plan");
  assert(grantData?.max_questions === 500, "Pro plan receives 500 maximum question capacity");
  assert(grantData?.validity_days === 45, "Validity duration accurately recorded as 45 days");

  // Verify rows in user_subscriptions & learning_entitlements
  const { data: subRow } = await supabase
    .from("user_subscriptions")
    .select("*")
    .eq("user_id", testUserId)
    .single();

  assert(subRow?.status === "active" && subRow?.plan_id === "pro", "user_subscriptions contains active Pro row");

  const { data: entRows } = await supabase
    .from("learning_entitlements")
    .select("*")
    .eq("user_id", testUserId)
    .eq("status", "active");

  assert(entRows && entRows.length === 1, "Exactly one active membership entitlement exists (superseded tiers revoked)");
  assert(entRows?.[0]?.membership_type === "pro", "Active entitlement matches Pro plan");
  assert(entRows?.[0]?.max_questions === 500, "Active entitlement has 500 question quota");

  // SCENARIO B: PIN Voucher Redemption
  console.log("\n--- SCENARIO B: PIN VOUCHER REDEMPTION ---");
  // Create a temporary test voucher code
  const testVoucherCode = `TEST-PRO-${Date.now().toString().slice(-6)}`;
  await supabase.from("access_codes").insert({
    code: testVoucherCode,
    grants_plan: "pro",
    validity_days: 90,
    cohort: "QA-Cohort",
    is_used: false,
    is_exported: true,
  });

  const { data: redeemData, error: redeemError } = await supabase.rpc("redeem_plan_voucher", {
    p_code: testVoucherCode,
    p_user_id: testUserId,
    p_phone: "08011223344",
  });

  assert(!redeemError && redeemData?.ok === true, "Voucher redemption RPC executes successfully", redeemError?.message);
  assert(redeemData?.plan_id === "pro", "Voucher grants Pro plan");
  assert(redeemData?.validity_days === 90, "Voucher respects 90-day validity");

  // Verify access_codes row marked as used
  const { data: codeCheck } = await supabase
    .from("access_codes")
    .select("is_used, used_by")
    .eq("code", testVoucherCode)
    .single();

  assert(codeCheck?.is_used === true, "Voucher code marked as consumed (is_used = true)");

  // SCENARIO C: Invalid, Already Used & Single Exam Pass Protection
  console.log("\n--- SCENARIO C: DOUBLE REDEMPTION & SINGLE EXAM PASS SAFETY ---");
  // 1. Double redemption attempt
  const { data: doubleRedeem } = await supabase.rpc("redeem_plan_voucher", {
    p_code: testVoucherCode,
    p_user_id: testUserId,
  });
  assert(doubleRedeem?.ok === false && doubleRedeem?.error === "already_used", "Re-redeeming used PIN is rejected with already_used");

  // 2. Single Exam Pass protection (grants_plan is null)
  const testExamPassCode = `TEST-EXAM-${Date.now().toString().slice(-6)}`;
  await supabase.from("access_codes").insert({
    code: testExamPassCode,
    grants_plan: null,
    is_used: false,
    is_exported: true,
  });

  const { data: examPassRedeem } = await supabase.rpc("redeem_plan_voucher", {
    p_code: testExamPassCode,
    p_user_id: testUserId,
  });
  assert(examPassRedeem?.ok === false && examPassRedeem?.error === "single_exam_pass", "Single Exam Pass is rejected with single_exam_pass");

  // Verify exam pass was not consumed
  const { data: passCheck } = await supabase
    .from("access_codes")
    .select("is_used")
    .eq("code", testExamPassCode)
    .single();
  assert(passCheck?.is_used === false, "Single Exam Pass code remains unused and valid for CBT tests");

  // SCENARIO D: Authoritative Entitlement Resolution & VIP Access
  console.log("\n--- SCENARIO D: UNIFIED ENTITLEMENT RESOLUTION ---");
  const studentEntitlements = await getStudentSubscriptionAndEntitlements(testUserId);
  assert(studentEntitlements.isSubscribed === true, "Student is reported as active subscriber");
  assert(studentEntitlements.planId === "pro", "Student plan resolved as PRO");
  assert(Boolean(studentEntitlements.expiresAt), "Student expiration date accurately resolved");
  assert(studentEntitlements.entitlements.cbt_corrections === true, "PRO tier unlocks CBT corrections");

  console.log("\n-----------------------------------------------------------------");
  console.log(`RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log("-----------------------------------------------------------------");

  if (failed > 0) {
    process.exit(1);
  }
}

void runSubscriptionSyncTests().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
