"use client";

import React, { useState, useMemo } from "react";
import {
  NigerianCourse,
  getCoursesGrouped,
  searchCourses,
  POPULAR_COURSES_LIST,
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
  placeholder = "Select your target discipline or course...",
  className = "",
  required = false,
  disabled = false,
}: NigerianCourseSelectProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const grouped = useMemo(() => getCoursesGrouped(), []);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;
    return searchCourses(searchQuery);
  }, [searchQuery]);

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label
          htmlFor={id}
          className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300"
        >
          <span>{label}</span>
          <button
            type="button"
            onClick={() => setIsSearching(!isSearching)}
            className="text-[11px] font-semibold text-blue-600 dark:text-cyan-400 hover:underline cursor-pointer"
          >
            {isSearching ? "Switch to standard list" : "Type to search"}
          </button>
        </label>
      )}

      {isSearching ? (
        <div className="space-y-2">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search course title (e.g. Medicine, Software, Law, Accounting)..."
              className="w-full rounded-xl border border-blue-500/50 bg-white dark:bg-[#0E172A] px-3.5 py-2.5 pl-9 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              autoFocus
            />
            <svg
              className="absolute left-3 top-3 h-4 w-4 text-slate-400"
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
          </div>

          {searchResults && searchResults.length > 0 && (
            <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-[#0E172A] p-1 shadow-lg space-y-0.5">
              {searchResults.map((course) => {
                const isSelected = value === course.name;
                return (
                  <button
                    key={course.name}
                    type="button"
                    onClick={() => {
                      onChange(course.name, course);
                      setIsSearching(false);
                      setSearchQuery("");
                    }}
                    className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-left text-xs transition cursor-pointer ${
                      isSelected
                        ? "bg-blue-600 text-white font-bold"
                        : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.06]"
                    }`}
                  >
                    <span className="truncate pr-2">{course.name}</span>
                    <span className={`text-[10px] shrink-0 font-medium ${isSelected ? "text-blue-100" : "text-slate-400"}`}>
                      {course.faculty} &bull; {course.typicalCutoff}+
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {searchResults && searchResults.length === 0 && (
            <p className="text-xs text-slate-500 dark:text-slate-400 py-1 italic">
              No course found matching &ldquo;{searchQuery}&rdquo;.
            </p>
          )}
        </div>
      ) : (
        <select
          id={id}
          name={name}
          value={value}
          required={required}
          disabled={disabled}
          onChange={(e) => {
            const selectedCourse = Object.values(grouped).flat().find((c) => c.name === e.target.value);
            onChange(e.target.value, selectedCourse);
          }}
          className="w-full rounded-xl border border-slate-300 dark:border-white/[0.1] bg-white dark:bg-[#0E172A] px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-medium focus:border-blue-600 focus:outline-none min-h-[44px]"
        >
          <option value="" disabled>
            {placeholder}
          </option>

          <optgroup label="High-Demand Competitive Courses">
            {POPULAR_COURSES_LIST.map((cName) => (
              <option key={`pop-c-${cName}`} value={cName}>
                {cName}
              </option>
            ))}
          </optgroup>

          {Object.entries(grouped).map(([faculty, courses]) => (
            <optgroup key={faculty} label={`${faculty} (${courses.length})`}>
              {courses.map((course) => (
                <option key={course.name} value={course.name}>
                  {course.name}
                </option>
              ))}
            </optgroup>
          ))}
          <option value="Other">Other / Custom Course</option>
        </select>
      )}
    </div>
  );
}
