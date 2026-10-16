import type { Metadata } from "next";
import ComingSoonPage from "../../components/ComingSoonPage";

export const metadata: Metadata = { title: "Community Discussions", description: "A future moderated discussion space for academic questions and peer learning. Posting, replies, reporting and moderation tools must be built and tested before discussions open." };

export default function Page() {
  return <ComingSoonPage title={"Community Discussions"} category={"Learner community"} description={"A future moderated discussion space for academic questions and peer learning. Posting, replies, reporting and moderation tools must be built and tested before discussions open."} requiresAuth={true} nextSteps={[{"label":"Community roadmap","href":"/community"},{"label":"Help and support","href":"/support"}]} />;
}
