import type { Metadata } from "next";
import ComingSoonPage from "../components/ComingSoonPage";

export const metadata: Metadata = { title: "Skills Passport", description: "A proposed learner-controlled portfolio for recording projects, demonstrated skills and selected learning milestones. It is not a qualification, accreditation or certificate service, and no credentials are issued here." };

export default function Page() {
  return <ComingSoonPage title={"Skills Passport"} category={"Skills and portfolio"} description={"A proposed learner-controlled portfolio for recording projects, demonstrated skills and selected learning milestones. It is not a qualification, accreditation or certificate service, and no credentials are issued here."} requiresAuth={true} nextSteps={[{"label":"Courses roadmap","href":"/courses"},{"label":"My achievements","href":"/learning/achievements"}]} />;
}
