"use client";

import React, { useState } from "react";

interface VerificationQRCodeProps {
  url: string;
  size?: number;
  label?: string;
  className?: string;
}

export default function VerificationQRCode({
  url,
  size = 96,
  label = "Scan to Verify Authenticity",
  className = "",
}: VerificationQRCodeProps) {
  const [loadFailed, setLoadFailed] = useState(false);

  // Encode URL for QR image generation via standard trusted QR provider
  const encodedUrl = encodeURIComponent(url);
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodedUrl}&margin=2`;

  return (
    <div className={`flex flex-col items-center text-center ${className}`}>
      <div
        className="rounded-xl border border-slate-200 bg-white p-1.5 shadow-xs dark:border-slate-700 dark:bg-white"
        style={{ width: size + 12, height: size + 12 }}
      >
        {!loadFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={qrImageUrl}
            alt={label}
            width={size}
            height={size}
            className="rounded object-contain"
            onError={() => setLoadFailed(true)}
          />
        ) : (
          <div
            className="flex h-full w-full flex-col items-center justify-center rounded bg-slate-50 text-[10px] font-bold text-slate-400"
          >
            <span>📱 QR Code</span>
            <span className="text-[8px] text-blue-600 underline">Tap link</span>
          </div>
        )}
      </div>
      {label && (
        <span className="mt-1 text-[9px] font-bold uppercase tracking-wider text-slate-400 print:text-slate-600">
          {label}
        </span>
      )}
    </div>
  );
}
