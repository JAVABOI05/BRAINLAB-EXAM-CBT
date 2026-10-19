import type { Metadata } from "next";
import LearnerSettingsClient from "./SettingsClient";

export const metadata: Metadata = {
  title: "Account Settings",
  description: "Manage your BrainLab learner profile, appearance preference and account security.",
};

export default function Page() {
  return <LearnerSettingsClient />;
}
