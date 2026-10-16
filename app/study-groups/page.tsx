import type { Metadata } from "next";
import ComingSoonPage from "../components/ComingSoonPage";

export const metadata: Metadata = { title: "Study Groups", description: "A future area for joining moderated study circles around subjects, goals or topics. Group membership, chat and invitations are not active on this placeholder." };

export default function Page() {
  return <ComingSoonPage title={"Study Groups"} category={"Learner community"} description={"A future area for joining moderated study circles around subjects, goals or topics. Group membership, chat and invitations are not active on this placeholder."} requiresAuth={true} nextSteps={[{"label":"Community roadmap","href":"/community"},{"label":"Plan revision","href":"/learning/revision"}]} />;
}
