import React from "react";

export type BadgeVariant =
  | "brand"
  | "neutral"
  | "success"
  | "warning"
  | "error"
  | "coral"
  | "channel";

export type BadgeSize = "sm" | "md";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
}

const variantStyles: Record<BadgeVariant, { container: string; dot: string }> = {
  brand: {
    container:
      "bg-blue-50 text-[var(--bl-color-brand-primary)] border border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60",
    dot: "bg-[var(--bl-color-brand-primary)]",
  },
  neutral: {
    container:
      "bg-slate-100 text-slate-700 border border-slate-200/80 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
    dot: "bg-slate-500",
  },
  success: {
    container:
      "bg-emerald-50 text-emerald-800 border border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60",
    dot: "bg-emerald-500",
  },
  warning: {
    container:
      "bg-amber-50 text-amber-800 border border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60",
    dot: "bg-amber-500",
  },
  error: {
    container:
      "bg-red-50 text-red-800 border border-red-200/80 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800/60",
    dot: "bg-red-500",
  },
  coral: {
    container:
      "bg-orange-50 text-[var(--bl-color-brand-coral)] border border-orange-200/80 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800/60",
    dot: "bg-[var(--bl-color-brand-coral)]",
  },
  channel: {
    container:
      "bg-emerald-500/10 text-emerald-700 border border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40 font-bold",
    dot: "bg-[var(--bl-color-brand-channel)]",
  },
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: "px-2.5 py-0.5 text-xs gap-1.5",
  md: "px-3 py-1 text-xs sm:text-sm gap-2",
};

export function Badge({
  variant = "brand",
  size = "sm",
  dot = false,
  className = "",
  children,
  ...props
}: BadgeProps) {
  const styles = variantStyles[variant];

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full ${styles.container} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${styles.dot}`}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}
