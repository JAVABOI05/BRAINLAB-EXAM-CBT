"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabase";

type Topic = { id: string; title: string; slug: string; description: string | null; order_index: number; is_published: boolean };
type Lesson = { id: string; topic_id: string; title: string; is_published: boolean; order_index: number };

function slugify(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export default function TutorTopicsPage() {
  const params = useParams<{ subjectId: string }>();
  const subjectId = params.subjectId;
  const [subject, setSubject] = useState<{ id: string; name: string; slug: string; is_published: boolean } | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [role, setRole] = useState("reviewer");
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [lessonTitles, setLessonTitles] = useState<Record<string, string>>({});

  async function refresh(subjectRecord?: { id: string; name: string; slug: string; is_published: boolean }) {
    const currentSubject = subjectRecord ?? subject;
    if (!currentSubject) return;
    const { data: topicRows, error: topicError } = await supabase
      .from("learning_topics")
      .select("id,title,slug,description,order_index,is_published")
      .eq("subject_id", subjectId)
      .order("order_index", { ascending: true });
    if (topicError) throw topicError;
    const ids = (topicRows ?? []).map((item) => item.id);
    if (ids.length) {
      const { data: lessonRows, error: lessonError } = await supabase
        .from("learning_lessons")
        .select("id,topic_id,title,is_published,order_index")
        .in("topic_id", ids)
        .order("order_index", { ascending: true });
      if (lessonError) throw lessonError;
      setLessons((lessonRows ?? []) as Lesson[]);
    } else setLessons([]);
    setTopics((topicRows ?? []) as Topic[]);
  }

  useEffect(() => {
    let active = true;
    async function load() {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (!active) return;
      const user = sessionData.session?.user;
      if (sessionError || !user) {
        setError("Sign in with an authorized BrainLab account to open this workspace.");
        setLoading(false);
        return;
      }
      setUserId(user.id);
      const { data: subjectData, error: subjectError } = await supabase
        .from("learning_subjects").select("id,name,slug,is_published").eq("id", subjectId).maybeSingle();
      if (!active) return;
      if (subjectError || !subjectData) {
        setError("This subject was not found or you do not have permission to view it.");
        setLoading(false);
        return;
      }
      const { data: membership, error: membershipError } = await supabase
        .from("learning_subject_memberships").select("membership_role")
        .eq("subject_id", subjectId).eq("user_id", user.id).maybeSingle();
      const adminRole = await supabase.rpc("get_admin_role");
      if (!active) return;
      const admin = !adminRole.error && ["super_admin", "platform_admin"].includes(String(adminRole.data ?? ""));
      if (membershipError || (!membership && !admin)) {
        setError("Your account has not been assigned to this subject.");
        setLoading(false);
        return;
      }
      const currentRole = admin ? "admin" : membership?.membership_role ?? "reviewer";
      setRole(currentRole);
      setCanManage(admin || currentRole === "tutor");
      setSubject(subjectData);
      try { await refresh(subjectData); }
      catch { if (active) setError("We could not load topics and lessons."); }
      if (active) setLoading(false);
    }
    void load();
    return () => { active = false; };
  }, [subjectId]);

  async function createTopic(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!subject || !userId || !canManage) return;
    const cleanTitle = title.trim();
    const slug = slugify(cleanTitle);
    if (!cleanTitle || !slug) {
      setError("Enter a topic title using letters or numbers.");
      return;
    }
    setSaving(true); setError(""); setMessage("");
    const { error: insertError } = await supabase.from("learning_topics").insert({
      subject_id: subject.id,
      title: cleanTitle,
      slug,
      description: description.trim() || null,
      order_index: topics.length,
      is_published: false,
      created_by: userId,
    });
    if (insertError) setError(insertError.code === "23505" ? "A topic with this slug already exists in the subject." : "The topic could not be created. Check your permission and try again.");
    else {
      setTitle(""); setDescription(""); setMessage("Topic saved as a draft.");
      try { await refresh(); } catch { setError("Topic created, but the list could not refresh."); }
    }
    setSaving(false);
  }

  async function toggleTopic(topic: Topic) {
    if (!canManage) return;
    setSaving(true); setError(""); setMessage("");
    const { error: updateError } = await supabase.from("learning_topics")
      .update({ is_published: !topic.is_published }).eq("id", topic.id);
    if (updateError) setError("The topic status could not be changed.");
    else {
      setMessage(topic.is_published ? "Topic returned to draft." : "Topic published. Publish at least one lesson before learners can study it.");
      try { await refresh(); } catch { setError("Status changed, but the list could not refresh."); }
    }
    setSaving(false);
  }

  async function createLesson(topic: Topic) {
    if (!canManage || !userId) return;
    const cleanTitle = (lessonTitles[topic.id] ?? "").trim();
    if (!cleanTitle) { setError("Enter a lesson title first."); return; }
    setSaving(true); setError(""); setMessage("");
    const order = lessons.filter((lesson) => lesson.topic_id === topic.id).length;
    const { data, error: insertError } = await supabase.from("learning_lessons").insert({
      topic_id: topic.id,
      title: cleanTitle,
      order_index: order,
      is_published: false,
      created_by: userId,
    }).select("id").single();
    if (insertError || !data) setError("The lesson draft could not be created. Check your permission and try again.");
    else window.location.href = `/tutor/lessons/${data.id}/builder`;
    setSaving(false);
  }

  return (
    <main id="main" className="mx-auto min-h-[65vh] max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
      <Link href="/tutor" className="text-sm font-bold text-blue-800 underline underline-offset-4">← Tutor dashboard</Link>
      {loading && <p className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 text-slate-600" role="status">Loading subject workspace…</p>}
      {!loading && error && !subject && <div role="alert" className="mt-8 rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-900">{error}<p className="mt-3"><Link href="/account" className="font-bold underline underline-offset-4">Sign in</Link></p></div>}
      {!loading && subject && (
        <>
          <header className="mt-6 rounded-3xl bg-[#061a3a] p-7 text-white sm:p-9">
            <p className="text-xs font-extrabold uppercase tracking-[0.15em] text-cyan-200">Subject organizer · {role === "admin" ? "Administrator" : role}</p>
            <h1 className="mt-3 text-3xl font-black sm:text-4xl">{subject.name}</h1>
            <p className="mt-3 leading-7 text-blue-100">Create topics, add lessons, and publish only after the content has been checked. Drafts are not shown to learners.</p>
          </header>

          {canManage && <form onSubmit={createTopic} className="mt-7 rounded-3xl border border-slate-200 bg-white p-5 sm:p-7">
            <h2 className="text-xl font-extrabold text-slate-950">Create a topic</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-bold text-slate-800">Topic title<input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={255} required placeholder="e.g. Fractions and ratios" className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-3 font-normal outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100" /></label>
              <label className="block text-sm font-bold text-slate-800">Short description (optional)<input value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500} placeholder="What will learners understand?" className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-3 font-normal outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100" /></label>
            </div>
            <button disabled={saving} className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#012153] px-5 py-3 font-bold text-white disabled:opacity-50">{saving ? "Saving…" : "Save topic as draft"}</button>
          </form>}

          {(error || message) && <p role={error ? "alert" : "status"} className={`mt-4 rounded-xl p-4 text-sm font-semibold ${error ? "bg-rose-50 text-rose-900" : "bg-emerald-50 text-emerald-900"}`}>{error || message}</p>}

          <section className="mt-9"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-2xl font-extrabold text-slate-950">Topics</h2><p className="mt-1 text-sm text-slate-600">{topics.length} topics · Drafts are visible only to authorized staff.</p></div><span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700">{subject.is_published ? "Subject published" : "Subject draft"}</span></div>
            {topics.length === 0 && <p className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-slate-600">{canManage ? "Create the first topic to begin building this subject." : "No topics have been added to this subject yet."}</p>}
            <div className="mt-5 space-y-4">{topics.map((topic, index) => {
              const topicLessons = lessons.filter((lesson) => lesson.topic_id === topic.id);
              return <article key={topic.id} className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4"><div className="flex min-w-0 gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-sm font-black text-blue-900">{index + 1}</span><div><h3 className="text-lg font-extrabold text-slate-950">{topic.title}</h3><p className="mt-1 text-xs text-slate-500">/{topic.slug} · {topicLessons.length} lessons</p>{topic.description && <p className="mt-2 text-sm leading-6 text-slate-600">{topic.description}</p>}</div></div><span className={`rounded-full px-3 py-1 text-xs font-extrabold ${topic.is_published ? "bg-emerald-100 text-emerald-900" : "bg-amber-100 text-amber-900"}`}>{topic.is_published ? "Published" : "Draft"}</span></div>
                {canManage && <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row"><input value={lessonTitles[topic.id] ?? ""} onChange={(event) => setLessonTitles((old) => ({ ...old, [topic.id]: event.target.value }))} maxLength={255} placeholder="New lesson title" aria-label={`New lesson title for ${topic.title}`} className="min-h-11 min-w-0 flex-1 rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100" /><button type="button" disabled={saving} onClick={() => void createLesson(topic)} className="min-h-11 rounded-xl bg-[#012153] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">Create lesson draft</button><button type="button" disabled={saving} onClick={() => void toggleTopic(topic)} className="min-h-11 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-800 disabled:opacity-50">{topic.is_published ? "Unpublish" : "Publish topic"}</button></div>}
                {topicLessons.length > 0 && <ul className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-100">{topicLessons.map((lesson) => <li key={lesson.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"><span className="text-sm font-semibold text-slate-800">{lesson.title}</span><span className="flex items-center gap-3"><span className="text-xs text-slate-500">{lesson.is_published ? "Published" : "Draft"}</span><Link href={`/tutor/lessons/${lesson.id}/builder`} className="text-sm font-bold text-blue-800 underline underline-offset-4">{canManage ? "Edit lesson" : "Review"}</Link></span></li>)}</ul>}
              </article>;
            })}</div>
          </section>
        </>
      )}
    </main>
  );
}
