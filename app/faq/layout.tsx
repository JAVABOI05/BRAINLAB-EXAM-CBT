import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Frequently Asked Questions | BrainLab Academy Help",
  description:
    "Find answers about BrainLab Academy CBT practice, examination access codes, results, learning tools, account support and payment access.",
  alternates: { canonical: "/faq" },
  openGraph: {
    title: "Frequently Asked Questions | BrainLab Academy",
    description:
      "Find help with BrainLab Academy exam practice, account access, results and learning tools.",
    url: "/faq",
    type: "website",
  },
};

export default function FAQLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
