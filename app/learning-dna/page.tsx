import type { Metadata } from "next";
import ComingSoonPage from "../components/ComingSoonPage";

export const metadata: Metadata = { title: "Learning DNA", description: "A future, explainable learner profile intended to summarise learning preferences and useful progress signals where reliable data exists. It is not a psychological diagnosis or fixed label, and no learner profiling is performed here." };

export default function Page() {
  return <ComingSoonPage title={"Learning DNA"} category={"Personalised learning"} description={"A future, explainable learner profile intended to summarise learning preferences and useful progress signals where reliable data exists. It is not a psychological diagnosis or fixed label, and no learner profiling is performed here."} requiresAuth={true} nextSteps={[{"label":"AI learning roadmap","href":"/ai-learning"},{"label":"My progress","href":"/learning/progress"}]} />;
}
