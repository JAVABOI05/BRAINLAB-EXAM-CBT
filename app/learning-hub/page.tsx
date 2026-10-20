import { permanentRedirect } from "next/navigation";

// /learning-hub is a deprecated route. The canonical Learning Hub is /learn.
export default function LearningHubRedirectPage() {
  permanentRedirect("/learn");
}
