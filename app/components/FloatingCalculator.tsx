"use client";

import { useEffect, useRef, useState, useCallback } from "react";

function evaluateArithmetic(input: string): number {
  const source = input.replace(/×/g, "*").replace(/÷/g, "/");
  const tokens: string[] = [];
  const tokenPattern = /\s*(?:(\d+(?:\.\d*)?|\.\d+)|([()+/*-]))/gy;
  let position = 0;

  while (position < source.length) {
    tokenPattern.lastIndex = position;
    const match = tokenPattern.exec(source);
    if (!match) {
      if (/^\s*$/.test(source.slice(position))) break;
      throw new Error("Invalid expression");
    }
    tokens.push(match[1] ?? match[2]);
    position = tokenPattern.lastIndex;
  }

  let cursor = 0;
  const peek = () => tokens[cursor];
  const consume = () => tokens[cursor++];

  const parsePrimary = (): number => {
    if (peek() === "+" || peek() === "-") {
      const sign = consume() === "-" ? -1 : 1;
      return sign * parsePrimary();
    }
    if (peek() === "(") {
      consume();
      const value = parseExpression();
      if (consume() !== ")") throw new Error("Missing closing bracket");
      return value;
    }
    const token = consume();
    if (token === undefined || !/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(token)) {
      throw new Error("Expected a number");
    }
    const value = Number(token);
    if (!Number.isFinite(value)) throw new Error("Invalid number");
    return value;
  };

  const parseTerm = (): number => {
    let value = parsePrimary();
    while (peek() === "*" || peek() === "/") {
      const operator = consume();
      const right = parsePrimary();
      if (operator === "/" && right === 0) throw new Error("Division by zero");
      value = operator === "*" ? value * right : value / right;
    }
    return value;
  };

  const parseExpression = (): number => {
    let value = parseTerm();
    while (peek() === "+" || peek() === "-") {
      const operator = consume();
      const right = parseTerm();
      value = operator === "+" ? value + right : value - right;
    }
    return value;
  };

  if (tokens.length === 0) throw new Error("Empty expression");
  const result = parseExpression();
  if (cursor !== tokens.length || !Number.isFinite(result)) {
    throw new Error("Invalid expression");
  }
  return result;
}

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
  const [isMobile, setIsMobile] = useState(false);

  const calcRef = useRef<HTMLDivElement | null>(null);

  // Position nicely in top-right or center-right on initial mount and track mobile viewport
  useEffect(() => {
    if (typeof window !== "undefined") {
      const checkMobile = () => {
        setIsMobile(window.innerWidth < 640);
      };
      checkMobile();
      window.addEventListener("resize", checkMobile);

      const calcWidth = Math.min(320, window.innerWidth - 32);
      const defaultX = Math.max(16, window.innerWidth - calcWidth - 24);
      const defaultY = Math.min(140, Math.max(70, Math.floor(window.innerHeight * 0.12)));
      setPosition({ x: defaultX, y: defaultY });

      return () => window.removeEventListener("resize", checkMobile);
    }
  }, []);

  // Global mousemove and mouseup listeners for smooth dragging anywhere on screen
  useEffect(() => {
    if (!dragging) return;

    const onMouseMove = (e: MouseEvent) => {
      const maxX = Math.max(8, window.innerWidth - 310);
      const maxY = Math.max(8, window.innerHeight - 400);
      setPosition({
        x: Math.max(8, Math.min(maxX, e.clientX - offset.x)),
        y: Math.max(8, Math.min(maxY, e.clientY - offset.y)),
      });
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!e.touches[0]) return;
      const maxX = Math.max(8, window.innerWidth - 310);
      const maxY = Math.max(8, window.innerHeight - 400);
      setPosition({
        x: Math.max(8, Math.min(maxX, e.touches[0].clientX - offset.x)),
        y: Math.max(8, Math.min(maxY, e.touches[0].clientY - offset.y)),
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

  const appendValue = useCallback((value: string) => {
    setDisplay((prev) => {
      if (prev === "0" || prev === "Error") {
        if (value === ".") return "0.";
        if (["+", "×", "-", "÷"].includes(value)) return "0" + value;
        return value;
      }

      // Check decimal: only one decimal point per current operand
      if (value === ".") {
        const tokens = prev.split(/[+×÷\-]/);
        const currentToken = tokens[tokens.length - 1];
        if (currentToken.includes(".")) return prev;
      }

      // Replace back-to-back operators
      const lastChar = prev.slice(-1);
      if (["+", "×", "-", "÷"].includes(lastChar) && ["+", "×", "-", "÷"].includes(value)) {
        return prev.slice(0, -1) + value;
      }

      return prev + value;
    });
  }, []);

  const clearDisplay = useCallback(() => {
    setDisplay("0");
  }, []);

  const deleteLast = useCallback(() => {
    setDisplay((prev) => {
      if (prev === "Error") return "0";
      return prev.length > 1 ? prev.slice(0, -1) : "0";
    });
  }, []);

  const calculateResult = useCallback(() => {
    setDisplay((prev) => {
      try {
        let expr = prev.trim();
        while (expr.length > 0 && ["+", "×", "-", "÷"].includes(expr.slice(-1))) {
          expr = expr.slice(0, -1).trim();
        }
        if (!expr) return "0";

        const result = evaluateArithmetic(expr);
        const rounded = Math.round((result + Number.EPSILON) * 1e8) / 1e8;
        return String(rounded);
      } catch {
        return "Error";
      }
    });
  }, []);

  // Keyboard navigation & inputs for four-function calculator
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || "").toUpperCase();
      if (activeTag === "INPUT" || activeTag === "TEXTAREA") return;

      if (e.key >= "0" && e.key <= "9") {
        e.preventDefault();
        appendValue(e.key);
      } else if (e.key === ".") {
        e.preventDefault();
        appendValue(".");
      } else if (e.key === "+") {
        e.preventDefault();
        appendValue("+");
      } else if (e.key === "-") {
        e.preventDefault();
        appendValue("-");
      } else if (e.key === "*" || e.key === "x" || e.key === "X") {
        e.preventDefault();
        appendValue("×");
      } else if (e.key === "/") {
        e.preventDefault();
        appendValue("÷");
      } else if (e.key === "Enter" || e.key === "=") {
        e.preventDefault();
        calculateResult();
      } else if (e.key === "Backspace") {
        e.preventDefault();
        deleteLast();
      } else if (e.key === "Escape" || e.key === "c" || e.key === "C") {
        e.preventDefault();
        clearDisplay();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, appendValue, calculateResult, deleteLast, clearDisplay]);

  if (!isOpen) return null;

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
        className="calc-window pointer-events-auto absolute w-[300px] sm:w-[320px] max-w-[calc(100vw-32px)] bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 shadow-2xl rounded-2xl overflow-hidden transition-shadow"
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
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-blue-400">
              <rect width="16" height="20" x="4" y="2" rx="2" />
              <line x1="8" x2="16" y1="6" y2="6" />
              <line x1="16" x2="16" y1="14" y2="18" />
              <path d="M16 10h.01" />
              <path d="M12 10h.01" />
              <path d="M8 10h.01" />
              <path d="M12 14h.01" />
              <path d="M8 14h.01" />
              <path d="M12 18h.01" />
              <path d="M8 18h.01" />
            </svg>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Exam Calculator
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-700/80 text-white font-bold hover:bg-red-600 transition"
            title="Close Calculator"
            aria-label="Close Calculator"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
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

        {/* Four-Function Keypad Grid (+, -, ×, ÷, Decimals, Clear, Delete) */}
        <div className="grid grid-cols-4 gap-2 p-3 sm:p-4 bg-white dark:bg-slate-900">
          <button type="button" onClick={clearDisplay} className="calc-top-btn font-bold col-span-2">
            Clear (C)
          </button>
          <button type="button" onClick={deleteLast} className="calc-top-btn font-bold">
            Del
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
