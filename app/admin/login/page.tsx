import { redirect } from "next/navigation";

// The private entry and the public site share one sign-in experience.
// The proxy still hides this route from direct unauthenticated requests.
export default function PrivateSignInRedirect() {
  redirect("/account");
}
