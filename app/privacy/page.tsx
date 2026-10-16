import type { Metadata } from "next";
import ComingSoonPage from "../components/ComingSoonPage";

export const metadata: Metadata = { title: "Privacy Notice", description: "The official privacy notice is being prepared for review before publication. This placeholder is not a complete legal policy and should not be treated as one. Before launch, the notice must accurately describe data collected, purposes, retention, processors, learner rights and contact details." };

export default function Page() {
  return <ComingSoonPage title={"Privacy Notice"} category={"Policies"} description={"The official privacy notice is being prepared for review before publication. This placeholder is not a complete legal policy and should not be treated as one. Before launch, the notice must accurately describe data collected, purposes, retention, processors, learner rights and contact details."} requiresAuth={false} nextSteps={[{"label":"Contact and support","href":"/support"}]} />;
}
