import type { Metadata } from "next";
import ComingSoonPage from "../components/ComingSoonPage";

export const metadata: Metadata = { title: "Account and Learning Settings", description: "A future home for learner preferences, privacy choices and account settings. Existing sign-in and password recovery remain on the current account page; no settings are changed here." };

export default function Page() {
  return <ComingSoonPage title={"Account and Learning Settings"} category={"Learner space"} description={"A future home for learner preferences, privacy choices and account settings. Existing sign-in and password recovery remain on the current account page; no settings are changed here."} requiresAuth={true} nextSteps={[{"label":"Account page","href":"/account"},{"label":"Privacy notice","href":"/privacy"}]} />;
}
