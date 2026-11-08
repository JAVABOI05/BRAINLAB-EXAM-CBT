import type { Metadata } from "next";
import InstructorPortalShell from "../tutor/InstructorPortalShell";

export const metadata: Metadata = {
  title: "Instructor Studio · BrainLab Academy",
  description: "Authoring workspace for BrainLab Academy instructors to design lessons, manage assignments, and host live classes.",
  robots: { index: false, follow: false, noarchive: true },
};

export default function InstructorLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <InstructorPortalShell>{children}</InstructorPortalShell>;
}
