"use client";

import { useEffect, useRef, useState } from "react";

type FloatingCalculatorProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function FloatingCalculator({
  isOpen,
  onClose,
}: FloatingCalculatorProps) {
  const [display, setDisplay] = useState("0");
  const [position, setPosition] = useState({ x: 24, y: 120 });
  const [dragging, setDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const calcRef = useRef<HTMLDivElement | null>(null);

  // Position nicely in top-right or center-right on initial mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const defaultX = Math.max(16, window.innerWidth - 340);
      const defaultY = Math.min(140, Math.max(70, Math.floor(window.innerHeight * 0.12)));
      setPosition({ x: defaultX, y: defaultY });
    }
  }, []);

  // Global mousemove and mouseup listeners for smooth dragging anywhere on screen
  useEffect(() => {
    if (!dragging) return;

    const onMouseMove = (e: MouseEvent) => {
      setPosition({
        x: Math.max(8, Math.min(window.innerWidth - 325, e.clientX - offset.x)),
        y: Math.max(8, Math.min(window.innerHeight - 440, e.clientY - offset.y)),
      });
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!e.touches[0]) return;
      setPosition({
        x: Math.max(8, Math.min(window.innerWidth - 325, e.touches[0].clientX - offset.x)),
        y: Math.max(8, Math.min(window.innerHeight - 440, e.touches[0].clientY - offset.y)),
      });
    };

    const onEndDrag = () => {
      setDragging(false);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onEndDrag);
    window.addEventListener("touchmove", onTouchMove);
    window.addEventListener("touchend", onEndDrag);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onEndDrag);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onEndDrag);
    };
  }, [dragging, offset]);

  if (!isOpen) return null;

  const appendValue = (value: string) => {
    if (display === "0" || display === "Error") {
      if (value === ".") {
        setDisplay("0.");
        return;
      }
      if (["+", "×", "-", "÷"].includes(value)) {
        setDisplay("0" + value);
        return;
      }
      setDisplay(value);
      return;
    }

    // Replace operator if another operator is clicked back-to-back
    const lastChar = display.slice(-1);
    if (["+", "×", "-", "÷"].includes(lastChar) && ["+", "×", "-", "÷"].includes(value)) {
      setDisplay((prev) => prev.slice(0, -1) + value);
      return;
    }

    setDisplay((prev) => prev + value);
  };

  const clearDisplay = () => {
    setDisplay("0");
  };

  const deleteLast = () => {
    if (display === "Error") {
      setDisplay("0");
      return;
    }
    setDisplay((prev) => (prev.length > 1 ? prev.slice(0, -1) : "0"));
  };

  const calculateResult = () => {
    try {
      const expression = display.replace(/×/g, "*").replace(/÷/g, "/");
      if (!/^[0-9+\-*/().\s]+$/.test(expression)) {
        setDisplay("Error");
        return;
      }
      const result = Function(`"use strict"; return (${expression})`)();
      if (typeof result !== "number" || !Number.isFinite(result)) {
        setDisplay("Error");
        return;
      }
      // Round to 8 decimal places to avoid floating point artifacts (e.g. 0.1+0.2)
      const rounded = Math.round(result * 1e8) / 1e8;
      setDisplay(String(rounded));
    } catch {
      setDisplay("Error");
    }
  };

  const calculateSqrt = () => {
    try {
      const expression = display.replace(/×/g, "*").replace(/÷/g, "/");
      if (!/^[0-9+\-*/().\s]+$/.test(expression)) {
        setDisplay("Error");
        return;
      }
      const value = Function(`"use strict"; return (${expression})`)();
      if (typeof value !== "number" || value < 0 || !Number.isFinite(value)) {
        setDisplay("Error");
        return;
      }
      const res = Math.sqrt(value);
      const rounded = Math.round(res * 1e8) / 1e8;
      setDisplay(String(rounded));
    } catch {
      setDisplay("Error");
    }
  };

  const handleStartDrag = (clientX: number, clientY: number) => {
    const rect = calcRef.current?.getBoundingClientRect();
    if (!rect) return;

    setDragging(true);
    setOffset({
      x: clientX - rect.left,
      y: clientY - rect.top,
    });
  };

  return (
    <div className="fixed inset-0 z-[1000] pointer-events-none select-none">
      <div
        ref={calcRef}
        className="calc-window pointer-events-auto absolute w-[310px] sm:w-[320px] bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 shadow-2xl rounded-2xl overflow-hidden transition-shadow"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
        }}
      >
        {/* Draggable Header */}
        <div
          onMouseDown={(e) => handleStartDrag(e.clientX, e.clientY)}
          onTouchStart={(e) => {
            if (e.touches[0]) handleStartDrag(e.touches[0].clientX, e.touches[0].clientY);
          }}
          className="flex cursor-move items-center justify-between bg-gradient-to-r from-slate-800 to-slate-900 px-4 py-3 text-white border-b border-slate-700"
        >
          <div className="flex items-center gap-2">
            <span className="text-base">🧮</span>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Exam Calculator
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-700/80 text-white font-bold hover:bg-red-600 transition"
            title="Close Calculator"
          >
            ✕
          </button>
        </div>

        {/* Display */}
        <div className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4">
          <div className="calc-display bg-white dark:bg-slate-900 rounded-xl px-3 py-2 border border-slate-200 dark:border-slate-800 flex items-center justify-end">
            <span className="max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-slate-100">
              {display}
            </span>
          </div>
        </div>

        {/* Keypad Grid (with +, -, ×, ÷, √, Del, C, =, .) */}
        <div className="grid grid-cols-4 gap-2 p-3 sm:p-4 bg-white dark:bg-slate-900">
          <button type="button" onClick={clearDisplay} className="calc-top-btn font-bold">
            C
          </button>
          <button type="button" onClick={deleteLast} className="calc-top-btn font-bold">
            Del
          </button>
          <button type="button" onClick={calculateSqrt} className="calc-top-btn font-bold">
            √
          </button>
          <button type="button" onClick={() => appendValue("÷")} className="calc-op-btn font-bold text-lg">
            ÷
          </button>

          <button type="button" onClick={() => appendValue("7")} className="calc-btn font-semibold">
            7
          </button>
          <button type="button" onClick={() => appendValue("8")} className="calc-btn font-semibold">
            8
          </button>
          <button type="button" onClick={() => appendValue("9")} className="calc-btn font-semibold">
            9
          </button>
          <button type="button" onClick={() => appendValue("×")} className="calc-op-btn font-bold text-lg">
            ×
          </button>

          <button type="button" onClick={() => appendValue("4")} className="calc-btn font-semibold">
            4
          </button>
          <button type="button" onClick={() => appendValue("5")} className="calc-btn font-semibold">
            5
          </button>
          <button type="button" onClick={() => appendValue("6")} className="calc-btn font-semibold">
            6
          </button>
          <button type="button" onClick={() => appendValue("-")} className="calc-op-btn font-bold text-lg">
            -
          </button>

          <button type="button" onClick={() => appendValue("1")} className="calc-btn font-semibold">
            1
          </button>
          <button type="button" onClick={() => appendValue("2")} className="calc-btn font-semibold">
            2
          </button>
          <button type="button" onClick={() => appendValue("3")} className="calc-btn font-semibold">
            3
          </button>
          <button type="button" onClick={() => appendValue("+")} className="calc-op-btn font-bold text-lg">
            +
          </button>

          <button type="button" onClick={() => appendValue("0")} className="calc-btn font-semibold col-span-2">
            0
          </button>
          <button type="button" onClick={() => appendValue(".")} className="calc-btn font-semibold">
            .
          </button>
          <button
            type="button"
            onClick={calculateResult}
            className="calc-equal-btn font-bold text-lg bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
          >
            =
          </button>
        </div>
      </div>
    </div>
  );
}
