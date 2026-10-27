import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Manage Notification Preferences & Unsubscribe | BrainLab Academy",
  description:
    "Manage your email and SMS notification subscriptions or unsubscribe from BrainLab Academy alerts with 1-click.",
  alternates: { canonical: "/unsubscribe" },
};

export default function UnsubscribeLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
