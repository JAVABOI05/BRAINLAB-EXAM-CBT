import type { Metadata } from "next";
import ComingSoonPage from "../components/ComingSoonPage";

export const metadata: Metadata = { title: "Knowledge Base", description: "A future searchable knowledge base for topic guides, common questions and reviewed explanations. No articles or search index are published on this placeholder yet." };

export default function Page() {
  return <ComingSoonPage title={"Knowledge Base"} category={"Learning library"} description={"A future searchable knowledge base for topic guides, common questions and reviewed explanations. No articles or search index are published on this placeholder yet."} requiresAuth={false} nextSteps={[{"label":"Learning resources","href":"/resources"},{"label":"Help and FAQs","href":"/faq"}]} />;
}
