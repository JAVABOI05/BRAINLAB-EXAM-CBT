import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CBT and Learning Solutions for Schools",
  description:
    "Explore BrainLab Academy's school CBT and learning options, estimate indicative licensing costs and submit an institutional enquiry.",
  alternates: { canonical: "/schools" },
  openGraph: {
    title: "School CBT Solutions | BrainLab Academy",
    description:
      "Explore school-focused CBT options and contact BrainLab Academy about institutional needs.",
    url: "/schools",
    type: "website",
  },
};

export default function SchoolsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
