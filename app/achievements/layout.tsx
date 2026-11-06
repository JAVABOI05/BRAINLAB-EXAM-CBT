import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Achievements & Milestones · Student Portal",
  description: "Learner badges, study streaks, question milestones, and leaderboard rankings.",
  robots: { index: false, follow: false, noarchive: true },
};

export default function AchievementsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
