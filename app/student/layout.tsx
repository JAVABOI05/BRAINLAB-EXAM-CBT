import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Student Portal · BrainLab Academy",
  description: "Personalized student workspace for practice, assignments, adaptive revision, and live interactive classes.",
  robots: { index: false, follow: false, noarchive: true },
};

export default function StudentRootLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
