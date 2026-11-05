import { supabase } from "../supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import { INITIAL_STEM_RESOURCES } from "./seedData";

export type StemResourceType =
  | "simulation"
  | "formula_card"
  | "worked_example"
  | "diagram"
  | "experiment";

export type StemResourceStatus = "draft" | "review" | "published" | "archived";

export interface StemResource {
  id: string;
  slug: string;
  title: string;
  summary: string;
  subject_id: string;
  topic_id?: string | null;
  tier: 1 | 2 | 3;
  resource_type: StemResourceType;
  status: StemResourceStatus;
  current_published_version_id?: string | null;
  author_id: string;
  reviewer_id?: string | null;
  reviewed_at?: string | null;
  is_featured: boolean;
  entitlement_tier: "free" | "premium" | "vip";
  tags: string[];
  created_at: string;
  updated_at: string;
  subject?: { id: string; name: string; slug: string };
  topic?: { id: string; title: string; slug: string };
  current_version?: StemResourceVersion | null;
}

export interface StemResourceVersion {
  id: string;
  resource_id: string;
  version_number: number;
  schema_version: number;
  adapter_type: string;
  initial_state: Record<string, unknown>;
  content_payload: Record<string, unknown>;
  learning_objectives: string[];
  created_by: string;
  created_at: string;
}

export interface StemCurriculumMapping {
  id: string;
  resource_id: string;
  exam_body: "JAMB_UTME" | "WAEC_SSCE" | "NECO_SSCE";
  curriculum_topic_id?: string | null;
  syllabus_section?: string | null;
  relevance_weight: number;
}

export interface StemExperimentAttempt {
  id: string;
  resource_version_id: string;
  student_id: string;
  class_id?: string | null;
  assignment_id?: string | null;
  attempt_number: number;
  status: "in_progress" | "completed" | "graded";
  observations: Record<string, unknown>;
  measurements: unknown[];
  conclusion?: string | null;
  tutor_score?: number | null;
  tutor_feedback?: string | null;
  started_at: string;
  submitted_at?: string | null;
}

export interface StemFilterOptions {
  subject_id?: string;
  topic_id?: string;
  tier?: number;
  resource_type?: StemResourceType;
  status?: StemResourceStatus;
  search?: string;
  featured_only?: boolean;
  limit?: number;
}

export async function listStemResources(
  filter?: StemFilterOptions,
  client: SupabaseClient = supabase
): Promise<StemResource[]> {
  try {
    let query = client
      .from("stem_resources")
      .select(`
        *,
        subject:learning_subjects ( id, name, slug ),
        topic:learning_topics ( id, title, slug ),
        current_version:stem_resource_versions!fk_stem_current_version (
          id, version_number, schema_version, adapter_type, initial_state, content_payload, learning_objectives, created_at
        )
      `)
      .order("created_at", { ascending: false });

    if (filter?.status) {
      query = query.eq("status", filter.status);
    }
    if (filter?.subject_id) {
      query = query.eq("subject_id", filter.subject_id);
    }
    if (filter?.topic_id) {
      query = query.eq("topic_id", filter.topic_id);
    }
    if (filter?.tier) {
      query = query.eq("tier", filter.tier);
    }
    if (filter?.resource_type) {
      query = query.eq("resource_type", filter.resource_type);
    }
    if (filter?.featured_only) {
      query = query.eq("is_featured", true);
    }
    if (filter?.search) {
      query = query.ilike("title", `%${filter.search}%`);
    }
    if (filter?.limit) {
      query = query.limit(filter.limit);
    }

    const { data, error } = await query;
    if (data && data.length > 0) {
      return data as unknown as StemResource[];
    }

    // Graceful fallback to verified STEM seed catalog if database has not yet been seeded
    let fallback = [...INITIAL_STEM_RESOURCES];
    if (filter?.status) {
      fallback = fallback.filter((r) => r.status === filter.status);
    }
    if (filter?.subject_id) {
      fallback = fallback.filter((r) => r.subject_id === filter.subject_id || r.subject?.slug === filter.subject_id);
    }
    if (filter?.tier) {
      fallback = fallback.filter((r) => r.tier === filter.tier);
    }
    if (filter?.resource_type) {
      fallback = fallback.filter((r) => r.resource_type === filter.resource_type);
    }
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      fallback = fallback.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.summary.toLowerCase().includes(q) ||
          r.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    if (filter?.featured_only) {
      fallback = fallback.filter((r) => r.is_featured);
    }
    return fallback;
  } catch (err) {
    console.warn("[stemService] Failed to list STEM resources:", err);
    return INITIAL_STEM_RESOURCES;
  }
}

export async function getStemResourceBySlug(
  slug: string,
  client: SupabaseClient = supabase
): Promise<StemResource | null> {
  try {
    const { data, error } = await client
      .from("stem_resources")
      .select(`
        *,
        subject:learning_subjects ( id, name, slug ),
        topic:learning_topics ( id, title, slug ),
        current_version:stem_resource_versions!fk_stem_current_version (
          id, version_number, schema_version, adapter_type, initial_state, content_payload, learning_objectives, created_at
        )
      `)
      .eq("slug", slug.trim().toLowerCase())
      .maybeSingle();

    if (data) return data as unknown as StemResource;

    // Check seed fallback
    const seed = INITIAL_STEM_RESOURCES.find((r) => r.slug === slug.trim().toLowerCase());
    return seed || null;
  } catch (err) {
    console.warn("[stemService] getStemResourceBySlug error:", err);
    const seed = INITIAL_STEM_RESOURCES.find((r) => r.slug === slug.trim().toLowerCase());
    return seed || null;
  }
}

export async function createStemResource(
  input: {
    slug: string;
    title: string;
    summary: string;
    subject_id: string;
    topic_id?: string | null;
    tier?: 1 | 2 | 3;
    resource_type: StemResourceType;
    entitlement_tier?: "free" | "premium" | "vip";
    tags?: string[];
  },
  authorId: string,
  client: SupabaseClient = supabase
): Promise<{ resource: StemResource | null; error: string | null }> {
  try {
    const payload = {
      slug: input.slug.trim().toLowerCase(),
      title: input.title.trim(),
      summary: input.summary.trim(),
      subject_id: input.subject_id,
      topic_id: input.topic_id || null,
      tier: input.tier || 2,
      resource_type: input.resource_type,
      status: "draft",
      author_id: authorId,
      entitlement_tier: input.entitlement_tier || "free",
      tags: input.tags || [],
    };

    const { data, error } = await client
      .from("stem_resources")
      .insert([payload])
      .select()
      .single();

    if (error) return { resource: null, error: error.message };
    return { resource: data as StemResource, error: null };
  } catch (err) {
    return { resource: null, error: err instanceof Error ? err.message : "Creation failed" };
  }
}

export async function createStemResourceVersion(
  resourceId: string,
  versionData: {
    adapter_type: string;
    initial_state: Record<string, unknown>;
    content_payload: Record<string, unknown>;
    learning_objectives?: string[];
  },
  userId: string,
  client: SupabaseClient = supabase
): Promise<{ version: StemResourceVersion | null; error: string | null }> {
  try {
    // 1. Determine next version number
    const { data: latest } = await client
      .from("stem_resource_versions")
      .select("version_number")
      .eq("resource_id", resourceId)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextVersion = (latest?.version_number || 0) + 1;

    const payload = {
      resource_id: resourceId,
      version_number: nextVersion,
      schema_version: 1,
      adapter_type: versionData.adapter_type,
      initial_state: versionData.initial_state,
      content_payload: versionData.content_payload,
      learning_objectives: versionData.learning_objectives || [],
      created_by: userId,
    };

    const { data, error } = await client
      .from("stem_resource_versions")
      .insert([payload])
      .select()
      .single();

    if (error) return { version: null, error: error.message };
    return { version: data as StemResourceVersion, error: null };
  } catch (err) {
    return { version: null, error: err instanceof Error ? err.message : "Version creation failed" };
  }
}

export async function publishStemResourceVersion(
  resourceId: string,
  versionId: string,
  reviewerId: string,
  client: SupabaseClient = supabase
): Promise<{ ok: boolean; error: string | null }> {
  try {
    const now = new Date().toISOString();
    const { error } = await client
      .from("stem_resources")
      .update({
        current_published_version_id: versionId,
        status: "published",
        reviewer_id: reviewerId,
        reviewed_at: now,
      })
      .eq("id", resourceId);

    if (error) return { ok: false, error: error.message };
    return { ok: true, error: null };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Publish failed" };
  }
}

export async function recordStemExperimentAttempt(
  payload: {
    resource_version_id: string;
    student_id: string;
    class_id?: string | null;
    assignment_id?: string | null;
    observations?: Record<string, unknown>;
    measurements?: unknown[];
    conclusion?: string | null;
    status?: "in_progress" | "completed";
  },
  client: SupabaseClient = supabase
): Promise<{ attempt: StemExperimentAttempt | null; error: string | null }> {
  try {
    const { data, error } = await client
      .from("stem_experiment_attempts")
      .insert([
        {
          resource_version_id: payload.resource_version_id,
          student_id: payload.student_id,
          class_id: payload.class_id || null,
          assignment_id: payload.assignment_id || null,
          observations: payload.observations || {},
          measurements: payload.measurements || [],
          conclusion: payload.conclusion || null,
          status: payload.status || "completed",
          submitted_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) return { attempt: null, error: error.message };
    return { attempt: data as StemExperimentAttempt, error: null };
  } catch (err) {
    return { attempt: null, error: err instanceof Error ? err.message : "Attempt submission failed" };
  }
}

export async function listStemExperimentAttempts(
  options: {
    student_id?: string;
    class_id?: string;
    status?: "in_progress" | "completed" | "graded";
    limit?: number;
  } = {},
  client: SupabaseClient = supabase
): Promise<StemExperimentAttempt[]> {
  try {
    let query = client
      .from("stem_experiment_attempts")
      .select(`
        *,
        resource_version:stem_resource_versions (
          id,
          version_number,
          adapter_type,
          resource:stem_resources (
            id,
            title,
            slug,
            subject:subjects (id, name, slug)
          )
        )
      `)
      .order("started_at", { ascending: false });

    if (options.student_id) query = query.eq("student_id", options.student_id);
    if (options.class_id) query = query.eq("class_id", options.class_id);
    if (options.status) query = query.eq("status", options.status);
    if (options.limit) query = query.limit(options.limit);

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as StemExperimentAttempt[];
  } catch (err) {
    console.error("[STEM Service] Error listing attempts:", err);
    return [];
  }
}

export async function gradeStemExperimentAttempt(
  attemptId: string,
  grading: {
    tutor_score: number;
    tutor_feedback: string;
  },
  client: SupabaseClient = supabase
): Promise<{ ok: boolean; error: string | null }> {
  try {
    const { error } = await client
      .from("stem_experiment_attempts")
      .update({
        tutor_score: grading.tutor_score,
        tutor_feedback: grading.tutor_feedback,
        status: "graded",
        updated_at: new Date().toISOString(),
      })
      .eq("id", attemptId);

    if (error) return { ok: false, error: error.message };
    return { ok: true, error: null };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Grading failed" };
  }
}
