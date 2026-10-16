import type { Metadata } from "next";
import ComingSoonPage from "../components/ComingSoonPage";

export const metadata: Metadata = { title: "CBT and Exam Practice", description: "A dedicated home for discovering available Computer-Based Test practice, understanding the candidate workflow and preparing for an exam. The existing CBT portal remains the live entry point; this overview does not invent exam categories or promise unverified features." };

export default function Page() {
  return <ComingSoonPage title={"CBT and Exam Practice"} category={"Exam preparation"} description={"A dedicated home for discovering available Computer-Based Test practice, understanding the candidate workflow and preparing for an exam. The existing CBT portal remains the live entry point; this overview does not invent exam categories or promise unverified features."} requiresAuth={false} nextSteps={[{"label":"Open current CBT portal","href":"/login"},{"label":"Plan your revision","href":"/learning/revision"}]} />;
}
