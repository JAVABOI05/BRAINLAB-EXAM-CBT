import { permanentRedirect } from "next/navigation";

// /cbt is a deprecated entry point. The canonical CBT portal is /login.
export default function CbtRedirectPage() {
  permanentRedirect("/login");
}
