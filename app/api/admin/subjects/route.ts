import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient, getUserFromRequest } from "../../../lib/supabaseServer";

export const dynamic = "force-dynamic";

async function verifyAdminAccess(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) return { isAuthorized: false, user: null };

  const supabase = getSupabaseServerClient();
  const { data: adminRecord } = await supabase
    .from("admin_users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const isAuthorized = Boolean(
    adminRecord &&
      ["super_admin", "platform_admin", "exam_admin", "content_reviewer", "teacher"].includes(adminRecord.role)
  );

  return { isAuthorized, user, role: adminRecord?.role };
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();

    // 1. Fetch configured subjects
    const { data: configData } = await supabase
      .from("exam_config")
      .select("config_key, config_value")
      .in("config_key", ["academic_structure", "subjects"]);

    let subjects: string[] = [];

    const academicCfg = configData?.find((c) => c.config_key === "academic_structure");
    if (academicCfg?.config_value && typeof academicCfg.config_value === "object") {
      const val = academicCfg.config_value as { available_subjects?: string[] };
      if (Array.isArray(val.available_subjects) && val.available_subjects.length > 0) {
        subjects = val.available_subjects;
      }
    }

    if (subjects.length === 0) {
      const subjectsCfg = configData?.find((c) => c.config_key === "subjects");
      if (Array.isArray(subjectsCfg?.config_value)) {
        subjects = subjectsCfg.config_value as string[];
      }
    }

    if (subjects.length === 0) {
      subjects = ["English", "Mathematics", "Physics", "Chemistry", "Biology"];
    }

    // 2. Query question count per subject in public.questions
    const { data: questionData } = await supabase
      .from("questions")
      .select("subject")
      .eq("is_active", true);

    const counts: Record<string, number> = {};
    if (questionData) {
      for (const row of questionData) {
        if (row.subject) {
          counts[row.subject] = (counts[row.subject] || 0) + 1;
        }
      }
    }

    const subjectStats = subjects.map((name) => ({
      name,
      questionCount: counts[name] || 0,
    }));

    return NextResponse.json({
      ok: true,
      subjects,
      subjectStats,
      totalQuestions: questionData?.length || 0,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed to load subjects" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { isAuthorized, user } = await verifyAdminAccess(request);
    if (!isAuthorized) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized. Administrator access required to modify subjects." },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { action, subject, oldName, newName, subjectsList } = body;

    const supabase = getSupabaseServerClient();

    // Fetch existing academic structure
    const { data: academicRow } = await supabase
      .from("exam_config")
      .select("config_value")
      .eq("config_key", "academic_structure")
      .maybeSingle();

    let academicConfig: {
      current_session: string;
      classes: string[];
      curricula: string[];
      available_subjects: string[];
    } = {
      current_session: "2026/2027",
      classes: ["SS1", "SS2", "SS3", "UTME Candidate", "Post-UTME"],
      curricula: ["JAMB UTME", "WAEC SSCE", "NECO"],
      available_subjects: ["English", "Mathematics", "Physics", "Chemistry", "Biology"],
    };

    if (academicRow?.config_value && typeof academicRow.config_value === "object") {
      academicConfig = {
        ...academicConfig,
        ...(academicRow.config_value as Record<string, unknown>),
      };
    }

    let nextSubjects = [...academicConfig.available_subjects];

    if (action === "add_subject") {
      const cleanName = String(subject || "").trim();
      if (!cleanName) {
        return NextResponse.json({ ok: false, error: "Subject name is required." }, { status: 400 });
      }
      if (nextSubjects.some((s) => s.toLowerCase() === cleanName.toLowerCase())) {
        return NextResponse.json({ ok: false, error: `Subject "${cleanName}" already exists.` }, { status: 400 });
      }
      nextSubjects.push(cleanName);
    } else if (action === "update_subject") {
      const cleanOld = String(oldName || "").trim();
      const cleanNew = String(newName || "").trim();
      if (!cleanOld || !cleanNew) {
        return NextResponse.json(
          { ok: false, error: "Both old name and new name are required to rename a subject." },
          { status: 400 }
        );
      }
      nextSubjects = nextSubjects.map((s) => (s.toLowerCase() === cleanOld.toLowerCase() ? cleanNew : s));

      // Also update questions in database if requested
      await supabase.from("questions").update({ subject: cleanNew }).eq("subject", cleanOld);
    } else if (action === "delete_subject") {
      const cleanName = String(subject || "").trim();
      nextSubjects = nextSubjects.filter((s) => s.toLowerCase() !== cleanName.toLowerCase());
    } else if (action === "reorder_subjects" && Array.isArray(subjectsList)) {
      nextSubjects = subjectsList.map((s) => String(s).trim()).filter(Boolean);
    } else if (action === "sync_batch_subjects" && Array.isArray(body.subjects)) {
      const incoming: string[] = body.subjects;
      for (const raw of incoming) {
        const clean = String(raw || "").trim();
        if (clean && !nextSubjects.some((s) => s.toLowerCase() === clean.toLowerCase())) {
          nextSubjects.push(clean);
        }
      }
    }

    // Save back to exam_config: academic_structure AND subjects
    academicConfig.available_subjects = nextSubjects;

    await supabase.from("exam_config").upsert(
      [
        {
          config_key: "academic_structure",
          config_value: academicConfig,
          updated_at: new Date().toISOString(),
        },
        {
          config_key: "subjects",
          config_value: nextSubjects,
          updated_at: new Date().toISOString(),
        },
      ],
      { onConflict: "config_key" }
    );

    return NextResponse.json({
      ok: true,
      message: "Subjects successfully updated.",
      subjects: nextSubjects,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed to process subject request" },
      { status: 500 }
    );
  }
}
