import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Study Schedule & Deadlines · Student Portal",
  description: "Personalized study timetable, class schedule, and upcoming assignment due dates.",
  robots: { index: false, follow: false, noarchive: true },
};

export default function CalendarLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
