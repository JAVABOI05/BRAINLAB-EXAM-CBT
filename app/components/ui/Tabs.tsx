"use client";

import React, { useId, useState, useRef } from "react";

export interface TabItem {
  id: string;
  label: string;
  content: React.ReactNode;
  badge?: string;
  disabled?: boolean;
}

export interface TabsProps {
  tabs: TabItem[];
  defaultTabId?: string;
  onChange?: (tabId: string) => void;
  className?: string;
}

export function Tabs({
  tabs,
  defaultTabId,
  onChange,
  className = "",
}: TabsProps) {
  const [activeTabId, setActiveTabId] = useState<string>(
    defaultTabId || (tabs[0] ? tabs[0].id : "")
  );

  const baseId = useId();
  const tabListRef = useRef<HTMLDivElement>(null);

  const handleSelect = (id: string) => {
    setActiveTabId(id);
    onChange?.(id);
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    const availableTabs = tabs.filter((t) => !t.disabled);
    const currentIndex = availableTabs.findIndex((t) => t.id === tabs[index].id);

    if (e.key === "ArrowRight") {
      e.preventDefault();
      const nextTab = availableTabs[(currentIndex + 1) % availableTabs.length];
      if (nextTab) {
        handleSelect(nextTab.id);
        const nextButton = tabListRef.current?.querySelector<HTMLButtonElement>(
          `#${baseId}-tab-${nextTab.id}`
        );
        nextButton?.focus();
      }
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      const prevTab =
        availableTabs[(currentIndex - 1 + availableTabs.length) % availableTabs.length];
      if (prevTab) {
        handleSelect(prevTab.id);
        const prevButton = tabListRef.current?.querySelector<HTMLButtonElement>(
          `#${baseId}-tab-${prevTab.id}`
        );
        prevButton?.focus();
      }
    }
  };

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  return (
    <div className={`w-full ${className}`}>
      {/* Tab Navigation List */}
      <div
        ref={tabListRef}
        role="tablist"
        aria-orientation="horizontal"
        className="flex space-x-1.5 overflow-x-auto rounded-2xl bg-slate-100 p-1.5 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 scrollbar-none"
      >
        {tabs.map((tab, idx) => {
          const isSelected = tab.id === activeTabId;
          const tabId = `${baseId}-tab-${tab.id}`;
          const panelId = `${baseId}-panel-${tab.id}`;

          return (
            <button
              key={tab.id}
              id={tabId}
              type="button"
              role="tab"
              aria-selected={isSelected}
              aria-controls={panelId}
              tabIndex={isSelected ? 0 : -1}
              disabled={tab.disabled}
              onClick={() => handleSelect(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              className={`
                flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold
                transition-all duration-180 bl-focus-ring min-h-[44px]
                ${
                  isSelected
                    ? "bg-[var(--bl-color-surface)] text-[var(--bl-color-brand-primary)] shadow-sm dark:text-blue-400"
                    : "text-slate-600 hover:text-[var(--bl-color-text-primary)] dark:text-slate-400 dark:hover:text-slate-200"
                }
                ${tab.disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}
              `}
            >
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    isSelected
                      ? "bg-blue-100 text-[var(--bl-color-brand-primary)] dark:bg-blue-950 dark:text-blue-300"
                      : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active Tab Panel */}
      {activeTab && (
        <div
          id={`${baseId}-panel-${activeTab.id}`}
          role="tabpanel"
          aria-labelledby={`${baseId}-tab-${activeTab.id}`}
          className="mt-6 focus:outline-none"
          tabIndex={0}
        >
          {activeTab.content}
        </div>
      )}
    </div>
  );
}
