import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/app/lib/adminAuth";
import { getSupabaseServerClient } from "@/app/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminSession(request);
    if (!admin) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get("filter") || "all"; // all | unused | used | exported
    const search = (searchParams.get("search") || "").trim();
    const limit = Math.min(Math.max(1, parseInt(searchParams.get("limit") || "100", 10)), 5000);
    const offset = Math.max(0, parseInt(searchParams.get("offset") || "0", 10));

    const supabase = getSupabaseServerClient();

    const buildQuery = (selectCols: string) => {
      let q = supabase
        .from("access_codes")
        .select(selectCols, { count: "exact" })
        .order("created_at", { ascending: false });

      if (filter === "unused") {
        q = q.eq("is_used", false);
      } else if (filter === "used") {
        q = q.eq("is_used", true);
      } else if (filter === "exported") {
        q = q.eq("is_exported", true);
      }

      if (search) {
        q = q.ilike("code", `%${search}%`);
      }

      return q.range(offset, offset + limit - 1);
    };

    let codesData: unknown[] | null = null;
    let countTotal = 0;

    const { data: codesWithPlan, count: countWithPlan, error: errorWithPlan } = await buildQuery(
      "id, code, subject, grants_plan, validity_days, cohort, is_used, used_by, used_at, is_exported, exported_at, created_at"
    );

    if (errorWithPlan) {
      const { data: codesBasic, count: countBasic, error: errorBasic } = await buildQuery(
        "id, code, subject, is_used, used_by, is_exported, exported_at, created_at"
      );
      if (errorBasic) {
        return NextResponse.json({ ok: false, error: errorBasic.message }, { status: 500 });
      }
      codesData = codesBasic;
      countTotal = countBasic || 0;
    } else {
      codesData = codesWithPlan;
      countTotal = countWithPlan || 0;
    }

    const codes = codesData;
    const count = countTotal;

    // Also fetch master code
    const { data: masterRow } = await supabase
      .from("exam_config")
      .select("config_value")
      .eq("config_key", "master_access_code")
      .maybeSingle();

    const masterCode = masterRow?.config_value ? String(masterRow.config_value).trim() : "STAGING-MASTER-TEST-001";

    return NextResponse.json({
      ok: true,
      codes: codes || [],
      total: count || 0,
      masterCode,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed to load access codes" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminSession(request);
    if (!admin) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const action = String(body.action || "").trim(); // reset_code | reset_all | set_master | export_fresh
    const supabase = getSupabaseServerClient();

    if (action === "reset_code") {
      const codeId = body.id;
      if (!codeId) {
        return NextResponse.json({ ok: false, error: "Missing code id" }, { status: 400 });
      }

      const { data, error } = await supabase
        .from("access_codes")
        .update({
          is_used: false,
          used_by: null,
          used_at: null,
        })
        .eq("id", codeId)
        .select()
        .maybeSingle();

      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      }

      await supabase.from("configuration_audit_logs").insert({
        admin_email: admin.email,
        entity_type: "access_codes",
        entity_id: String(codeId),
        action: "updated",
        new_value: { is_used: false, used_by: null },
        change_reason: `Admin reset access code ${data?.code || codeId}`,
      });

      return NextResponse.json({ ok: true, message: `Access code reset successfully.` });
    }

    if (action === "reset_all") {
      // Reset all normal used codes (preserving master code)
      const { data: masterRow } = await supabase
        .from("exam_config")
        .select("config_value")
        .eq("config_key", "master_access_code")
        .maybeSingle();

      const masterCode = masterRow?.config_value ? String(masterRow.config_value).trim().toUpperCase() : "";

      let query = supabase
        .from("access_codes")
        .update({
          is_used: false,
          used_by: null,
          used_at: null,
        })
        .eq("is_used", true);

      if (masterCode) {
        query = query.neq("code", masterCode);
      }

      const { data: updated, error } = await query.select("id");
      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      }

      const count = updated?.length || 0;
      await supabase.from("configuration_audit_logs").insert({
        admin_email: admin.email,
        entity_type: "access_codes",
        entity_id: "all_used",
        action: "updated",
        new_value: { reset_count: count },
        change_reason: `Admin bulk-reset ${count} used access codes`,
      });

      return NextResponse.json({ ok: true, message: `${count} access codes reset successfully.`, count });
    }

    if (action === "set_master") {
      const cleanCode = String(body.code || "").trim().toUpperCase();
      if (!cleanCode) {
        return NextResponse.json({ ok: false, error: "Master code cannot be empty" }, { status: 400 });
      }

      // Upsert master code into exam_config
      const { error: upsertErr } = await supabase
        .from("exam_config")
        .upsert(
          { config_key: "master_access_code", config_value: cleanCode },
          { onConflict: "config_key" }
        );

      if (upsertErr) {
        return NextResponse.json({ ok: false, error: upsertErr.message }, { status: 500 });
      }

      // Ensure master code also exists in access_codes table
      const { data: existing } = await supabase
        .from("access_codes")
        .select("id")
        .eq("code", cleanCode)
        .maybeSingle();

      if (!existing) {
        await supabase.from("access_codes").insert({
          code: cleanCode,
          subject: "Master Exam Bypass",
          is_used: false,
          is_exported: true,
        });
      }

      await supabase.from("configuration_audit_logs").insert({
        admin_email: admin.email,
        entity_type: "exam_config",
        entity_id: "master_access_code",
        action: "updated",
        new_value: { master_code: cleanCode },
        change_reason: `Admin set master access code to ${cleanCode}`,
      });

      return NextResponse.json({ ok: true, message: "Master access code updated successfully.", masterCode: cleanCode });
    }

    if (action === "clear_all") {
      const { data: masterRow } = await supabase
        .from("exam_config")
        .select("config_value")
        .eq("config_key", "master_access_code")
        .maybeSingle();

      const masterCode = masterRow?.config_value ? String(masterRow.config_value).trim().toUpperCase() : "";

      let query = supabase.from("access_codes").delete();
      if (masterCode) {
        query = query.neq("code", masterCode);
      } else {
        query = query.neq("id", "00000000-0000-0000-0000-000000000000");
      }

      const { data: deleted, error } = await query.select("id");
      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      }

      const count = deleted?.length || 0;
      await supabase.from("configuration_audit_logs").insert({
        admin_email: admin.email,
        entity_type: "access_codes",
        entity_id: "all_cleared",
        action: "deleted",
        new_value: { cleared_count: count },
        change_reason: `Admin cleared all ${count} normal access codes preserving master code`,
      });

      return NextResponse.json({ ok: true, message: `All ${count} normal access codes cleared successfully.`, count });
    }

    if (action === "export_fresh") {
      const count = Math.min(Math.max(1, parseInt(body.count || "20", 10)), 500);

      // Select fresh (is_used = false) codes
      const { data: freshCodes, error: fetchErr } = await supabase
        .from("access_codes")
        .select("id, code, subject, created_at")
        .eq("is_used", false)
        .order("created_at", { ascending: false })
        .limit(count);

      if (fetchErr) {
        return NextResponse.json({ ok: false, error: fetchErr.message }, { status: 500 });
      }

      const rows = freshCodes || [];
      if (rows.length > 0) {
        const ids = rows.map((r: { id: string }) => r.id);
        const now = new Date().toISOString();
        await supabase
          .from("access_codes")
          .update({ is_exported: true, exported_at: now })
          .in("id", ids);
      }

      return NextResponse.json({ ok: true, codes: rows });
    }

    return NextResponse.json({ ok: false, error: "Invalid action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed to process access code action" },
      { status: 500 }
    );
  }
}
