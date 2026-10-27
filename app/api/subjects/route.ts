import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = getSupabaseServerClient();

    // 1. Fetch available subjects from exam_config
    const { data: configData } = await supabase
      .from("exam_config")
      .select("config_key, config_value")
      .in("config_key", ["academic_structure", "subjects"]);

    let configuredSubjects: string[] = [];

    const academicCfg = configData?.find((c) => c.config_key === "academic_structure");
    if (academicCfg?.config_value && typeof academicCfg.config_value === "object") {
      const val = academicCfg.config_value as { available_subjects?: string[] };
      if (Array.isArray(val.available_subjects) && val.available_subjects.length > 0) {
        configuredSubjects = val.available_subjects;
      }
    }

    if (configuredSubjects.length === 0) {
      const subjectsCfg = configData?.find((c) => c.config_key === "subjects");
      if (Array.isArray(subjectsCfg?.config_value)) {
        configuredSubjects = subjectsCfg.config_value as string[];
      }
    }

    // Default fallback list if unconfigured
    if (configuredSubjects.length === 0) {
      configuredSubjects = [
        "English",
        "Mathematics",
        "Physics",
        "Chemistry",
        "Biology",
        "Government",
        "Literature in English",
      ];
    }

    // 2. Also query subjects from active questions in database
    const { data: questionRows } = await supabase
      .from("questions")
      .select("subject")
      .eq("is_active", true);

    const dbSubjectSet = new Set<string>();
    if (questionRows) {
      for (const row of questionRows) {
        if (row.subject?.trim()) {
          dbSubjectSet.add(row.subject.trim());
        }
      }
    }

    // Combine configured and DB subjects without duplicates
    const combinedMap = new Map<string, string>();
    for (const subj of configuredSubjects) {
      combinedMap.set(subj.toLowerCase(), subj);
    }
    for (const subj of dbSubjectSet) {
      if (!combinedMap.has(subj.toLowerCase())) {
        combinedMap.set(subj.toLowerCase(), subj);
      }
    }

    const allSubjects = Array.from(combinedMap.values());

    return NextResponse.json({
      ok: true,
      subjects: allSubjects,
      dbSubjectsWithQuestions: Array.from(dbSubjectSet),
      defaultFour: [
        "English",
        allSubjects.includes("Mathematics") ? "Mathematics" : allSubjects[1] || "Mathematics",
        allSubjects.includes("Physics") ? "Physics" : allSubjects[2] || "Physics",
        allSubjects.includes("Chemistry") ? "Chemistry" : allSubjects[3] || "Chemistry",
      ],
    });
  } catch {
    return NextResponse.json({
      ok: true,
      subjects: ["English", "Mathematics", "Physics", "Chemistry", "Biology"],
      defaultFour: ["English", "Mathematics", "Physics", "Chemistry"],
    });
  }
}
