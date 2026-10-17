import type { Metadata } from "next";
import ComingSoonPage from "../../components/ComingSoonPage";

export const metadata: Metadata = { title: "Security and System Settings", description: "A planned administrative workspace for security review, system configuration and audit visibility. This placeholder changes no settings. Sensitive operations must be implemented server-side and tested against non-admin access.", robots: { index: false, follow: false } };

export default function Page() {
  return <ComingSoonPage title={"Security and System Settings"} category={"Admin workspace"} description={"A planned administrative workspace for security review, system configuration and audit visibility. This placeholder changes no settings. Sensitive operations must be implemented server-side and tested against non-admin access."} requiresAdmin={true} requiredPermission="security.settings.manage" nextSteps={[{"label":"Admin dashboard","href":"/admin/dashboard"}]} />;
}
