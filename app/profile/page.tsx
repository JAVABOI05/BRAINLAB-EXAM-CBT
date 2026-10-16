import type { Metadata } from "next";
import ComingSoonPage from "../components/ComingSoonPage";

export const metadata: Metadata = { title: "My Learner Profile", description: "A future learner-controlled profile for appropriate learning preferences and optional portfolio information. This placeholder does not display or edit personal profile data." };

export default function Page() {
  return <ComingSoonPage title={"My Learner Profile"} category={"Learner space"} description={"A future learner-controlled profile for appropriate learning preferences and optional portfolio information. This placeholder does not display or edit personal profile data."} requiresAuth={true} nextSteps={[{"label":"Account settings","href":"/settings"},{"label":"My dashboard","href":"/dashboard"}]} />;
}
