import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Your Learning Space",
  robots: { index: false, follow: false, noarchive: true },
};

export default function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
