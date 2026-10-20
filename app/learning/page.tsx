import { permanentRedirect } from "next/navigation";

// Backwards-compatible route: the old Learning Lab is now split between
// Learning Hub (/learn) and AI Learning (/ai-learning).
export default function LegacyLearningRoute() {
  permanentRedirect("/ai-learning");
}
