"use client";

import { useRef, useState } from "react";

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

  if (!isOpen) return null;

  const appendValue = (value: string) => {
    if (display === "0" || display === "Error") {
      setDisplay(value);
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
      const result = Function(`"use strict"; return (${expression})`)();
      setDisplay(String(result));
    } catch {
      setDisplay("Error");
    }
  };

  const calculateSqrt = () => {
    try {
      const expression = display.replace(/×/g, "*").replace(/÷/g, "/");
      const value = Function(`"use strict"; return (${expression})`)();

      if (typeof value !== "number" || value < 0) {
        setDisplay("Error");
        return;
      }

      setDisplay(String(Math.sqrt(value)));
    } catch {
      setDisplay("Error");
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = calcRef.current?.getBoundingClientRect();
    if (!rect) return;

    setDragging(true);
    setOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!dragging) return;

    setPosition({
      x: Math.max(0, e.clientX - offset.x),
      y: Math.max(0, e.clientY - offset.y),
    });
  };

  const handleMouseUp = () => {
    setDragging(false);
  };

  return (
    <div
      className="fixed inset-0 z-[1000]"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <div
        ref={calcRef}
        className="calc-window absolute w-[320px] bg-white"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
        }}
      >
        <div
          onMouseDown={handleMouseDown}
          className="flex cursor-move items-center justify-between bg-slate-700 px-4 py-3 text-white"
        >
          <span className="text-sm font-bold">Basic Calculator</span>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md bg-red-600 text-lg font-bold hover:bg-red-700"
          >
            ×
          </button>
        </div>

        <div className="border-b bg-white p-4">
          <div className="calc-display">
            <span className="max-w-full overflow-hidden text-ellipsis whitespace-nowrap">
              {display}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 p-4">
          <button onClick={clearDisplay} className="calc-top-btn">
            C
          </button>
          <button onClick={deleteLast} className="calc-top-btn">
            Del
          </button>
          <button onClick={() => appendValue("+")} className="calc-op-btn">
            +
          </button>
          <button onClick={() => appendValue("×")} className="calc-op-btn">
            ×
          </button>

          <button onClick={() => appendValue("7")} className="calc-btn">
            7
          </button>
          <button onClick={() => appendValue("8")} className="calc-btn">
            8
          </button>
          <button onClick={() => appendValue("9")} className="calc-btn">
            9
          </button>
          <button onClick={() => appendValue("-")} className="calc-op-btn">
            -
          </button>

          <button onClick={() => appendValue("4")} className="calc-btn">
            4
          </button>
          <button onClick={() => appendValue("5")} className="calc-btn">
            5
          </button>
          <button onClick={() => appendValue("6")} className="calc-btn">
            6
          </button>
          <button
            onClick={calculateResult}
            className="calc-equal-btn"
            style={{ gridRow: "span 2" }}
          >
            =
          </button>

          <button onClick={() => appendValue("1")} className="calc-btn">
            1
          </button>
          <button onClick={() => appendValue("2")} className="calc-btn">
            2
          </button>
          <button onClick={() => appendValue("3")} className="calc-btn">
            3
          </button>

          <button onClick={() => appendValue("0")} className="calc-btn">
            0
          </button>
          <button onClick={() => appendValue(".")} className="calc-btn">
            .
          </button>
          <button onClick={calculateSqrt} className="calc-btn">
            √
          </button>
        </div>
      </div>
    </div>
  );
}