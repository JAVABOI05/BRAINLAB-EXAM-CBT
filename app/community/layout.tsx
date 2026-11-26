import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Communities & Cohorts · Student Portal",
  description: "Join academic study cohorts, participate in live discussions, and track cohort leaderboards.",
  robots: { index: false, follow: false, noarchive: true },
};

export default function CommunityLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
