"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import { getAdminSession, type AdminUser } from "../../lib/adminAuth";
import "../admin.css";

interface SubjectSummary {
  id: string;
  name: string;
  slug: string;
  topicCount: number;
  publishedTopicCount: number;
  contentItemCount: number;
  mcqCount: number;
  unreviewedCount: number;
  coverageStatus: "complete" | "partial" | "needs_attention";
}

interface GapAlert {
  id: string;
  subjectName: string;
  topicTitle: string;
  topicId: string;
  issue: string;
  severity: "high" | "medium" | "low";
  recommendation: string;
}

export default function ContentIntelligenceAdminPage() {
  const router = useRouter();
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [summaries, setSummaries] = useState<SubjectSummary[]>([]);
  const [gapAlerts, setGapAlerts] = useState<GapAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  const loadIntelligenceData = useCallback(async () => {
    setLoading(true);

    try {
      const [subjectsRes, topicsRes, itemsRes] = await Promise.all([
        supabase.from("learning_subjects").select("id, name, slug, is_published"),
        supabase.from("learning_topics").select("id, subject_id, title, is_published"),
        supabase.from("learning_topic_content_items").select("id, topic_id, content_type, is_published, ai_metadata"),
      ]);

      const subjects = subjectsRes.data || [];
      const topics = topicsRes.data || [];
      const items = itemsRes.data || [];

      const calculatedSummaries: SubjectSummary[] = subjects.map((sub) => {
        const subTopics = topics.filter((t) => t.subject_id === sub.id);
        const subTopicIds = new Set(subTopics.map((t) => t.id));
        const subItems = items.filter((i) => subTopicIds.has(i.topic_id));
        const publishedTopics = subTopics.filter((t) => t.is_published);
        const mcqItems = subItems.filter((i) => i.content_type === "in_class_mcq");
        const unreviewedItems = subItems.filter((i) => i.ai_metadata?.review_status === "unreviewed");

        let status: "complete" | "partial" | "needs_attention" = "complete";
        if (subTopics.length === 0 || mcqItems.length < subTopics.length * 0.5) {
          status = "needs_attention";
        } else if (publishedTopics.length < subTopics.length) {
          status = "partial";
        }

        return {
          id: sub.id,
          name: sub.name,
          slug: sub.slug,
          topicCount: subTopics.length,
          publishedTopicCount: publishedTopics.length,
          contentItemCount: subItems.length,
          mcqCount: mcqItems.length,
          unreviewedCount: unreviewedItems.length,
          coverageStatus: status,
        };
      });

      setSummaries(calculatedSummaries);

      // Compute Syllabus Gap Alerts
      const alerts: GapAlert[] = [];
      for (const t of topics) {
        const topicItems = items.filter((i) => i.topic_id === t.id);
        const sub = subjects.find((s) => s.id === t.subject_id);
        const subName = sub?.name || "Subject";

        if (topicItems.length === 0) {
          alerts.push({
            id: `gap_empty_${t.id}`,
            subjectName: subName,
            topicTitle: t.title,
            topicId: t.id,
            issue: "Empty topic: No study notes or learning materials created yet.",
            severity: "high",
            recommendation: "Use the AI Lesson Builder in Topic Studio to draft foundational notes.",
          });
        } else if (!topicItems.some((i) => i.content_type === "in_class_mcq")) {
          alerts.push({
            id: `gap_no_mcq_${t.id}`,
            subjectName: subName,
            topicTitle: t.title,
            topicId: t.id,
            issue: "Missing formative assessment: No in-class MCQ checkpoint available.",
            severity: "medium",
            recommendation: "Generate 3-4 practice questions from the study notes.",
          });
        }
      }

      setGapAlerts(alerts);
    } catch {
      // Handle error gracefully
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    async function checkAuth() {
      const admin = await getAdminSession();
      if (!admin) {
        router.replace("/account");
        return;
      }
      setAdminUser(admin);
      await loadIntelligenceData();
    }
    checkAuth();
  }, [router, loadIntelligenceData]);

  const totalTopics = summaries.reduce((acc, s) => acc + s.topicCount, 0);
  const totalItems = summaries.reduce((acc, s) => acc + s.contentItemCount, 0);
  const totalMcqs = summaries.reduce((acc, s) => acc + s.mcqCount, 0);

  return (
    <main className="admin-page">
      <div className="admin-container">
        <section className="admin-hero">
          <div className="admin-hero-top">
            <div>
              <div className="admin-badge">Intelligence · Syllabus Coverage &amp; Gap Detection</div>
              <h1 className="admin-title">Content Intelligence</h1>
              <p className="admin-subtitle">
                Analyze curriculum completeness, detect topics lacking practice questions, monitor unreviewed AI generations, and track exam coverage.
              </p>
            </div>
            <div className="admin-actions">
              <button onClick={() => router.push("/admin/content")} className="admin-btn-primary">
                Content Manager
              </button>
              <button onClick={() => router.push("/admin/dashboard")} className="admin-btn-light">
                Dashboard
              </button>
            </div>
          </div>
        </section>

        {/* Aggregate Stats */}
        <section className="admin-section admin-stats">
          <div className="admin-stat-card">
            <p className="admin-stat-label">Total Curriculum Topics</p>
            <p className="admin-stat-value">{totalTopics}</p>
          </div>
          <div className="admin-stat-card">
            <p className="admin-stat-label">Total Content Resources</p>
            <p className="admin-stat-value text-indigo-700">{totalItems}</p>
          </div>
          <div className="admin-stat-card">
            <p className="admin-stat-label">Formative MCQ Checkpoints</p>
            <p className="admin-stat-value text-emerald-700">{totalMcqs}</p>
          </div>
          <div className="admin-stat-card">
            <p className="admin-stat-label">Detected Syllabus Gaps</p>
            <p className="admin-stat-value text-amber-600">{gapAlerts.length}</p>
          </div>
        </section>

        {/* Syllabus Gap Alerts */}
        {gapAlerts.length > 0 && (
          <section className="admin-section admin-card mb-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="admin-card-title">Priority Syllabus Gaps ({gapAlerts.length})</h2>
                <p className="admin-card-text">
                  Actionable items requiring tutor authoring or assessment generation.
                </p>
              </div>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900 border border-amber-200">
                Action Required
              </span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {gapAlerts.slice(0, 6).map((gap) => (
                <div
                  key={gap.id}
                  className={`flex flex-col justify-between rounded-2xl border p-4 text-xs ${
                    gap.severity === "high"
                      ? "border-rose-200 bg-rose-50/60"
                      : "border-amber-200 bg-amber-50/60"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">
                        {gap.subjectName} · {gap.topicTitle}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${
                          gap.severity === "high" ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {gap.severity} Priority
                      </span>
                    </div>
                    <p className="mt-2 text-slate-700">{gap.issue}</p>
                    <p className="mt-1 text-[11px] text-slate-500 font-medium">
                      💡 {gap.recommendation}
                    </p>
                  </div>

                  <div className="mt-4 pt-2 border-t border-slate-200/50">
                    <Link
                      href={`/admin/content/topic/${gap.topicId}`}
                      className="font-bold text-indigo-700 hover:underline"
                    >
                      Open Topic Studio →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Subject Breakdown Table */}
        <section className="admin-section admin-card">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="admin-card-title">Curriculum Coverage by Subject</h2>
              <p className="admin-card-text">Status of learning resources across subjects.</p>
            </div>
          </div>

          {loading ? (
            <p className="py-8 text-center text-xs font-semibold text-slate-500">
              Analyzing curriculum content density...
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="py-3 px-3">Subject</th>
                    <th className="py-3 px-3">Topics (Published/Total)</th>
                    <th className="py-3 px-3">Content Items</th>
                    <th className="py-3 px-3">MCQ Checkpoints</th>
                    <th className="py-3 px-3">Coverage Health</th>
                    <th className="py-3 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {summaries.map((sub) => (
                    <tr key={sub.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-3 font-bold text-slate-900">{sub.name}</td>
                      <td className="py-3 px-3">
                        {sub.publishedTopicCount} / {sub.topicCount}
                      </td>
                      <td className="py-3 px-3 font-semibold text-indigo-700">
                        {sub.contentItemCount} items
                      </td>
                      <td className="py-3 px-3 font-semibold text-emerald-700">
                        {sub.mcqCount} quizzes
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                            sub.coverageStatus === "complete"
                              ? "bg-emerald-100 text-emerald-800"
                              : sub.coverageStatus === "partial"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {sub.coverageStatus === "complete"
                            ? "Healthy"
                            : sub.coverageStatus === "partial"
                            ? "In Progress"
                            : "Gaps Detected"}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <Link
                          href="/admin/content"
                          className="font-bold text-indigo-700 hover:underline"
                        >
                          View Topics →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
