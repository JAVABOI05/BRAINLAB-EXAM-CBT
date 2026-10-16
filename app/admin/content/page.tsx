import type { Metadata } from "next";
import ComingSoonPage from "../../components/ComingSoonPage";

export const metadata: Metadata = { title: "Content and Resource Management", description: "A planned workspace for managing reviewed learning resources and future course content. No content records are loaded or edited here. Publishing tools need approval workflows and server-side authorization.", robots: { index: false, follow: false } };

export default function Page() {
  return <ComingSoonPage title={"Content and Resource Management"} category={"Admin workspace"} description={"A planned workspace for managing reviewed learning resources and future course content. No content records are loaded or edited here. Publishing tools need approval workflows and server-side authorization."} requiresAdmin={true} nextSteps={[{"label":"Admin dashboard","href":"/admin/dashboard"}]} />;
}
