import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Learning Lab",
  description:
    "Build a purposeful learning session, explore the mastery-map concept and practise explaining, solving, applying and reviewing ideas with BrainLab Academy.",
};

export default function LearningLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
