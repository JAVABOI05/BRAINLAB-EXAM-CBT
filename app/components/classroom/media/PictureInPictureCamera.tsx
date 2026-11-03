"use client";

import React, { useEffect, useRef, useState } from "react";

export type PipCorner = "top_left" | "top_right" | "bottom_left" | "bottom_right";
export type PipSize = "small" | "medium" | "large";

interface PictureInPictureCameraProps {
  stream: MediaStream | null;
  isEnabled: boolean;
  corner: PipCorner;
  size: PipSize;
  onChangeCorner: (corner: PipCorner) => void;
  onChangeSize: (size: PipSize) => void;
  onClose?: () => void;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
}

export default function PictureInPictureCamera({
  stream,
  isEnabled,
  corner,
  size,
  onChangeCorner,
  onChangeSize,
  onClose,
  videoRef: externalVideoRef,
}: PictureInPictureCameraProps) {
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const activeVideoRef = externalVideoRef || localVideoRef;
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (activeVideoRef.current && stream) {
      activeVideoRef.current.srcObject = stream;
      activeVideoRef.current.play().catch(() => {});
    }
  }, [activeVideoRef, stream]);

  if (!isEnabled || !stream) return null;

  // Determine dimension class
  const sizeClasses = {
    small: "w-36 h-24 sm:w-44 sm:h-28",
    medium: "w-48 h-32 sm:w-60 sm:h-40",
    large: "w-64 h-44 sm:w-80 sm:h-52",
  }[size];

  // Determine positioning class
  const cornerClasses = {
    top_left: "top-4 left-4",
    top_right: "top-4 right-4",
    bottom_left: "bottom-14 left-4 sm:bottom-4",
    bottom_right: "bottom-14 right-4 sm:bottom-4",
  }[corner];

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`absolute z-30 transition-all duration-200 select-none ${cornerClasses} ${sizeClasses}`}
    >
      <div className="relative w-full h-full rounded-2xl overflow-hidden border-2 border-[#1356E8] bg-slate-950 shadow-2xl group">
        <video
          ref={activeVideoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover -scale-x-100"
        />

        {/* Live Instructor Pill */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5 rounded-full bg-slate-950/80 px-2 py-0.5 text-[9px] font-bold text-white backdrop-blur border border-white/10 pointer-events-none">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
          <span>Tutor Camera</span>
        </div>

        {/* Floating Quick Layout Overlay (Visible on Hover/Touch) */}
        <div
          className={`absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex flex-col justify-between p-2 transition-opacity duration-150 ${
            isHovered ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none sm:opacity-0"
          }`}
        >
          {/* Top Bar: Corner Selection Controls */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-300">
              Dock Corner
            </span>
            <div className="flex items-center gap-1 bg-white/10 rounded-lg p-0.5">
              {(
                [
                  { id: "top_left", label: "↖" },
                  { id: "top_right", label: "↗" },
                  { id: "bottom_left", label: "↙" },
                  { id: "bottom_right", label: "↘" },
                ] as const
              ).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onChangeCorner(c.id)}
                  className={`h-5 w-5 rounded flex items-center justify-center text-xs font-bold transition ${
                    corner === c.id ? "bg-[#1356E8] text-white shadow-xs" : "text-slate-300 hover:text-white"
                  }`}
                  title={`Dock camera to ${c.id.replace("_", " ")}`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Bottom Bar: Size Selection & Close */}
          <div className="flex items-center justify-between pt-1 border-t border-white/15">
            <div className="flex items-center gap-1">
              {(["small", "medium", "large"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onChangeSize(s)}
                  className={`px-1.5 py-0.5 text-[9px] font-bold rounded uppercase transition ${
                    size === s ? "bg-[#1356E8] text-white" : "bg-white/10 text-slate-300 hover:text-white"
                  }`}
                >
                  {s[0]}
                </button>
              ))}
            </div>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="text-rose-400 hover:text-rose-300 text-xs font-bold p-1"
                title="Hide Camera"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
