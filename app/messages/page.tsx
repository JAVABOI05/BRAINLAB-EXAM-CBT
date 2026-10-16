import type { Metadata } from "next";
import ComingSoonPage from "../components/ComingSoonPage";

export const metadata: Metadata = { title: "Messages", description: "Private messaging is planned for a later stage and is not enabled here. Any future messaging system needs privacy controls, abuse reporting, retention rules and access checks." };

export default function Page() {
  return <ComingSoonPage title={"Messages"} category={"Learner space"} description={"Private messaging is planned for a later stage and is not enabled here. Any future messaging system needs privacy controls, abuse reporting, retention rules and access checks."} requiresAuth={true} nextSteps={[{"label":"My dashboard","href":"/dashboard"},{"label":"Community roadmap","href":"/community"}]} />;
}
