import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Learning DNA · Student Portal",
  description: "Personalized cognitive learning archetypes, study velocities, peak performance windows, and retention metrics.",
  robots: { index: false, follow: false, noarchive: true },
};

export default function LearningDnaLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
