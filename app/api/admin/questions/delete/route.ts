import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient, getUserFromRequest } from "../../../../lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];

    const supabase = getSupabaseServerClient(token);

    // Verify user is authenticated
    if (!user) {
      return NextResponse.json(
        { ok: false, message: "Unauthorized. Please sign in as administrator." },
        { status: 401 }
      );
    }

    // Verify admin permission cbt.questions.delete
    const { data: hasPerm, error: permErr } = await supabase.rpc("admin_has_permission", {
      permission_name: "cbt.questions.delete",
    });

    if (permErr || !hasPerm) {
      return NextResponse.json(
        { ok: false, message: "Forbidden. You do not have permission to delete questions (cbt.questions.delete)." },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const questionIds: number[] = Array.isArray(body.questionIds)
      ? body.questionIds.map(Number).filter((n: number) => !isNaN(n) && n > 0)
      : body.questionId && !isNaN(Number(body.questionId))
      ? [Number(body.questionId)]
      : [];

    if (questionIds.length === 0) {
      return NextResponse.json(
        { ok: false, message: "No valid question IDs provided for deletion." },
        { status: 400 }
      );
    }

    // Safety check: ensure ALL target questions are DEACTIVATED (is_active is false)
    const { data: targetRows, error: fetchErr } = await supabase
      .from("questions")
      .select("id, is_active, subject, section")
      .in("id", questionIds);

    if (fetchErr) {
      return NextResponse.json(
        { ok: false, message: `Could not verify question status: ${fetchErr.message}` },
        { status: 500 }
      );
    }

    if (!targetRows || targetRows.length === 0) {
      return NextResponse.json(
        { ok: false, message: "No matching questions found in question bank." },
        { status: 404 }
      );
    }

    // Check if any of the target questions is currently active
    const activeQuestions = targetRows.filter((q) => q.is_active);
    if (activeQuestions.length > 0) {
      const activeIds = activeQuestions.map((q) => `#${q.id}`).join(", ");
      return NextResponse.json(
        {
          ok: false,
          message: `Deletion rejected: question(s) ${activeIds} are currently Active. Only deactivated questions can be permanently deleted. Please deactivate them first.`,
        },
        { status: 400 }
      );
    }

    const verifiedIds = targetRows.filter((q) => !q.is_active).map((q) => q.id);

    // Delete in batches of 500
    let deletedCount = 0;
    for (let i = 0; i < verifiedIds.length; i += 500) {
      const batch = verifiedIds.slice(i, i + 500);
      const { error: delErr } = await supabase
        .from("questions")
        .delete()
        .in("id", batch)
        .eq("is_active", false);

      if (delErr) {
        return NextResponse.json(
          { ok: false, message: `Deletion error: ${delErr.message}. ${deletedCount} questions were deleted.` },
          { status: 500 }
        );
      }
      deletedCount += batch.length;
    }

    return NextResponse.json({
      ok: true,
      message: `Successfully and permanently deleted ${deletedCount} deactivated question(s).`,
      deletedCount,
      deletedIds: verifiedIds,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unexpected server error";
    return NextResponse.json({ ok: false, message: msg }, { status: 500 });
  }
}
