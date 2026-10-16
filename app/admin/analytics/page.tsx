import type { Metadata } from "next";
import ComingSoonPage from "../../components/ComingSoonPage";

export const metadata: Metadata = { title: "Platform Analytics", description: "A planned view of platform health and aggregate learning activity. No analytics are collected or displayed here. Future reporting must minimise personal data and respect access permissions.", robots: { index: false, follow: false } };

export default function Page() {
  return <ComingSoonPage title={"Platform Analytics"} category={"Admin workspace"} description={"A planned view of platform health and aggregate learning activity. No analytics are collected or displayed here. Future reporting must minimise personal data and respect access permissions."} requiresAdmin={true} nextSteps={[{"label":"Admin dashboard","href":"/admin/dashboard"}]} />;
}
