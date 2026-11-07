import { NextResponse } from "next/server";
import { getSupabasePublicServerClient } from "../../lib/supabaseServer";
import { CANONICAL_SUBJECT_REGISTRY, type CanonicalSubject } from "@/app/lib/curriculumData";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = getSupabasePublicServerClient();

    // 1. Attempt query from canonical academic_subject_registry
    let canonicalList = CANONICAL_SUBJECT_REGISTRY;
    try {
      const { data: registryRows } = await supabase
        .from("academic_subject_registry")
        .select("id, name, slug, cbt_key, learning_hub_slug, stem_subject_id, category, icon, description, display_order")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (registryRows && registryRows.length > 0) {
        canonicalList = registryRows.map((r) => ({
          id: r.id,
          name: r.name,
          slug: r.slug,
          cbtKey: r.cbt_key,
          learningHubSlug: r.learning_hub_slug,
          stemSubjectId: r.stem_subject_id,
          category: r.category as CanonicalSubject["category"],
          icon: r.icon,
          description: r.description || "",
          displayOrder: r.display_order,
        }));
      }
    } catch {
      // Graceful fallback to static CANONICAL_SUBJECT_REGISTRY
    }

    // 2. Fetch configured subjects from exam_config
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

    // Default to canonical CBT keys if unconfigured
    if (configuredSubjects.length === 0) {
      configuredSubjects = canonicalList.map((s) => s.cbtKey);
    }

    // 3. Query distinct active subjects with questions in database
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
      canonicalRegistry: canonicalList,
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
      canonicalRegistry: CANONICAL_SUBJECT_REGISTRY,
      defaultFour: ["English", "Mathematics", "Physics", "Chemistry"],
    });
  }
}

