"use client";

import React, { forwardRef } from "react";
import NextLink, { LinkProps as NextLinkProps } from "next/link";

export type LinkVariant =
  | "primary"
  | "muted"
  | "subtle"
  | "buttonPrimary"
  | "buttonSecondary"
  | "buttonOutline"
  | "buttonChannel";

export interface LinkProps
  extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof NextLinkProps>,
    NextLinkProps {
  variant?: LinkVariant;
  external?: boolean;
  className?: string;
  children: React.ReactNode;
}

const variantStyles: Record<LinkVariant, string> = {
  primary:
    "text-[var(--bl-color-brand-primary)] hover:underline font-medium inline-flex items-center",
  muted:
    "text-slate-600 dark:text-slate-400 hover:text-[var(--bl-color-text-primary)] transition-colors inline-flex items-center",
  subtle:
    "text-slate-500 dark:text-slate-400 hover:text-[var(--bl-color-brand-primary)] transition-colors inline-flex items-center",
  buttonPrimary:
    "inline-flex items-center justify-center font-semibold text-center px-5 py-2.5 min-h-[44px] rounded-xl bg-[var(--bl-color-brand-primary)] text-white hover:bg-[var(--bl-color-brand-primary-hover)] shadow-sm hover:shadow transition-all",
  buttonSecondary:
    "inline-flex items-center justify-center font-semibold text-center px-5 py-2.5 min-h-[44px] rounded-xl bg-slate-100 text-[var(--bl-color-text-primary)] hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700 transition-all",
  buttonOutline:
    "inline-flex items-center justify-center font-semibold text-center px-5 py-2.5 min-h-[44px] rounded-xl bg-transparent text-[var(--bl-color-text-primary)] hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-slate-300 dark:border-slate-700 transition-all",
  buttonChannel:
    "inline-flex items-center justify-center font-bold text-center px-5 py-2.5 min-h-[44px] rounded-xl bg-[var(--bl-color-brand-channel)] text-slate-950 hover:bg-[var(--bl-color-brand-channel-hover)] shadow-sm hover:shadow transition-all",
};

export const Link = forwardRef<HTMLAnchorElement, LinkProps>(
  (
    {
      href,
      variant = "primary",
      external = false,
      className = "",
      children,
      target,
      rel,
      ...props
    },
    ref
  ) => {
    const isExternal =
      external || (typeof href === "string" && (href.startsWith("http") || href.startsWith("tel:") || href.startsWith("mailto:")));

    const baseClasses = `bl-focus-ring ${variantStyles[variant]} ${className}`;

    if (isExternal) {
      return (
        <a
          ref={ref}
          href={typeof href === "string" ? href : href.toString()}
          target={target || "_blank"}
          rel={rel || "noopener noreferrer"}
          className={baseClasses}
          {...props}
        >
          {children}
          {typeof href === "string" && href.startsWith("http") && !variant.startsWith("button") && (
            <span className="sr-only"> (opens in new window)</span>
          )}
        </a>
      );
    }

    return (
      <NextLink ref={ref} href={href} className={baseClasses} {...props}>
        {children}
      </NextLink>
    );
  }
);

Link.displayName = "Link";
