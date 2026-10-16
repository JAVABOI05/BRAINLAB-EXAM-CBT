import type { Metadata } from "next";
import ComingSoonPage from "../../components/ComingSoonPage";

export const metadata: Metadata = { title: "My Learning Progress", description: "A future account-linked view of learning activity, completed revision, practice history and progress over time. It will only show information that can be sourced accurately and accessed with proper server-side permissions." };

export default function Page() {
  return <ComingSoonPage title={"My Learning Progress"} category={"Learner space"} description={"A future account-linked view of learning activity, completed revision, practice history and progress over time. It will only show information that can be sourced accurately and accessed with proper server-side permissions."} requiresAuth={true} nextSteps={[{"label":"Open revision planner","href":"/learning/revision"},{"label":"Open CBT portal","href":"/login"}]} />;
}
