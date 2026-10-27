import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Official Contact Directory & Helpdesk | BrainLab Academy",
  description:
    "Contact BrainLab Academy through official WhatsApp helpline, verified Nigerian phone lines, helpdesk email, and social channels. Dedicated support for CBT candidates, parents, and schools.",
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "Official Contact Directory | BrainLab Academy",
    description:
      "Instant WhatsApp assistance, phone helplines, and academic support desk for BrainLab Academy CBT candidates.",
    url: "/contact",
    type: "website",
  },
};

export default function ContactLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
