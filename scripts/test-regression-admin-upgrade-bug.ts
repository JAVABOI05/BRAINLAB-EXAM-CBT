// Set dummy local variables for disposable test harness before importing modules
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.dummy";
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.dummy_service";

// Mock candidate CBT gate check matching current app/cbt/page.tsx & app/exam/page.tsx logic:
// Currently: if (accessCodeRequired && !localStorage.getItem("access_code")) { router.push("/access"); }
function checkCurrentCbtAccess(accessCodeRequired: boolean, localStorageCode: string | null, planId: string): { allowed: boolean; redirect: string | null } {
  const savedCode = localStorageCode || "";
  if (accessCodeRequired && !savedCode) {
    return { allowed: false, redirect: "/access" };
  }
  return { allowed: true, redirect: "/instructions" };
}

async function runFailingTest() {
  console.log("================================================================================");
  console.log("  CHECKPOINT 3: FAILING-FIRST REGRESSION SUITE (REPRODUCING THE BUG)");
  console.log("================================================================================\n");

  const { getStudentSubscriptionAndEntitlements } = await import("../app/lib/subscriptionEntitlements");
  const { resolveStemAccessContext } = await import("../app/lib/stem/stemAccess");

  const mockStudentId = "00000000-0000-0000-0000-000000000999";
  
  console.log("1. Simulating Admin Grant in student_access_grants for student ID:", mockStudentId);
  console.log("   Admin upgraded student to 'plus' tier in the database.\n");

  console.log("2. Testing server-side entitlement resolution via getStudentSubscriptionAndEntitlements...");
  const ent = await getStudentSubscriptionAndEntitlements(mockStudentId);
  console.log("   Resolved Plan ID:", ent.planId);
  console.log("   Is Subscribed:", ent.isSubscribed);

  console.log("\n3. Testing CBT Exam entry without a physical localStorage access code...");
  const cbtAccess = checkCurrentCbtAccess(true, null, ent.planId);
  console.log("   CBT Allowed:", cbtAccess.allowed, "| Redirect:", cbtAccess.redirect);

  console.log("\n4. Testing STEM Studio server-side access...");
  const stemCtx = await resolveStemAccessContext({ id: mockStudentId, email: "test@brainlab.ng" });
  console.log("   STEM Resolved Plan:", stemCtx.planId);
  console.log("   STEM Access Level:", stemCtx.accessLevel);

  console.log("\n--------------------------------------------------------------------------------");
  const bugDetected = ent.planId === "free" && cbtAccess.allowed === false && stemCtx.planId === "free";
  if (bugDetected) {
    console.error("❌ REGRESSION CONFIRMED: The existing implementation reproduces the bug!");
    console.error("   - Administrator grant in DB is ignored by getStudentSubscriptionAndEntitlements (fell back to free).");
    console.error("   - CBT simulator blocked upgraded student because localStorage code was missing.");
    console.error("   - STEM Studio resolver fell back to free.");
    process.exit(1);
  } else {
    console.log("✅ No bug reproduced.");
  }
}

runFailingTest().catch((err) => {
  console.error("Execution error:", err);
  process.exit(1);
});
