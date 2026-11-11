"use client";

import { useEffect, useState, type FormEvent, type ChangeEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type Profile = {
  id: string; user_id: string; name: string; slug: string; title: string; bio: string;
  qualifications: string; education: string; certifications: string; years_experience: number;
  subject_slugs: string[]; specialties: string[]; languages: string[]; teaching_approach: string;
  photo_url: string | null; website_url: string | null; linkedin_url: string | null;
  profile_status: "draft" | "pending" | "approved" | "rejected" | "suspended"; review_note: string;
};

type Draft = Omit<Profile, "id" | "user_id" | "profile_status" | "review_note">;
const emptyDraft = (name = "", userId = ""): Draft => ({
  name, slug: name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + (userId ? "-" + userId.slice(0, 6) : ""),
  title: "", bio: "", qualifications: "", education: "", certifications: "", years_experience: 0,
  subject_slugs: [], specialties: [], languages: [], teaching_approach: "", photo_url: null,
  website_url: null, linkedin_url: null,
});

function listValue(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}
function fieldClass() {
  return "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100";
}
function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-sm font-bold text-slate-800">{children}</label>;
}

export default function TutorProfileEditorPage() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [subjects, setSubjects] = useState("");
  const [specialties, setSpecialties] = useState("");
  const [languages, setLanguages] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) { router.replace("/login?redirect=/tutor/profile"); return; }
      const { data: role } = await supabase.rpc("get_admin_role");
      if (role !== "teacher") {
        setError("This profile workspace is available to BrainLab tutor accounts only. If you are a tutor, ask an administrator to activate your tutor role.");
        setLoading(false);
        return;
      }
      if (!active) return;
      setUserId(user.id);
      const { data, error: profileError } = await supabase.from("tutor_profiles").select("*").eq("user_id", user.id).maybeSingle();
      if (profileError) {
        setError("We could not load your tutor profile. Please refresh or contact BrainLab support.");
      } else if (data) {
        const row = data as Profile;
        setProfile(row);
        setDraft({
          name: row.name, slug: row.slug, title: row.title, bio: row.bio, qualifications: row.qualifications,
          education: row.education, certifications: row.certifications, years_experience: row.years_experience,
          subject_slugs: row.subject_slugs ?? [], specialties: row.specialties ?? [], languages: row.languages ?? [],
          teaching_approach: row.teaching_approach, photo_url: row.photo_url, website_url: row.website_url,
          linkedin_url: row.linkedin_url,
        });
        setSubjects((row.subject_slugs ?? []).join(", "));
        setSpecialties((row.specialties ?? []).join(", "));
        setLanguages((row.languages ?? []).join(", "));
      } else {
        setDraft(emptyDraft(user.user_metadata?.full_name ?? user.user_metadata?.name ?? "", user.id));
      }
      setLoading(false);
    }
    void load();
    return () => { active = false; };
  }, [router]);

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function onPhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setError("Choose a JPG, PNG or WebP image no larger than 5 MB.");
      event.target.value = "";
      return;
    }
    setError("");
    setPhoto(file);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(""); setNotice("");
    const cleanName = draft.name.trim();
    const cleanBio = draft.bio.trim();
    const cleanSlug = draft.slug.toLowerCase().trim().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "");
    if (cleanName.length < 2 || cleanBio.length < 40 || !cleanSlug) {
      setError("Add your full name, a profile URL, and a biography of at least 40 characters.");
      return;
    }
    setSaving(true);
    let photoUrl = draft.photo_url;
    if (photo) {
      const extension = photo.type === "image/png" ? "png" : photo.type === "image/webp" ? "webp" : "jpg";
      const path = userId + "/" + crypto.randomUUID() + "." + extension;
      try {
        const { error: uploadError } = await supabase.storage
          .from("tutor-avatars")
          .upload(path, photo, { contentType: photo.type, cacheControl: "3600" });
        if (uploadError) {
          console.error("[tutor-profile] photo upload rejected", {
            name: uploadError.name, message: uploadError.message, statusCode: (uploadError as { statusCode?: string }).statusCode,
          });
          throw new Error("PHOTO_UPLOAD_REJECTED: " + uploadError.message);
        }
        photoUrl = supabase.storage.from("tutor-avatars").getPublicUrl(path).data.publicUrl;
      } catch (cause) {
        console.error("[tutor-profile] photo upload request failed", {
          name: cause instanceof Error ? cause.name : "UnknownError",
          message: cause instanceof Error ? cause.message : String(cause),
          mime: photo.type, size: photo.size,
        });
        setError(cause instanceof TypeError
          ? "PHOTO_UPLOAD_NETWORK_ERROR: The browser could not complete the photo upload request. Your profile details were not changed. Please contact BrainLab support with this error code."
          : cause instanceof Error ? cause.message : "PHOTO_UPLOAD_FAILED: The photo could not be uploaded. Your profile details were not changed.");
        setSaving(false);
        return;
      }
    }
    try {
      const payload = {
        name: cleanName, slug: cleanSlug, title: draft.title.trim(), bio: cleanBio,
        qualifications: draft.qualifications.trim(), education: draft.education.trim(),
        certifications: draft.certifications.trim(), years_experience: Math.max(0, Math.min(60, Number(draft.years_experience) || 0)),
        subject_slugs: listValue(subjects), specialties: listValue(specialties), languages: listValue(languages),
        teaching_approach: draft.teaching_approach.trim(), photo_url: photoUrl,
        website_url: draft.website_url?.trim() || null, linkedin_url: draft.linkedin_url?.trim() || null,
      };
      const result = profile
        ? await supabase.from("tutor_profiles").update(payload).eq("id", profile.id).select("*").single()
        : await supabase.from("tutor_profiles").insert({ ...payload, user_id: userId }).select("*").single();
      if (result.error) throw result.error;
      setProfile(result.data as Profile);
      setDraft((current) => ({ ...current, photo_url: photoUrl }));
      setPhoto(null);
      setNotice("Your profile has been submitted for review. It will appear publicly after BrainLab approves it.");
    } catch (cause) {
      console.error("[tutor-profile] profile database save failed", {
        name: cause instanceof Error ? cause.name : "UnknownError",
        message: cause instanceof Error ? cause.message : String(cause),
      });
      setError(cause instanceof Error ? "PROFILE_SAVE_FAILED: " + cause.message : "PROFILE_SAVE_FAILED: Your profile could not be saved. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <main className="mx-auto max-w-4xl p-8 text-slate-600">Loading your tutor workspace…</main>;

  return <main className="mx-auto min-h-screen max-w-5xl px-4 py-8 text-slate-900 sm:px-6 sm:py-12">
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div><p className="text-xs font-black uppercase tracking-[.18em] text-blue-700">BrainLab Academy · Tutor workspace</p><h1 className="mt-2 text-3xl font-black tracking-tight">My Tutor Profile</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Build your professional profile so learners can understand your teaching background, subjects and approach.</p></div>
      <Link href="/dashboard" className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">← Dashboard</Link>
    </div>

    {error && <p role="alert" className="mb-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</p>}
    {notice && <p role="status" className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</p>}
    {profile && <section className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Publication status</p><p className="mt-1 font-extrabold capitalize">{profile.profile_status.replace("_", " ")}</p>{profile.review_note && <p className="mt-1 text-sm text-slate-600">{profile.review_note}</p>}</div>
      {profile.profile_status === "approved" && profile.slug && <Link href={"/tutors/" + profile.slug} target="_blank" className="text-sm font-bold text-blue-700 underline">View public profile ↗</Link>}
    </section>}

    {error.startsWith("This profile workspace") ? null : <form onSubmit={save} className="space-y-7 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
      <section><h2 className="text-lg font-extrabold">Professional identity</h2><p className="mt-1 text-sm text-slate-500">Use the name and credentials students should see on your public profile.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div><Label>Full name *</Label><input required maxLength={120} className={fieldClass()} value={draft.name} onChange={e=>update("name",e.target.value)} /></div>
          <div><Label>Profile URL slug *</Label><input required maxLength={100} className={fieldClass()} value={draft.slug} onChange={e=>update("slug",e.target.value)} /><p className="mt-1 text-xs text-slate-500">brainlabacademy.com.ng/tutors/{draft.slug || "your-name"}</p></div>
          <div className="sm:col-span-2"><Label>Professional title / teaching role</Label><input maxLength={140} className={fieldClass()} placeholder="e.g. Mathematics Educator · UTME Preparation" value={draft.title} onChange={e=>update("title",e.target.value)} /></div>
          <div><Label>Years of teaching experience</Label><input type="number" min={0} max={60} className={fieldClass()} value={draft.years_experience} onChange={e=>update("years_experience",Number(e.target.value))} /></div>
          <div><Label>Profile photograph (max 5 MB)</Label><input type="file" accept="image/*" className={fieldClass()} onChange={onPhotoChange} /><p className="mt-1 text-xs text-slate-500">Use a clear professional headshot.</p></div>
        </div>
      </section>
      <section className="border-t border-slate-100 pt-6"><h2 className="text-lg font-extrabold">Biography &amp; teaching</h2><div className="mt-4 space-y-4">
        <div><Label>Professional biography * (minimum 40 characters)</Label><textarea required minLength={40} maxLength={3000} rows={5} className={fieldClass()} value={draft.bio} onChange={e=>update("bio",e.target.value)} placeholder="Introduce yourself, your teaching background and the learners you support." /></div>
        <div><Label>Teaching approach</Label><textarea maxLength={1500} rows={3} className={fieldClass()} value={draft.teaching_approach} onChange={e=>update("teaching_approach",e.target.value)} placeholder="How do you explain difficult ideas and help learners improve?" /></div>
        <div><Label>Subjects taught (comma-separated)</Label><input className={fieldClass()} value={subjects} onChange={e=>setSubjects(e.target.value)} placeholder="Mathematics, Physics, Chemistry" /></div>
        <div><Label>Areas of expertise (comma-separated)</Label><input className={fieldClass()} value={specialties} onChange={e=>setSpecialties(e.target.value)} placeholder="UTME preparation, Mechanics, Algebra" /></div>
        <div><Label>Languages (comma-separated)</Label><input className={fieldClass()} value={languages} onChange={e=>setLanguages(e.target.value)} placeholder="English, Yoruba, Igbo" /></div>
      </div></section>
      <section className="border-t border-slate-100 pt-6"><h2 className="text-lg font-extrabold">Qualifications &amp; credentials</h2><div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><Label>Academic / professional qualifications</Label><textarea rows={3} maxLength={2000} className={fieldClass()} value={draft.qualifications} onChange={e=>update("qualifications",e.target.value)} placeholder="List relevant degrees, professional memberships or teaching credentials." /></div>
        <div><Label>Education / institutions</Label><textarea rows={3} maxLength={1500} className={fieldClass()} value={draft.education} onChange={e=>update("education",e.target.value)} placeholder="Institution and qualification (one per line)" /></div>
        <div><Label>Certifications</Label><textarea rows={3} maxLength={1500} className={fieldClass()} value={draft.certifications} onChange={e=>update("certifications",e.target.value)} placeholder="Relevant certificates and awarding bodies" /></div>
      </div><p className="mt-2 text-xs leading-5 text-slate-500">Only list genuine qualifications. BrainLab may request evidence before approving a profile.</p></section>
      <section className="border-t border-slate-100 pt-6"><h2 className="text-lg font-extrabold">Professional links (optional)</h2><div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div><Label>Website</Label><input type="url" className={fieldClass()} value={draft.website_url ?? ""} onChange={e=>update("website_url",e.target.value)} placeholder="https://" /></div>
        <div><Label>LinkedIn profile</Label><input type="url" className={fieldClass()} value={draft.linkedin_url ?? ""} onChange={e=>update("linkedin_url",e.target.value)} placeholder="https://linkedin.com/in/..." /></div>
      </div></section>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-6"><p className="max-w-xl text-xs leading-5 text-slate-500">Saving changes submits your profile for review and temporarily removes an already-published version until it is approved again.</p><button disabled={saving} className="rounded-xl bg-[#0B1536] px-6 py-3 text-sm font-black text-white shadow-sm hover:bg-blue-900 disabled:opacity-60">{saving ? "Saving profile…" : profile ? "Save & resubmit for review" : "Submit profile for review"}</button></div>
    </form>}
  </main>;
}
