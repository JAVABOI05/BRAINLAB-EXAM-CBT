import type { Metadata } from "next";
import { ProductsHubClient } from "./ProductsHubClient";

export const metadata: Metadata = {
  title: "Products & Educational Ecosystem | BrainLab Academy",
  description:
    "Explore BrainLab Academy's complete educational technology ecosystem: authentic JAMB UTME CBT simulations, curriculum lessons, AI diagnostics, live classrooms, virtual STEM labs, and competitive academic arenas.",
  alternates: { canonical: "/products" },
  openGraph: {
    title: "Educational Products & Learning Suite | BrainLab Academy",
    description:
      "A unified academic ecosystem engineered for Nigerian secondary and UTME candidates: CBT practice, syllabus notes, virtual laboratories, AI diagnostics, and live tutor masterclasses.",
    url: "https://www.brainlabacademy.com.ng/products",
  },
};

export default function ProductsOverviewPage() {
  return (
    <main id="main-content" className="public-surface min-h-screen bg-slate-50 text-slate-900 dark:bg-[#070e1b] dark:text-slate-100 transition-colors">
      <ProductsHubClient />
    </main>
  );
}
