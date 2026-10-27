import type { Metadata } from "next";
import HomePageClient from "./HomePageClient";

// Declare homepage metadata at the route level so crawlers receive an explicit
// description instead of relying only on inherited root-layout metadata.
export const metadata: Metadata = {
  title: "BrainLab Academy | JAMB UTME CBT Practice & Syllabus Revision",
  description:
    "Prepare for JAMB UTME with authentic timed CBT exam simulations, curriculum-aligned topic notes, instant diagnostic scoring, and low-data offline protection built for Nigerian candidates.",
  alternates: {
    canonical: "/",
  },
};

export default function HomePage() {
  return <HomePageClient />;
}
