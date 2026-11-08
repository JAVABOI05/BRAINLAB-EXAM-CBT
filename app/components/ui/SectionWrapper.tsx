import React from "react";

export interface SectionWrapperProps extends React.HTMLAttributes<HTMLElement> {
  id?: string;
  badge?: string;
  title?: string;
  subtitle?: string;
  compact?: boolean;
  bleed?: boolean;
  containerClassName?: string;
}

export function SectionWrapper({
  id,
  badge,
  title,
  subtitle,
  compact = false,
  bleed = false,
  className = "",
  containerClassName = "",
  children,
  ...props
}: SectionWrapperProps) {
  const pyClass = compact ? "py-10 sm:py-14" : "py-16 sm:py-20 lg:py-24";

  return (
    <section
      id={id}
      className={`relative w-full overflow-hidden ${pyClass} ${className}`}
      {...props}
    >
      <div
        className={
          bleed
            ? "w-full"
            : `mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 ${containerClassName}`
        }
      >
        {(badge || title || subtitle) && (
          <div className="mb-12 text-center max-w-3xl mx-auto">
            {badge && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-[var(--bl-color-brand-primary)] border border-blue-200/60 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60 mb-3">
                {badge}
              </span>
            )}
            {title && (
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[var(--bl-color-text-primary)] tracking-tight">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="mt-4 text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>
        )}
        {children}
      </div>
    </section>
  );
}
