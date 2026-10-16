import type { Metadata } from "next";
import ComingSoonPage from "../components/ComingSoonPage";

export const metadata: Metadata = { title: "For Schools and Institutions", description: "A future space for schools, tutors and institutions to explore possible assessment, learning support and progress tools. No institutional partnerships, pricing, integrations or service commitments are being claimed here." };

export default function Page() {
  return <ComingSoonPage title={"For Schools and Institutions"} category={"Institutional learning"} description={"A future space for schools, tutors and institutions to explore possible assessment, learning support and progress tools. No institutional partnerships, pricing, integrations or service commitments are being claimed here."} requiresAuth={false} nextSteps={[{"label":"Contact and support","href":"/contact"},{"label":"About BrainLab","href":"/about"}]} />;
}
