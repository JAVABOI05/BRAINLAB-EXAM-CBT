import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Self-Practice · Student Portal",
  description: "Custom self-paced question selection, timer modes, and instant feedback.",
  robots: { index: false, follow: false, noarchive: true },
};

export default function SelfPracticeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
