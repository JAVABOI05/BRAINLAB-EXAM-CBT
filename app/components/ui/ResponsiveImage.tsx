"use client";

import React, { useState } from "react";
import Image, { ImageProps } from "next/image";

export interface ResponsiveImageProps extends Omit<ImageProps, "onError"> {
  fallbackText?: string;
  fallbackIcon?: React.ReactNode;
  containerClassName?: string;
}

export function ResponsiveImage({
  src,
  alt,
  fallbackText,
  fallbackIcon,
  containerClassName = "",
  className = "",
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
  ...props
}: ResponsiveImageProps) {
  const [hasError, setHasError] = useState(false);

  if (hasError || !src) {
    return (
      <div
        role="img"
        aria-label={alt || "Image placeholder"}
        className={`flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-100 p-6 text-center dark:border-slate-800 dark:bg-slate-900/60 ${containerClassName}`}
      >
        {fallbackIcon || (
          <svg
            className="h-10 w-10 text-slate-400 dark:text-slate-500 mb-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
            />
          </svg>
        )}
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
          {fallbackText || alt || "Image unavailable"}
        </p>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${containerClassName}`}>
      <Image
        src={src}
        alt={alt}
        sizes={sizes}
        onError={() => setHasError(true)}
        className={`object-cover transition-opacity duration-200 ${className}`}
        {...props}
      />
    </div>
  );
}
