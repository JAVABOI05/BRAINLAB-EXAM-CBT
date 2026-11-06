import Link from "next/link";

type Params = { params: Promise<{ slug: string }> };
type ProfileResponse = {
  profile: { display_name: string; avatar_url: string | null; bio: string | null; slug: string; is_available: boolean };
  rating: { elo_rating: number; peak_elo: number; matches_played: number; matches_won: number; matches_drawn: number; matches_lost: number; tier: string } | null;
  gamification: { lifetime_xp: number; current_level: number; level_name: string } | null;
};

async function loadProfile(slug: string): Promise<ProfileResponse | null> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}` || "https://www.brainlabacademy.com.ng";
  const response = await fetch(`${base}/api/competition/profiles/${encodeURIComponent(slug)}`, { cache: "no-store" });
  if (!response.ok) return null;
  return response.json();
}

export default async function PublicArenaPlayerPage({ params }: Params) {
  const { slug } = await params;
  const data = await loadProfile(slug);
  if (!data) {
    return <main className="min-h-screen bg-slate-50 px-4 py-16 text-slate-900 dark:bg-[#060b18] dark:text-white"><div className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-[#0d172e]"><h1 className="text-2xl font-black">Profile unavailable</h1><p className="mt-2 text-sm text-slate-500">This player profile is private or does not exist.</p><Link href="/challenge-arena" className="mt-5 inline-flex rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white">Return to Arena</Link></div></main>;
  }
  const { profile, rating, gamification } = data;
  const winRate = rating && rating.matches_played ? Math.round((rating.matches_won / rating.matches_played) * 100) : 0;
  return <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 dark:bg-[#060b18] dark:text-slate-100 sm:px-6"><div className="mx-auto max-w-4xl space-y-6">
    <header><Link href="/challenge-arena" className="text-sm font-bold text-blue-600">← BrainLab Arena</Link></header>
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#0d172e]">
      <div className="h-2 bg-gradient-to-r from-[#1356E8] via-[#FF5238] to-[#1356E8]" />
      <div className="flex flex-wrap items-center gap-5 p-6 sm:p-8">
        {profile.avatar_url ? <img src={profile.avatar_url} alt="" className="h-20 w-20 rounded-2xl object-cover" /> : <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-100 text-3xl font-black text-blue-700 dark:bg-blue-950 dark:text-blue-300">{profile.display_name.slice(0,1).toUpperCase()}</div>}
        <div className="min-w-0 flex-1"><h1 className="text-3xl font-black">{profile.display_name}</h1><p className="mt-1 text-sm text-slate-500">BrainLab Arena competitor</p>{profile.bio && <p className="mt-3 max-w-2xl text-sm text-slate-700 dark:text-slate-300">{profile.bio}</p>}</div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${profile.is_available ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>{profile.is_available ? "Available to compete" : "Currently unavailable"}</span>
      </div>
    </section>
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0d172e]"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Arena rating</p><p className="mt-2 text-3xl font-black">{rating?.elo_rating ?? "—"}</p><p className="text-xs text-slate-500">{rating?.tier || "Unranked"}</p></div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0d172e]"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Matches</p><p className="mt-2 text-3xl font-black">{rating?.matches_played ?? 0}</p><p className="text-xs text-slate-500">{rating?.matches_won ?? 0} wins · {rating?.matches_lost ?? 0} losses</p></div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0d172e]"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Win rate</p><p className="mt-2 text-3xl font-black">{winRate}%</p><p className="text-xs text-slate-500">{rating?.matches_drawn ?? 0} draws</p></div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0d172e]"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Lifetime XP</p><p className="mt-2 text-3xl font-black">{gamification?.lifetime_xp ?? 0}</p><p className="text-xs text-slate-500">{gamification?.level_name || `Level ${gamification?.current_level ?? 1}`}</p></div>
    </section>
    <p className="text-center text-xs text-slate-500">This profile shows only the competitor's chosen public display information and Arena statistics. Account email, phone number and internal user identifiers are not displayed.</p>
  </div></main>;
}
