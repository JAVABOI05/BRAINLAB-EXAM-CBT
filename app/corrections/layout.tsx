import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Corrections & Weak Areas · Student Portal",
  description: "Targeted error review, step-by-step explanations, and mastery remediation bank.",
  robots: { index: false, follow: false, noarchive: true },
};

export default function CorrectionsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
