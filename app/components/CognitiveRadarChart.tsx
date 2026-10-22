"use client";

import React, { useState } from "react";

interface RadarDimension {
  axis: string;
  score: number;
  benchmark: number;
  description: string;
}

interface CognitiveRadarChartProps {
  dimensions: RadarDimension[];
  size?: number;
}

export default function CognitiveRadarChart({
  dimensions,
  size = 360,
}: CognitiveRadarChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const center = size / 2;
  const radius = size * 0.38;
  const total = dimensions.length;
  const angleStep = (Math.PI * 2) / total;

  // Grid levels (20%, 40%, 60%, 80%, 100%)
  const levels = [0.2, 0.4, 0.6, 0.8, 1.0];

  function getPoint(value: number, index: number, maxRadius = radius) {
    const angle = index * angleStep - Math.PI / 2;
    const r = (value / 100) * maxRadius;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return { x, y };
  }

  // Learner points path
  const learnerPoints = dimensions.map((d, i) => getPoint(d.score, i));
  const learnerPathData = learnerPoints
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ") + " Z";

  // Benchmark points path
  const benchmarkPoints = dimensions.map((d, i) => getPoint(d.benchmark, i));
  const benchmarkPathData = benchmarkPoints
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ") + " Z";

  return (
    <div className="flex flex-col items-center select-none">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="overflow-visible">
          {/* Concentric Polygons */}
          {levels.map((level, lvlIdx) => {
            const levelRadius = radius * level;
            const points = Array.from({ length: total }, (_, i) => {
              const angle = i * angleStep - Math.PI / 2;
              return `${(center + levelRadius * Math.cos(angle)).toFixed(1)},${(
                center + levelRadius * Math.sin(angle)
              ).toFixed(1)}`;
            }).join(" ");

            return (
              <polygon
                key={lvlIdx}
                points={points}
                fill={lvlIdx % 2 === 0 ? "rgba(241, 245, 249, 0.6)" : "transparent"}
                stroke="#cbd5e1"
                strokeWidth="1"
                strokeDasharray={lvlIdx === levels.length - 1 ? undefined : "2 2"}
              />
            );
          })}

          {/* Radial Axis Lines */}
          {dimensions.map((_, i) => {
            const endpoint = getPoint(100, i);
            return (
              <line
                key={i}
                x1={center}
                y1={center}
                x2={endpoint.x}
                y2={endpoint.y}
                stroke="#cbd5e1"
                strokeWidth="1"
              />
            );
          })}

          {/* Benchmark Cohort Polygon (Dashed Slate) */}
          <path
            d={benchmarkPathData}
            fill="rgba(148, 163, 184, 0.15)"
            stroke="#94a3b8"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />

          {/* Learner Polygon (Cyan / Indigo Gradient Fill) */}
          <path
            d={learnerPathData}
            fill="rgba(6, 182, 212, 0.25)"
            stroke="#0284c7"
            strokeWidth="2.5"
            className="transition-all duration-700 ease-out"
          />

          {/* Interactive Vertex Nodes */}
          {learnerPoints.map((p, i) => {
            const dim = dimensions[i];
            const isHovered = hoveredIdx === i;

            return (
              <g
                key={i}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
                className="cursor-pointer"
              >
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isHovered ? 7 : 5}
                  fill={isHovered ? "#06b6d4" : "#0284c7"}
                  stroke="#ffffff"
                  strokeWidth="2"
                  className="transition-all duration-200"
                />
              </g>
            );
          })}

          {/* Dimension Axis Labels */}
          {dimensions.map((dim, i) => {
            const labelPoint = getPoint(118, i);
            const isHovered = hoveredIdx === i;

            return (
              <text
                key={i}
                x={labelPoint.x}
                y={labelPoint.y}
                textAnchor={labelPoint.x > center + 10 ? "start" : labelPoint.x < center - 10 ? "end" : "middle"}
                dominantBaseline="central"
                fontSize={isHovered ? "11" : "10"}
                fontWeight={isHovered ? "800" : "700"}
                fill={isHovered ? "#0369a1" : "#334155"}
                className="transition-colors duration-200 cursor-pointer"
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                {dim.axis} ({dim.score}%)
              </text>
            );
          })}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredIdx !== null && (
          <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 w-64 rounded-xl border border-blue-200 bg-white/95 p-3 text-center shadow-xl backdrop-blur-sm animate-fade-in-up z-20">
            <p className="text-xs font-black text-slate-900">{dimensions[hoveredIdx].axis}</p>
            <p className="mt-1 text-[11px] text-slate-600 leading-tight">
              {dimensions[hoveredIdx].description}
            </p>
            <div className="mt-2 flex justify-center gap-3 text-[10px] font-bold">
              <span className="text-cyan-700">Your Score: {dimensions[hoveredIdx].score}%</span>
              <span className="text-slate-400">Cohort Target: {dimensions[hoveredIdx].benchmark}%</span>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center justify-center gap-6 text-xs font-bold text-slate-600">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-cyan-500 border border-cyan-700" />
          <span>Learner Mastery</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-0.5 w-4 bg-slate-400 border-t border-dashed border-slate-500" />
          <span>Cohort Benchmark</span>
        </div>
      </div>
    </div>
  );
}
