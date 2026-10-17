import type { Metadata } from "next";
import ComingSoonPage from "../../components/ComingSoonPage";

export const metadata: Metadata = { title: "Community Moderation", description: "A future moderation workspace for handling reports, community rules and safety actions if community features launch. No messages, reports or learner data are available here.", robots: { index: false, follow: false } };

export default function Page() {
  return <ComingSoonPage title={"Community Moderation"} category={"Admin workspace"} description={"A future moderation workspace for handling reports, community rules and safety actions if community features launch. No messages, reports or learner data are available here."} requiresAdmin={true} requiredPermission="community.moderate" nextSteps={[{"label":"Admin dashboard","href":"/admin/dashboard"}]} />;
}
