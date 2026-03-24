import AccessCodeSupport from "./AccessCodeSupport";
import CandidateLogin from "./CandidateLogin";
import ResultSection from "./ResultSection";
import RevisionClasses from "./RevisionClasses";
import WhatsAppChannelCard from "./WhatsAppChannelCard";

export default function HomeLayout() {
  return (
    <main className="min-h-screen bg-[#dfe8f7] px-4 py-8">
      <h1 className="mb-8 text-center text-3xl font-bold text-gray-800 md:text-5xl">
        BRAINLAB CBT Exam Centre
      </h1>

      <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-3">
        <AccessCodeSupport />
        <CandidateLogin />
        <WhatsAppChannelCard />
      </div>

      <ResultSection />
      <RevisionClasses />
    </main>
  );
}