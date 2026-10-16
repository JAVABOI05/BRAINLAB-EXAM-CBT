import type { Metadata } from "next";
import ComingSoonPage from "../components/ComingSoonPage";

export const metadata: Metadata = { title: "Terms of Use", description: "The official terms of use will be published after review. This placeholder is not a binding or complete terms document; the final version needs to reflect the actual CBT service, account rules, learner responsibilities and applicable requirements." };

export default function Page() {
  return <ComingSoonPage title={"Terms of Use"} category={"Policies"} description={"The official terms of use will be published after review. This placeholder is not a binding or complete terms document; the final version needs to reflect the actual CBT service, account rules, learner responsibilities and applicable requirements."} requiresAuth={false} nextSteps={[{"label":"Help and support","href":"/support"}]} />;
}
