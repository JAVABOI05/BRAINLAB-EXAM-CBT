import type { Metadata } from "next";
import ComingSoonPage from "../components/ComingSoonPage";

export const metadata: Metadata = { title: "Contact BrainLab", description: "This page will become the central directory for verified BrainLab contact channels, support guidance and institutional enquiries. For current CBT questions, use the support route and the existing channel listed there." };

export default function Page() {
  return <ComingSoonPage title={"Contact BrainLab"} category={"Contact"} description={"This page will become the central directory for verified BrainLab contact channels, support guidance and institutional enquiries. For current CBT questions, use the support route and the existing channel listed there."} requiresAuth={false} nextSteps={[{"label":"Help and FAQs","href":"/support"},{"label":"Open CBT portal","href":"/login"}]} />;
}
