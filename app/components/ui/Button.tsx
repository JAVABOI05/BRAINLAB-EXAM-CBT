"use client";

import React, { forwardRef } from "react";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "coral"
  | "channel";

export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--bl-color-brand-primary)] text-white hover:bg-[var(--bl-color-brand-primary-hover)] shadow-sm hover:shadow active:scale-[0.98] border border-transparent",
  secondary:
    "bg-slate-100 text-[var(--bl-color-text-primary)] hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700 active:scale-[0.98]",
  outline:
    "bg-transparent text-[var(--bl-color-text-primary)] hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-slate-300 dark:border-slate-700 active:scale-[0.98]",
  ghost:
    "bg-transparent text-[var(--bl-color-text-primary)] hover:bg-slate-100/80 dark:hover:bg-slate-800/60 border border-transparent active:scale-[0.98]",
  coral:
    "bg-[var(--bl-color-brand-coral)] text-white hover:bg-[var(--bl-color-brand-coral-hover)] shadow-sm hover:shadow active:scale-[0.98] border border-transparent",
  channel:
    "bg-[var(--bl-color-brand-channel)] text-slate-950 font-bold hover:bg-[var(--bl-color-brand-channel-hover)] shadow-sm hover:shadow active:scale-[0.98] border border-emerald-600/20",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-3.5 py-1.5 text-xs min-h-[38px] rounded-lg gap-1.5",
  md: "px-5 py-2.5 text-sm min-h-[44px] rounded-xl gap-2",
  lg: "px-6 py-3.5 text-base min-h-[50px] rounded-xl gap-2.5",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      isLoading = false,
      fullWidth = false,
      leftIcon,
      rightIcon,
      disabled,
      className = "",
      children,
      type = "button",
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={`
          inline-flex items-center justify-center font-semibold text-center
          transition-all duration-180 ease-out select-none
          bl-focus-ring
          disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${fullWidth ? "w-full" : ""}
          ${className}
        `}
        {...props}
      >
        {isLoading ? (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"
            />
          </svg>
        ) : (
          leftIcon
        )}
        <span>{children}</span>
        {!isLoading && rightIcon}
      </button>
    );
  }
);

Button.displayName = "Button";
