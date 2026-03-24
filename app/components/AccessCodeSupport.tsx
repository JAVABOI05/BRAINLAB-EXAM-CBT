import { CONFIG } from "../lib/config";

export default function AccessCodeSupport() {
  const accessLink = `https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(
    CONFIG.accessCodeMessage
  )}`;

  return (
    <div className="rounded-3xl bg-white p-6 shadow-md">
      <h3 className="text-2xl font-bold text-gray-800">
        Access Code Support
      </h3>

      <div className="mt-4 rounded-2xl bg-green-50 p-4">
        <p className="font-semibold text-gray-800">Need an Access Code?</p>
        <p className="mt-2 text-sm leading-6 text-gray-600">
          Send a WhatsApp message to request a valid exam code.
        </p>

        <a
          href={accessLink}
          target="_blank"
          rel="noreferrer"
          className="mt-4 block w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-800 px-4 py-3 text-center font-semibold text-white shadow-md transition hover:scale-[1.02]"
        >
          Contact Us on WhatsApp
        </a>
      </div>

      <p className="mt-5 text-sm leading-7 text-gray-600">
        {CONFIG.supportNumbers[0]}
        <br />
        {CONFIG.supportNumbers[1]}
      </p>
    </div>
  );
}