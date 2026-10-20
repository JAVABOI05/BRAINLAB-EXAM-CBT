import { redirect } from "next/navigation";

// Backwards-compatible route: the old Learning Lab is now split between
// Learning Hub and AI Learning. The interactive mission planner lives in AI Learning.
export default function LegacyLearningRoute() {
  redirect("/ai-learning");
}
