"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  NigerianCourse,
  getAllCourses,
  getCoursesByFaculty,
  searchCourses,
  POPULAR_COURSES_LIST,
  FACULTIES,
} from "@/app/lib/nigerianInstitutions";

interface NigerianCourseSelectProps {
  id?: string;
  name?: string;
  value: string;
  onChange: (value: string, course?: NigerianCourse) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  required?: boolean;
  disabled?: boolean;
}

export function NigerianCourseSelect({
  id = "course-select",
  name = "course",
  value,
  onChange,
  label,
  placeholder = "Search or select degree programme (e.g. Medicine, Software, Law, Accounting)...",
  className = "",
  required = false,
  disabled = false,
}: NigerianCourseSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFaculty, setSelectedFaculty] = useState<string>("All");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery("");
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen]);

  // Compute filtered courses
  const filteredCourses = useMemo(() => {
    const facultyFilter = selectedFaculty === "All" ? undefined : selectedFaculty;

    if (!searchQuery.trim()) {
      const pool = facultyFilter ? getCoursesByFaculty(facultyFilter) : getAllCourses();
      return pool.slice(0, 50);
    }

    return searchCourses(searchQuery, facultyFilter);
  }, [searchQuery, selectedFaculty]);

  const handleSelect = (course: NigerianCourse) => {
    onChange(course.name, course);
    setIsOpen(false);
    setSearchQuery("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    setSearchQuery("");
    inputRef.current?.focus();
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < filteredCourses.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filteredCourses.length - 1));
    } else if (e.key === "Enter" && highlightedIndex >= 0 && highlightedIndex < filteredCourses.length) {
      e.preventDefault();
      handleSelect(filteredCourses[highlightedIndex]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setSearchQuery("");
    }
  };

  return (
    <div ref={containerRef} className={`relative space-y-1.5 ${className}`}>
      {/* Hidden input for standard HTML form compatibility */}
      <input type="hidden" name={name} value={value} required={required} />

      {label && (
        <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
          <label htmlFor={id}>{label}</label>
          <span className="text-[11px] font-normal text-slate-400">
            100+ Accredited Programmes
          </span>
        </div>
      )}

      {/* Combobox Trigger & Search Input */}
      <div className="relative">
        <div
          onClick={() => {
            if (!disabled) {
              setIsOpen(true);
              inputRef.current?.focus();
            }
          }}
          className={`flex min-h-[44px] w-full items-center rounded-xl border bg-white dark:bg-[#0E172A] px-3.5 py-2 transition-all cursor-text ${
            disabled
              ? "opacity-60 cursor-not-allowed bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-white/5"
              : isOpen
              ? "border-blue-600 ring-2 ring-blue-500/20 shadow-sm"
              : "border-slate-300 dark:border-white/10 hover:border-slate-400 dark:hover:border-white/20"
          }`}
        >
          {/* Search Icon */}
          <svg
            className="mr-2.5 h-4 w-4 shrink-0 text-slate-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>

          {/* Interactive Input */}
          <input
            ref={inputRef}
            id={id}
            type="text"
            role="combobox"
            aria-expanded={isOpen}
            aria-autocomplete="list"
            aria-haspopup="listbox"
            disabled={disabled}
            value={isOpen ? searchQuery : value || ""}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (!isOpen) setIsOpen(true);
              setHighlightedIndex(0);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={value ? value : placeholder}
            className="w-full bg-transparent text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 placeholder:font-normal focus:outline-none"
          />

          {/* Clear & Chevron Controls */}
          <div className="ml-2 flex items-center gap-1.5 shrink-0">
            {value && !disabled && (
              <button
                type="button"
                onClick={handleClear}
                aria-label="Clear selection"
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/10 dark:hover:text-slate-200 transition"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}

            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation();
                if (!disabled) {
                  setIsOpen(!isOpen);
                  if (!isOpen) inputRef.current?.focus();
                }
              }}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              aria-label={isOpen ? "Close suggestions" : "Open suggestions"}
            >
              <svg
                className={`h-4 w-4 transition-transform duration-200 ${isOpen ? "rotate-180 text-blue-600" : ""}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Combobox Dropdown Popover */}
      {isOpen && !disabled && (
        <div
          ref={listRef}
          role="listbox"
          className="absolute z-50 left-0 right-0 mt-1 max-h-80 w-full overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0E172A] shadow-2xl animate-in fade-in slide-in-from-top-2 duration-150"
        >
          {/* Faculty Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto p-2 border-b border-slate-100 dark:border-white/5 bg-slate-50/75 dark:bg-white/[0.02] scrollbar-none text-[10px]">
            <button
              type="button"
              onClick={() => setSelectedFaculty("All")}
              className={`rounded-lg px-2.5 py-1 font-bold whitespace-nowrap transition cursor-pointer ${
                selectedFaculty === "All"
                  ? "bg-blue-600 text-white shadow-2xs"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10"
              }`}
            >
              All Disciplines
            </button>
            {FACULTIES.map((fac) => (
              <button
                key={fac}
                type="button"
                onClick={() => setSelectedFaculty(fac)}
                className={`rounded-lg px-2.5 py-1 font-bold whitespace-nowrap transition cursor-pointer ${
                  selectedFaculty === fac
                    ? "bg-blue-600 text-white shadow-2xs"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10"
                }`}
              >
                {fac}
              </button>
            ))}
          </div>

          {/* Popular Quick-Picks when input is blank */}
          {!searchQuery.trim() && selectedFaculty === "All" && (
            <div className="p-2.5 border-b border-slate-100 dark:border-white/5 bg-blue-50/40 dark:bg-blue-950/20">
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 dark:text-cyan-300 block mb-1.5">
                Top High-Demand Programmes:
              </span>
              <div className="flex flex-wrap gap-1">
                {POPULAR_COURSES_LIST.slice(0, 6).map((pop) => (
                  <button
                    key={pop}
                    type="button"
                    onClick={() => {
                      onChange(pop);
                      setIsOpen(false);
                      setSearchQuery("");
                    }}
                    className="rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:text-slate-300 hover:border-blue-500 hover:text-blue-600 dark:hover:text-cyan-300 transition"
                  >
                    {pop.split(" (")[0]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Results List */}
          <div className="max-h-60 overflow-y-auto p-1.5 space-y-0.5 divide-y divide-slate-100 dark:divide-white/5">
            {filteredCourses.length > 0 ? (
              filteredCourses.map((course, idx) => {
                const isSelected = value === course.name;
                const isHighlighted = idx === highlightedIndex;

                return (
                  <button
                    key={course.name}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(course)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs transition cursor-pointer min-h-[44px] ${
                      isSelected
                        ? "bg-blue-600 text-white font-bold"
                        : isHighlighted
                        ? "bg-blue-50 text-blue-900 dark:bg-white/[0.08] dark:text-white"
                        : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/[0.04]"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate pr-2">
                      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10px] font-black ${
                        isSelected
                          ? "bg-white/20 text-white"
                          : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-cyan-300"
                      }`}>
                        C
                      </span>
                      <span className="truncate">
                        {course.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[10px] font-medium ${
                        isSelected ? "text-blue-100" : "text-slate-400 dark:text-slate-500"
                      }`}>
                        {course.faculty} &bull; {course.typicalCutoff}+
                      </span>
                      {isSelected && (
                        <svg className="h-4 w-4 shrink-0 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="py-6 text-center">
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  No programme found matching &ldquo;{searchQuery}&rdquo;
                </p>
                <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                  You can type any custom course title in your profile settings.
                </p>
              </div>
            )}
          </div>

          {/* Footer Count */}
          <div className="px-3 py-1.5 border-t border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-slate-900/60 text-[10px] text-slate-400 flex items-center justify-between">
            <span>Showing {filteredCourses.length} accredited courses</span>
            <span className="font-mono">ESC to close</span>
          </div>
        </div>
      )}
    </div>
  );
}
