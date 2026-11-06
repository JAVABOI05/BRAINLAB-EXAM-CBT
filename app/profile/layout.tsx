import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Profile · Student Portal",
  description: "Learner personal credentials, display bio, target exam preferences, and account settings.",
  robots: { index: false, follow: false, noarchive: true },
};

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
