import { getSupabaseServerClient } from "../app/lib/supabaseServer";

async function inspectDb() {
  const supabase = getSupabaseServerClient();
  const dbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "UNKNOWN";
  const projectRef = dbUrl.replace(/^https?:\/\//, "").split(".")[0];
  
  console.log("=================================================================");
  console.log("DATABASE ENVIRONMENT & MIGRATION STATUS REPORT");
  console.log("=================================================================");
  console.log(`Target Supabase URL: ${dbUrl}`);
  console.log(`Project Ref: ${projectRef}`);
  console.log(`Identified Environment: ${projectRef === "eusgwsuoloomphebrepe" ? "BrainLabCBT-Staging (STAGING)" : projectRef === "bupkyppvtkrmzmluzjmf" ? "BrainLabCBT (PRODUCTION)" : "CUSTOM / UNKNOWN"}`);
  console.log("-----------------------------------------------------------------");

  // Inspect key database tables
  const tablesToCheck = [
    "access_codes",
    "user_subscriptions",
    "learning_entitlements",
    "subscription_plans",
    "payment_transactions",
    "configuration_audit_logs",
    "cbt_question_blueprints",
    "learning_lessons",
    "admin_users",
    "profiles",
  ];

  console.log("\n1. Key Tables Verification:");
  for (const table of tablesToCheck) {
    const { error, count } = await supabase.from(table).select("*", { count: "exact", head: true });
    if (error) {
      console.log(`  ❌ ${table}: Error (${error.message})`);
    } else {
      console.log(`  ✅ ${table}: Exists (Row count: ${count ?? 0})`);
    }
  }

  // Inspect critical RPC functions
  console.log("\n2. Key Database RPC Functions Verification:");
  const rpcsToCheck = [
    { name: "admin_grant_candidate_subscription", params: { p_user_id: "00000000-0000-0000-0000-000000000000", p_plan_id: "premium", p_duration_days: 1 } },
    { name: "redeem_plan_voucher", params: { p_code: "NONEXISTENT-TEST-CODE" } },
    { name: "get_authoritative_learner_entitlements", params: { p_user_id: "00000000-0000-0000-0000-000000000000" } },
    { name: "get_admin_role", params: {} },
  ];

  for (const rpc of rpcsToCheck) {
    const { data, error } = await supabase.rpc(rpc.name, rpc.params);
    // If error is 42883 "function does not exist", it's missing. If error is validation/not found, it exists!
    if (error && error.code === "42883") {
      console.log(`  ❌ RPC ${rpc.name}: NOT FOUND in database`);
    } else {
      console.log(`  ✅ RPC ${rpc.name}: Present and executable (Response/Code: ${error ? error.code || error.message : "OK"})`);
    }
  }

  // Inspect schema migrations table if accessible
  console.log("\n3. Schema Migrations Table Check:");
  const { data: migrations, error: migErr } = await supabase.from("schema_migrations").select("*");
  if (migErr) {
    console.log(`  ℹ️  public.schema_migrations not exposed over PostgREST (${migErr.message})`);
  } else {
    console.log(`  ✅ schema_migrations records found: ${migrations?.length || 0}`);
  }
}

inspectDb().catch((err) => {
  console.error("Inspection fatal error:", err);
  process.exit(1);
});
