import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Use & Student Agreement | BrainLab Academy",
  description:
    "Official BrainLab Academy Terms of Use. Guidelines governing CBT examination participation, AI tutor acceptable use, subscription billing, anti-cheat integrity, and intellectual property.",
  alternates: { canonical: "/terms" },
  openGraph: {
    title: "Terms of Use & Student Agreement | BrainLab Academy",
    description:
      "Binding student agreement, CBT fair testing standards, AI tutor fair use policy, and multi-gateway subscription rules.",
    url: "/terms",
    type: "website",
  },
};

export default function TermsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
