import type { Metadata } from "next";
import ComingSoonPage from "../components/ComingSoonPage";

export const metadata: Metadata = { title: "Learning Resources", description: "A future library for carefully reviewed learning notes, topic explainers, revision guides and other resources. No resource catalogue or downloadable course materials are being published on this placeholder yet." };

export default function Page() {
  return <ComingSoonPage title={"Learning Resources"} category={"Learning library"} description={"A future library for carefully reviewed learning notes, topic explainers, revision guides and other resources. No resource catalogue or downloadable course materials are being published on this placeholder yet."} requiresAuth={false} nextSteps={[{"label":"Explore AI learning plans","href":"/ai-learning"},{"label":"Courses and resources","href":"/courses"}]} />;
}
