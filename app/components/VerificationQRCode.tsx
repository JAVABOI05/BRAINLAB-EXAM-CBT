"use client";

import React, { useMemo } from "react";
import { generateQrMatrix } from "@/app/lib/qrCode";

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
  const { pathData, totalGrid } = useMemo(() => {
    try {
      const qr = generateQrMatrix(url, "M");
      const margin = 2;
      const totalGrid = qr.size + margin * 2;
      const parts: string[] = [];
      for (let r = 0; r < qr.size; r++) {
        for (let c = 0; c < qr.size; c++) {
          if (qr.modules[r][c]) {
            parts.push(`M${c + margin},${r + margin}h1v1h-1z`);
          }
        }
      }
      return { pathData: parts.join(" "), totalGrid };
    } catch {
      return { pathData: "", totalGrid: 33 };
    }
  }, [url]);

  return (
    <div className={`flex flex-col items-center text-center ${className}`}>
      <div
        className="rounded-xl border border-slate-200 bg-white p-1.5 shadow-xs dark:border-slate-700 dark:bg-white"
        style={{ width: size + 12, height: size + 12 }}
      >
        {pathData ? (
          <svg
            viewBox={`0 0 ${totalGrid} ${totalGrid}`}
            width={size}
            height={size}
            shapeRendering="crispEdges"
            aria-label={label}
            className="rounded"
          >
            <rect width={totalGrid} height={totalGrid} fill="#ffffff" />
            <path d={pathData} fill="#012153" />
          </svg>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center rounded bg-slate-50 text-[10px] font-bold text-slate-400">
            <span>QR Code</span>
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
