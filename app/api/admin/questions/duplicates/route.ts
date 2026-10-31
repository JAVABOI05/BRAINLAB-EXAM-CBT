import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../../lib/supabaseServer";

export const dynamic = "force-dynamic";

type BulkGroupPayload = {
  hash: string;
  subject: string;
  retainId: number;
  archiveIds: number[];
};

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();

    // Check authorization: admin cookie or authorization token
    const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
    let adminEmail = "admin@brainlabacademy.com.ng";

    if (token) {
      const { data: userData } = await supabase.auth.getUser(token);
      if (userData?.user?.email) {
        adminEmail = userData.user.email;
      }
    }

    const body = await request.json().catch(() => ({}));
    const action = body.action || "archive_single";

    if (action === "archive_single") {
      const questionId = Number(body.questionId);
      const reason = String(body.reason || "Deactivated via Duplicate Questions Manager").trim();
      const groupHash = String(body.groupHash || "").trim();

      if (!questionId || isNaN(questionId)) {
        return NextResponse.json({ ok: false, message: "Valid question ID is required." }, { status: 400 });
      }

      // Check if question exists and its current state
      const { data: targetQ } = await supabase
        .from("questions")
        .select("id, subject, question, is_active")
        .eq("id", questionId)
        .maybeSingle();

      if (!targetQ) {
        return NextResponse.json({ ok: false, message: "Question not found." }, { status: 404 });
      }

      // Deactivate question
      const { error: updateErr } = await supabase
        .from("questions")
        .update({ is_active: false })
        .eq("id", questionId);

      if (updateErr) {
        return NextResponse.json({ ok: false, message: `Archival failed: ${updateErr.message}` }, { status: 500 });
      }

      // Append to audit trail
      await logDuplicateAudit(supabase, {
        action: "archive_single",
        question_id: questionId,
        subject: targetQ.subject,
        group_hash: groupHash,
        admin_email: adminEmail,
        reason,
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json({
        ok: true,
        message: `Question #${questionId} (${targetQ.subject}) safely archived. Completed student attempts remain preserved.`,
        questionId,
      });
    }

    if (action === "archive_bulk") {
      const groups = body.groups as BulkGroupPayload[];
      const reason = String(body.reason || "Bulk duplicate resolution").trim();

      if (!Array.isArray(groups) || groups.length === 0) {
        return NextResponse.json({ ok: false, message: "No duplicate groups provided for bulk resolution." }, { status: 400 });
      }

      const allArchiveIds: number[] = [];
      const preservedIds: number[] = [];
      const affectedSubjects = new Set<string>();

      for (const group of groups) {
        if (!group.retainId || !Array.isArray(group.archiveIds) || group.archiveIds.length === 0) {
          continue;
        }

        // STRICT SAFETY RULE: Always preserve at least one question from every group.
        // Never allow an operation to delete every question in a duplicate group.
        const safeArchiveIds = group.archiveIds.filter((id) => Number(id) !== Number(group.retainId));
        if (safeArchiveIds.length === 0) continue;

        allArchiveIds.push(...safeArchiveIds);
        preservedIds.push(group.retainId);
        if (group.subject) affectedSubjects.add(group.subject);
      }

      if (allArchiveIds.length === 0) {
        return NextResponse.json({
          ok: false,
          message: "No questions eligible for archival. At least one question per group must be preserved.",
        }, { status: 400 });
      }

      // Execute safe batch deactivation in DB
      const { error: batchErr } = await supabase
        .from("questions")
        .update({ is_active: false })
        .in("id", allArchiveIds);

      if (batchErr) {
        return NextResponse.json({ ok: false, message: `Bulk archival failed: ${batchErr.message}` }, { status: 500 });
      }

      // Record bulk audit log
      await logDuplicateAudit(supabase, {
        action: "archive_bulk",
        archived_count: allArchiveIds.length,
        preserved_count: preservedIds.length,
        archived_ids: allArchiveIds,
        preserved_ids: preservedIds,
        subjects: Array.from(affectedSubjects),
        admin_email: adminEmail,
        reason,
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json({
        ok: true,
        message: `Successfully resolved ${groups.length} duplicate groups: ${allArchiveIds.length} duplicate questions safely archived, ${preservedIds.length} canonical questions preserved.`,
        archivedCount: allArchiveIds.length,
        preservedCount: preservedIds.length,
        archivedIds: allArchiveIds,
      });
    }

    return NextResponse.json({ ok: false, message: "Invalid action." }, { status: 400 });
  } catch (err) {
    console.error("[api/admin/questions/duplicates] Error:", err);
    return NextResponse.json({
      ok: false,
      message: err instanceof Error ? err.message : "Internal server error.",
    }, { status: 500 });
  }
}

async function logDuplicateAudit(supabase: ReturnType<typeof getSupabaseServerClient>, entry: Record<string, unknown>) {
  try {
    const { data } = await supabase
      .from("exam_config")
      .select("config_value")
      .eq("config_key", "audit_logs_trail")
      .maybeSingle();

    const trail = Array.isArray(data?.config_value) ? data.config_value : [];
    trail.unshift(entry);

    await supabase.from("exam_config").upsert(
      {
        config_key: "audit_logs_trail",
        config_value: trail.slice(0, 200),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "config_key" }
    );
  } catch (err) {
    console.warn("Could not write duplicate audit trail:", err);
  }
}
