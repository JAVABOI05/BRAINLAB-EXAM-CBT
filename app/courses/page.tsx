import { permanentRedirect } from "next/navigation";

// Canonical Learning Hub route is /learn.
export default function CoursesRedirectPage() {
  permanentRedirect("/learn");
}
