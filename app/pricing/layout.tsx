import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Plans and Pricing",
  description:
    "Explore BrainLab Academy's available learning and CBT access plans. Review current plan details and payment options before subscribing.",
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: "Plans and Pricing | BrainLab Academy",
    description:
      "Compare available BrainLab Academy learning and CBT plans and review current payment options.",
    url: "/pricing",
    type: "website",
  },
};

export default function PricingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
