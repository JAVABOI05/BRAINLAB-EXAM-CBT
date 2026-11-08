"use client";

import React, { forwardRef, useId } from "react";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  helperText?: string;
  label?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, id, className = "", ...props }, ref) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-semibold text-[var(--bl-color-text-primary)]"
          >
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={Boolean(error)}
          aria-describedby={
            error ? errorId : helperText ? helperId : undefined
          }
          className={`
            w-full rounded-xl border px-4 py-2.5 text-sm min-h-[44px]
            bg-[var(--bl-color-surface)] text-[var(--bl-color-text-primary)]
            placeholder:text-slate-400 dark:placeholder:text-slate-500
            transition-all duration-180 bl-focus-ring
            disabled:opacity-50 disabled:cursor-not-allowed
            ${
              error
                ? "border-red-500 focus:border-red-500"
                : "border-slate-300 dark:border-slate-700 focus:border-[var(--bl-color-brand-primary)]"
            }
            ${className}
          `}
          {...props}
        />
        {error && (
          <p id={errorId} className="text-xs font-medium text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
        {!error && helperText && (
          <p id={helperId} className="text-xs text-slate-500 dark:text-slate-400">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
  helperText?: string;
  label?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helperText, id, className = "", rows = 4, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-semibold text-[var(--bl-color-text-primary)]"
          >
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          rows={rows}
          aria-invalid={Boolean(error)}
          aria-describedby={
            error ? errorId : helperText ? helperId : undefined
          }
          className={`
            w-full rounded-xl border px-4 py-3 text-sm
            bg-[var(--bl-color-surface)] text-[var(--bl-color-text-primary)]
            placeholder:text-slate-400 dark:placeholder:text-slate-500
            transition-all duration-180 bl-focus-ring
            disabled:opacity-50 disabled:cursor-not-allowed
            ${
              error
                ? "border-red-500 focus:border-red-500"
                : "border-slate-300 dark:border-slate-700 focus:border-[var(--bl-color-brand-primary)]"
            }
            ${className}
          `}
          {...props}
        />
        {error && (
          <p id={errorId} className="text-xs font-medium text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
        {!error && helperText && (
          <p id={helperId} className="text-xs text-slate-500 dark:text-slate-400">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
  helperText?: string;
  label?: string;
  options?: { label: string; value: string | number }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, helperText, id, options, className = "", children, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-semibold text-[var(--bl-color-text-primary)]"
          >
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <select
          ref={ref}
          id={inputId}
          aria-invalid={Boolean(error)}
          aria-describedby={
            error ? errorId : helperText ? helperId : undefined
          }
          className={`
            w-full rounded-xl border px-4 py-2.5 text-sm min-h-[44px]
            bg-[var(--bl-color-surface)] text-[var(--bl-color-text-primary)]
            transition-all duration-180 bl-focus-ring
            disabled:opacity-50 disabled:cursor-not-allowed
            ${
              error
                ? "border-red-500 focus:border-red-500"
                : "border-slate-300 dark:border-slate-700 focus:border-[var(--bl-color-brand-primary)]"
            }
            ${className}
          `}
          {...props}
        >
          {options
            ? options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))
            : children}
        </select>
        {error && (
          <p id={errorId} className="text-xs font-medium text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
        {!error && helperText && (
          <p id={helperId} className="text-xs text-slate-500 dark:text-slate-400">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);
Select.displayName = "Select";
