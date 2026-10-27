import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy & AI Ethics | BrainLab Academy",
  description:
    "Official BrainLab Academy Privacy Policy and AI Ethics framework. Learn about our NDPA 2023 compliance, zero AI model training on candidate inputs, and AES-256-GCM cryptographic data protection.",
  alternates: { canonical: "/privacy" },
  openGraph: {
    title: "Privacy Policy & AI Ethics | BrainLab Academy",
    description:
      "NDPA 2023 compliant learner data protection, zero AI model training on student queries, and application-level cryptographic security.",
    url: "/privacy",
    type: "website",
  },
};

export default function PrivacyLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
