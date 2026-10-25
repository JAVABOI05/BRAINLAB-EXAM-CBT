import type { Metadata } from "next";
import HomePageClient from "./HomePageClient";

// Declare homepage metadata at the route level so crawlers receive an explicit
// description instead of relying only on inherited root-layout metadata.
export const metadata: Metadata = {
  title: "BrainLab Academy | JAMB, WAEC & NECO CBT Practice",
  description:
    "Prepare for JAMB UTME, WAEC and NECO with CBT exam practice, syllabus-aligned lessons, AI-supported revision and a connected learning experience built for Nigerian students.",
  alternates: {
    canonical: "/",
  },
};

export default function HomePage() {
  return <HomePageClient />;
}
