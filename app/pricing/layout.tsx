import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Subscription Plans & Access Tiers",
  description:
    "Transparent monthly CBT practice plans with no lock-in. 1 free daily mock exam, unlimited Pro simulations, standard and scientific calculators, and AI tutor support.",
  alternates: {
    canonical: "https://www.brainlabacademy.com.ng/pricing",
  },
  openGraph: {
    title: "Subscription Plans & Access Tiers | BrainLab Academy",
    description:
      "Transparent monthly CBT practice plans with no lock-in. 1 free daily mock exam, unlimited Pro simulations, and AI tutor support.",
    url: "https://www.brainlabacademy.com.ng/pricing",
  },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
