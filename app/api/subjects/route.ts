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

    // Filter out Economics until admin adds questions for it
    return NextResponse.json({
      ok: true,
      subjects: configuredSubjects,
      defaultFour: [
        "English",
        configuredSubjects.includes("Mathematics") ? "Mathematics" : configuredSubjects[1] || "Mathematics",
        configuredSubjects.includes("Physics") ? "Physics" : configuredSubjects[2] || "Physics",
        configuredSubjects.includes("Chemistry") ? "Chemistry" : configuredSubjects[3] || "Chemistry",
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
