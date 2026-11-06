"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type ArenaProfile = {
  slug: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  visibility: "public" | "private";
  challenge_availability: "anyone" | "approved_only" | "nobody" | "available_only";
  is_available: boolean;
};

export default function ArenaProfilePage() {
  const [profile, setProfile] = useState<ArenaProfile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("private");
  const [availability, setAvailability] = useState<ArenaProfile["challenge_availability"]>("anyone");
  const [isAvailable, setIsAvailable] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/competition/profile").then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load profile.");
      if (!active) return;
      const item = data.profile as ArenaProfile;
      setProfile(item);
      setDisplayName(item.display_name || "");
      setBio(item.bio || "");
      setAvatarUrl(item.avatar_url || "");
      setVisibility(item.visibility);
      setAvailability(item.challenge_availability);
      setIsAvailable(item.is_available);
    }).catch(err => {
      if (active) setError(err instanceof Error ? err.message : "Unable to load profile.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/competition/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: displayName,
          bio,
          avatar_url: avatarUrl.trim() || null,
          visibility,
          challenge_availability: availability,
          is_available: isAvailable,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save profile.");
      setProfile(data.profile);
      setMessage("Your Arena profile and challenge preferences have been saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 dark:bg-[#060b18] dark:text-slate-100 sm:px-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div><Link href="/challenge-arena" className="text-sm font-bold text-blue-600">← Back to Arena</Link><h1 className="mt-2 text-3xl font-black">Competitive Profile</h1><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Choose how other players see you and who can challenge you.</p></div>
          {profile?.visibility === "public" && <Link href={`/challenge-arena/players/${profile.slug}`} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold dark:border-slate-700">View public profile ↗</Link>}
        </header>

        {loading ? <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm dark:border-slate-800 dark:bg-[#0d172e]">Loading profile…</div> : (
          <form onSubmit={save} className="space-y-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#0d172e] sm:p-7">
            {message && <p role="status" className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
            {error && <p role="alert" className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
            <div><label className="mb-2 block text-sm font-bold">Public display name</label><input value={displayName} onChange={e => setDisplayName(e.target.value)} maxLength={40} minLength={2} required className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-900" /><p className="mt-1 text-xs text-slate-500">Your account email, phone number and login ID are never shown on your public Arena profile.</p></div>
            <div><label className="mb-2 block text-sm font-bold">Short bio</label><textarea value={bio} onChange={e => setBio(e.target.value)} maxLength={280} rows={3} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-900" placeholder="What do you enjoy competing in?" /><p className="mt-1 text-right text-xs text-slate-500">{bio.length}/280</p></div>
            <div><label className="mb-2 block text-sm font-bold">Avatar image URL (HTTPS)</label><input value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)} placeholder="https://…" className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-900" /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className="mb-2 block text-sm font-bold">Profile visibility</label><select value={visibility} onChange={e => setVisibility(e.target.value as "public" | "private")} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-900"><option value="private">Private — only you</option><option value="public">Public — shareable profile</option></select></div>
              <div><label className="mb-2 block text-sm font-bold">Who can challenge you?</label><select value={availability} onChange={e => setAvailability(e.target.value as ArenaProfile["challenge_availability"])} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-900"><option value="anyone">Anyone eligible</option><option value="approved_only">Approved players only</option><option value="available_only">Only when I am available</option><option value="nobody">Nobody</option></select></div>
            </div>
            <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-sm font-semibold dark:border-slate-700"><input type="checkbox" checked={isAvailable} onChange={e => setIsAvailable(e.target.checked)} className="h-4 w-4" /> Show me as available for challenges</label>
            {availability === "approved_only" && <p className="rounded-xl bg-blue-50 p-3 text-xs text-blue-800 dark:bg-blue-950/40 dark:text-blue-200">Approved-player challenges use your private connections list. You can manage connection requests from the Arena Connections Centre.</p>}
            <div className="flex flex-wrap justify-end gap-3"><Link href="/challenge-arena" className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-bold dark:border-slate-700">Cancel</Link><button disabled={saving} className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-black text-white disabled:opacity-50">{saving ? "Saving…" : "Save profile"}</button></div>
          </form>
        )}
      </div>
    </main>
  );
}
