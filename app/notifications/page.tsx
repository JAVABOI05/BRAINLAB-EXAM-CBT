import type { Metadata } from "next";
import ComingSoonPage from "../components/ComingSoonPage";

export const metadata: Metadata = { title: "Notifications", description: "A future notification centre for important account and learning updates. This placeholder does not subscribe to events, send messages or store notification data." };

export default function Page() {
  return <ComingSoonPage title={"Notifications"} category={"Learner space"} description={"A future notification centre for important account and learning updates. This placeholder does not subscribe to events, send messages or store notification data."} requiresAuth={true} nextSteps={[{"label":"My dashboard","href":"/dashboard"},{"label":"Account settings","href":"/settings"}]} />;
}
