import type { Metadata } from "next";
import ComingSoonPage from "../components/ComingSoonPage";

export const metadata: Metadata = { title: "Frequently Asked Questions", description: "A fuller searchable help centre will be developed here. For now, the current support page answers common questions about CBT access, account sign-in and result availability." };

export default function Page() {
  return <ComingSoonPage title={"Frequently Asked Questions"} category={"Help centre"} description={"A fuller searchable help centre will be developed here. For now, the current support page answers common questions about CBT access, account sign-in and result availability."} requiresAuth={false} nextSteps={[{"label":"Read current FAQs","href":"/support"},{"label":"Account sign-in","href":"/account"}]} />;
}
