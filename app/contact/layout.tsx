import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact BrainLab Academy",
  description:
    "Contact BrainLab Academy for CBT access, learner account help, school enquiries and information about learning support.",
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "Contact BrainLab Academy",
    description:
      "Find official BrainLab Academy contact channels for learner and school support.",
    url: "/contact",
    type: "website",
  },
};

export default function ContactLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
