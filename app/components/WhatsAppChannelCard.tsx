import { CONFIG } from "../lib/config";

export default function WhatsAppChannelCard() {
  return (
    <div className="rounded-3xl bg-gradient-to-br from-blue-600 to-blue-800 p-6 text-white shadow-md">
      <h3 className="text-2xl font-bold">Join Our WhatsApp Channel</h3>

      <p className="mt-2 text-sm leading-6 text-blue-100">
        Stay updated with notices, revision tips, and exam updates.
      </p>

      <a
        href={CONFIG.channelLink}
        target="_blank"
        rel="noreferrer"
        className="mt-6 block w-full rounded-xl bg-white px-4 py-3 text-center font-bold text-blue-700 transition hover:scale-[1.02]"
      >
        Join Channel
      </a>
    </div>
  );
}