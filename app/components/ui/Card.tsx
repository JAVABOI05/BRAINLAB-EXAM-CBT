import React from "react";

export type CardVariant = "default" | "raised" | "outlined" | "interactive" | "sunken";
export type CardPadding = "none" | "sm" | "md" | "lg";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: CardPadding;
  as?: React.ElementType;
}

const variantStyles: Record<CardVariant, string> = {
  default:
    "bg-[var(--bl-color-surface)] border border-slate-200/80 dark:border-slate-800 shadow-sm",
  raised:
    "bg-[var(--bl-color-surface)] border border-slate-200/60 dark:border-slate-700/80 shadow-md",
  outlined:
    "bg-transparent border border-slate-300 dark:border-slate-800",
  interactive:
    "bg-[var(--bl-color-surface)] border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-lg hover:border-blue-400 dark:hover:border-blue-500/60 hover:-translate-y-1 transition-all duration-200 cursor-pointer",
  sunken:
    "bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80",
};

const paddingStyles: Record<CardPadding, string> = {
  none: "",
  sm: "p-4 sm:p-5",
  md: "p-6 sm:p-7",
  lg: "p-8 sm:p-10",
};

export function Card({
  variant = "default",
  padding = "md",
  as: Component = "div",
  className = "",
  children,
  ...props
}: CardProps) {
  return (
    <Component
      className={`rounded-2xl text-[var(--bl-color-text-primary)] ${variantStyles[variant]} ${paddingStyles[padding]} ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}
