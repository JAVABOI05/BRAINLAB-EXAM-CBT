import type { Metadata } from "next";

export const metadata: Metadata = {
  alternates: { canonical: "/support" },
  openGraph: {
    title: "BrainLab Academy Help and Support",
    description:
      "Get help with CBT practice, access codes, results, learner accounts and academic tools.",
    url: "/support",
    type: "website",
  },
};

export default function SupportLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
