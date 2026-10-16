import type { Metadata } from "next";
import ComingSoonPage from "../../components/ComingSoonPage";

export const metadata: Metadata = { title: "Student and User Management", description: "A planned admin workspace for reviewing learner accounts, account status and support needs. No user list or personal data is loaded here. Any future implementation requires server-side admin authorization, audited actions and least-privilege database policies.", robots: { index: false, follow: false } };

export default function Page() {
  return <ComingSoonPage title={"Student and User Management"} category={"Admin workspace"} description={"A planned admin workspace for reviewing learner accounts, account status and support needs. No user list or personal data is loaded here. Any future implementation requires server-side admin authorization, audited actions and least-privilege database policies."} requiresAdmin={true} nextSteps={[{"label":"Admin dashboard","href":"/admin/dashboard"}]} />;
}
