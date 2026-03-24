import { CONFIG } from "../lib/config";

export default function RevisionClasses() {
  const revisionLink = `https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(
    CONFIG.revisionMessage
  )}`;

  return (
    <div className="mx-auto mt-8 max-w-6xl rounded-3xl bg-white p-6 shadow-md">
      <h3 className="text-2xl font-bold text-gray-800">
        Join Our 2 Weeks Final Revision Classes
      </h3>

      <p className="mt-2 text-sm leading-6 text-gray-600">
        Prepare thoroughly before the exam with our structured revision
        sessions.
      </p>

      <a
        href={revisionLink}
        target="_blank"
        rel="noreferrer"
        className="mt-4 block w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-800 px-4 py-3 text-center font-semibold text-white shadow-md transition hover:scale-[1.02]"
      >
        Join Revision Classes
      </a>
    </div>
  );
}