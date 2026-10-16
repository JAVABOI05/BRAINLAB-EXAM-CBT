import type { Metadata } from "next";
import ComingSoonPage from "../../components/ComingSoonPage";

export const metadata: Metadata = { title: "My Courses", description: "A future personal view of courses a learner has joined, course progress and related resources. Course enrolment and course delivery are not active here yet." };

export default function Page() {
  return <ComingSoonPage title={"My Courses"} category={"Learner space"} description={"A future personal view of courses a learner has joined, course progress and related resources. Course enrolment and course delivery are not active here yet."} requiresAuth={true} nextSteps={[{"label":"Courses roadmap","href":"/courses"},{"label":"My dashboard","href":"/dashboard"}]} />;
}
