import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";

type Tutor = {
  name: string; slug: string; title: string; bio: string; qualifications: string;
  education: string; certifications: string; years_experience: number; subject_slugs: string[];
  specialties: string[]; languages: string[]; teaching_approach: string; photo_url: string | null;
  website_url: string | null; linkedin_url: string | null;
};

type Props = { params: Promise<{ slug: string }> };

async function getTutor(slug: string): Promise<Tutor | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data } = await supabase.from("tutor_profiles")
    .select("name,slug,title,bio,qualifications,education,certifications,years_experience,subject_slugs,specialties,languages,teaching_approach,photo_url,website_url,linkedin_url")
    .eq("slug", slug).eq("is_published", true).eq("profile_status", "approved").maybeSingle();
  return data as Tutor | null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const tutor = await getTutor(slug);
  if (!tutor) return { title: "Tutor Profile | BrainLab Academy", robots: { index: false, follow: false } };
  const description = tutor.bio.replace(/\s+/g, " ").slice(0, 155);
  return {
    title: tutor.name + (tutor.title ? " · " + tutor.title : "") + " | BrainLab Academy",
    description,
    alternates: { canonical: "/tutors/" + tutor.slug },
    openGraph: { title: tutor.name + " | BrainLab Academy", description, images: tutor.photo_url ? [tutor.photo_url] : undefined, type: "profile" },
  };
}

export default async function PublicTutorProfilePage({ params }: Props) {
  const { slug } = await params;
  const tutor = await getTutor(slug);

  if (!tutor) return <main className="min-h-[60vh] px-5 py-20 text-center text-slate-900"><h1 className="text-3xl font-black">Tutor profile unavailable</h1><p className="mt-3 text-slate-600">This profile may be unpublished or the address may be incorrect.</p><Link href="/tutors" className="mt-6 inline-flex rounded-xl bg-[#0B1536] px-5 py-3 font-bold text-white">Browse tutors</Link></main>;

  const sections = [
    ["Qualifications", tutor.qualifications],
    ["Education", tutor.education],
    ["Certifications", tutor.certifications],
  ].filter((item) => item[1]?.trim());

  return <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900 sm:px-6 sm:py-14">
    <div className="mx-auto max-w-5xl">
      <Link href="/tutors" className="text-sm font-bold text-blue-800 underline underline-offset-4">← All BrainLab tutors</Link>
      <article className="mt-6 overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="grid md:grid-cols-[300px_minmax(0,1fr)]">
          <div className="min-h-72 bg-gradient-to-br from-[#0B1536] to-[#1356E8]">
            {tutor.photo_url ? <img src={tutor.photo_url} alt={tutor.name} className="h-full min-h-72 w-full object-cover" /> : <div className="flex h-full min-h-72 items-center justify-center text-7xl font-black text-white">{tutor.name.slice(0,1).toUpperCase()}</div>}
          </div>
          <div className="p-6 sm:p-9">
            <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-black uppercase tracking-wider text-emerald-800">BrainLab verified tutor profile</span>
            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">{tutor.name}</h1>
            {tutor.title && <p className="mt-2 text-lg font-bold text-blue-800">{tutor.title}</p>}
            {tutor.years_experience > 0 && <p className="mt-2 text-sm font-semibold text-slate-500">{tutor.years_experience} years of teaching experience</p>}
            <p className="mt-6 whitespace-pre-line text-base leading-8 text-slate-700">{tutor.bio}</p>
            <div className="mt-6 flex flex-wrap gap-2">{tutor.subject_slugs?.map((subject) => <span key={subject} className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-900">{subject}</span>)}</div>
          </div>
        </div>
        <div className="grid gap-8 border-t border-slate-100 p-6 sm:p-9 md:grid-cols-2">
          <section><h2 className="text-lg font-extrabold">Teaching approach</h2><p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-600">{tutor.teaching_approach || "This tutor has not added a teaching approach yet."}</p>
            {!!tutor.specialties?.length && <><h3 className="mt-6 text-sm font-extrabold uppercase tracking-wider text-slate-500">Areas of expertise</h3><div className="mt-3 flex flex-wrap gap-2">{tutor.specialties.map((item) => <span key={item} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold">{item}</span>)}</div></>}
            {!!tutor.languages?.length && <><h3 className="mt-6 text-sm font-extrabold uppercase tracking-wider text-slate-500">Languages</h3><p className="mt-2 text-sm text-slate-600">{tutor.languages.join(" · ")}</p></>}
          </section>
          <section><h2 className="text-lg font-extrabold">Education &amp; credentials</h2>{sections.length ? <div className="mt-3 space-y-4">{sections.map(([label,value]) => <div key={label}><h3 className="text-xs font-black uppercase tracking-wider text-slate-500">{label}</h3><p className="mt-1 whitespace-pre-line text-sm leading-7 text-slate-700">{value}</p></div>)}</div> : <p className="mt-3 text-sm text-slate-500">No additional credential details have been provided.</p>}
            {(tutor.website_url || tutor.linkedin_url) && <div className="mt-6 flex flex-wrap gap-4 border-t border-slate-100 pt-4">{tutor.website_url && <a href={tutor.website_url} target="_blank" rel="noreferrer" className="text-sm font-bold text-blue-700 underline">Website ↗</a>}{tutor.linkedin_url && <a href={tutor.linkedin_url} target="_blank" rel="noreferrer" className="text-sm font-bold text-blue-700 underline">LinkedIn ↗</a>}</div>}
          </section>
        </div>
      </article>
      <p className="mt-5 text-center text-xs text-slate-500">This profile is maintained by the tutor and reviewed by BrainLab Academy. Credentials are subject to verification.</p>
    </div>
  </main>;
}
