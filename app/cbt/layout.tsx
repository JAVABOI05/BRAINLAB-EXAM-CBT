import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CBT Exam Practice for JAMB, WAEC & NECO",
  description:
    "Prepare with BrainLab Academy's computer-based test portal. Choose examination subjects, practise exam-style questions and review your performance.",
  alternates: { canonical: "/cbt" },
  openGraph: {
    title: "CBT Exam Practice | BrainLab Academy",
    description:
      "Practise Nigerian exam-style questions with BrainLab Academy's CBT portal.",
    url: "/cbt",
    type: "website",
  },
};

export default function CBTLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
