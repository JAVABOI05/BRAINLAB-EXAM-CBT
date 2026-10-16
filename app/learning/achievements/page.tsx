import type { Metadata } from "next";
import ComingSoonPage from "../../components/ComingSoonPage";

export const metadata: Metadata = { title: "Achievements and Milestones", description: "A future record of meaningful learning milestones and completed activities. No badges, certificates or achievements are issued by this placeholder." };

export default function Page() {
  return <ComingSoonPage title={"Achievements and Milestones"} category={"Learner space"} description={"A future record of meaningful learning milestones and completed activities. No badges, certificates or achievements are issued by this placeholder."} requiresAuth={true} nextSteps={[{"label":"My dashboard","href":"/dashboard"},{"label":"Plan revision","href":"/learning/revision"}]} />;
}
