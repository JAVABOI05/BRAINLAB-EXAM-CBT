"use client";

import React, { useId, useState } from "react";

export interface AccordionItemData {
  id: string;
  title: string;
  content: React.ReactNode;
  defaultExpanded?: boolean;
}

export interface AccordionProps {
  items: AccordionItemData[];
  allowMultiple?: boolean;
  className?: string;
  itemClassName?: string;
  headerClassName?: string;
  panelClassName?: string;
}

export function Accordion({
  items,
  allowMultiple = false,
  className = "",
  itemClassName,
  headerClassName,
  panelClassName,
}: AccordionProps) {
  const [expandedIds, setExpandedIds] = useState<string[]>(() =>
    items.filter((item) => item.defaultExpanded).map((item) => item.id)
  );

  const baseId = useId();

  const toggle = (id: string) => {
    setExpandedIds((current) => {
      if (allowMultiple) {
        return current.includes(id)
          ? current.filter((item) => item !== id)
          : [...current, id];
      }
      return current.includes(id) ? [] : [id];
    });
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {items.map((item) => {
        const isExpanded = expandedIds.includes(item.id);
        const headerId = `${baseId}-header-${item.id}`;
        const panelId = `${baseId}-panel-${item.id}`;

        return (
          <div
            key={item.id}
            className={itemClassName || "rounded-2xl border border-slate-200/80 bg-[var(--bl-color-surface)] dark:border-slate-800 transition-colors"}
          >
            <h3>
              <button
                id={headerId}
                type="button"
                aria-expanded={isExpanded}
                aria-controls={panelId}
                onClick={() => toggle(item.id)}
                className={headerClassName || "flex w-full items-center justify-between px-6 py-5 text-left text-base font-semibold text-[var(--bl-color-text-primary)] bl-focus-ring rounded-2xl"}
              >
                <span>{item.title}</span>
                <span
                  className={`ml-4 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-transform duration-200 dark:bg-slate-800 dark:text-slate-300 ${
                    isExpanded ? "rotate-180 bg-blue-100 text-[var(--bl-color-brand-primary)] dark:bg-blue-950/60" : ""
                  }`}
                  aria-hidden="true"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="2.5"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                    />
                  </svg>
                </span>
              </button>
            </h3>
            {isExpanded && (
              <div
                id={panelId}
                role="region"
                aria-labelledby={headerId}
                className={panelClassName || "px-6 pb-6 pt-1 text-slate-600 dark:text-slate-300 leading-relaxed text-sm sm:text-base border-t border-slate-100 dark:border-slate-800/80"}
              >
                {item.content}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
