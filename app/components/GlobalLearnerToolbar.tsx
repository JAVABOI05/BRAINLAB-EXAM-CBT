"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { useLearnerTheme, type AppearancePreference } from "./LearnerThemeProvider";

function firstName(user: User) {
  const metadata = user.user_metadata ?? {};
  const value = metadata.full_name ?? metadata.name;
  return typeof value === "string" && value.trim() ? value.trim().split(/\s+/)[0] : "";
}

function initials(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "BL";
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

const nextAppearance: Record<AppearancePreference, AppearancePreference> = {
  light: "dark",
  dark: "system",
  system: "light",
};

const CANDIDATE_EVENT = "brainlab-candidate-change";

function readCandidateName() {
  if (typeof window === "undefined") return "";
  try {
    const saved = window.localStorage.getItem("candidate");
    if (!saved) return "";
    const candidate = JSON.parse(saved) as { name?: unknown };
    return typeof candidate.name === "string" ? candidate.name.trim() : "";
  } catch {
    return "";
  }
}

function subscribeCandidate(onChange: () => void) {
  window.addEventListener(CANDIDATE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  window.addEventListener("focus", onChange);
  return () => {
    window.removeEventListener(CANDIDATE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
    window.removeEventListener("focus", onChange);
  };
}

function subscribeGreeting(onChange: () => void) {
  const timer = window.setInterval(onChange, 60_000);
  return () => window.clearInterval(timer);
}

export default function GlobalLearnerToolbar() {
  const pathname = usePathname();
  const { appearance, resolvedTheme, setAppearance } = useLearnerTheme();
  const [user, setUser] = useState<User | null>(null);
  const candidateName = useSyncExternalStore(subscribeCandidate, readCandidateName, () => "");
  const greetingText = useSyncExternalStore(subscribeGreeting, greeting, () => "Welcome");

  useEffect(() => {
    window.dispatchEvent(new Event(CANDIDATE_EVENT));
  }, [pathname]);

  useEffect(() => {
    let active = true;
    void supabase.auth.getUser().then(({ data, error }) => {
      if (active) setUser(error ? null : data.user);
    }).catch(() => {
      if (active) setUser(null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setUser(session?.user ?? null);
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const name = user ? (firstName(user) || (candidateName ? candidateName.split(/\s+/)[0] : "")) : (candidateName ? candidateName.split(/\s+/)[0] : "");
  const avatarValue = user?.user_metadata?.avatar_url ?? user?.user_metadata?.picture;
  const avatar = typeof avatarValue === "string" && /^https:\/\//i.test(avatarValue) ? avatarValue : "";

  return (
    <div className="global-learner-toolbar" aria-label="Personal learning and appearance controls">
      <div className="global-learner-toolbar-inner">
        <div className="global-learner-identity">
          {user && avatar ? (
            <img src={avatar} alt="" referrerPolicy="no-referrer" className="global-learner-avatar" />
          ) : user || candidateName ? (
            <span className="global-learner-avatar global-learner-avatar-fallback" aria-hidden="true">{initials(name || "BrainLab")}</span>
          ) : null}
          <div className="global-learner-welcome">
            <span className="global-learner-greeting">{name ? `${greetingText},` : greetingText}</span>
            <span className="global-learner-name">{name || "BrainLab Learner"}</span>
          </div>
        </div>
        <div className="global-learner-actions">
          {user && <Link href="/settings" className="global-learner-action-link">Account settings</Link>}
          {user && <Link href="/profile" className="global-learner-action-link">Profile</Link>}
          <button
            type="button"
            className="global-learner-theme-button"
            onClick={() => setAppearance(nextAppearance[appearance])}
            aria-label={`Appearance is ${appearance}. Change appearance.`}
            title={`Appearance: ${appearance}. Click to switch to ${nextAppearance[appearance]}.`}
          >
            <span aria-hidden="true">{resolvedTheme === "dark" ? "☾" : resolvedTheme === "light" ? "☀" : "◐"}</span>
            <span>{appearance === "system" ? "System" : resolvedTheme === "dark" ? "Dark" : "Light"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
