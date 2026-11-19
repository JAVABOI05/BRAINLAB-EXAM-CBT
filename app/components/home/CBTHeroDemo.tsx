"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import styles from "./CBTHeroDemo.module.css";

type DemoPhase = "idle" | "question" | "selected" | "cta" | "complete";

const SHORTCUTS = [
  ["A", "Option A"],
  ["B", "Option B"],
  ["C", "Option C"],
  ["D", "Option D"],
  ["P", "Previous"],
  ["N", "Next"],
  ["R", "Clear"],
  ["S", "Submit"],
] as const;

/**
 * A self-contained, illustrative CBT preview. It never attaches keyboard
 * listeners, starts an exam session, saves answers, or submits anything.
 */
export function CBTHeroDemo() {
  const rootRef = useRef<HTMLDivElement>(null);
  const hasPlayedRef = useRef(false);
  const [phase, setPhase] = useState<DemoPhase>("idle");
  const [hasStarted, setHasStarted] = useState(false);
  const [seconds, setSeconds] = useState(15);

  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;

    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motionPreference.matches) {
      setSeconds(11);
      setPhase("complete");
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting || hasPlayedRef.current) return;
        hasPlayedRef.current = true;
        setPhase("question");
        setHasStarted(true);
        observer.disconnect();
      },
      { threshold: 0.35 }
    );

    observer.observe(node);

    const handleMotionPreference = (event: MediaQueryListEvent) => {
      if (event.matches) {
        setSeconds(11);
        setPhase("complete");
        observer.disconnect();
      }
    };

    motionPreference.addEventListener("change", handleMotionPreference);
    return () => {
      observer.disconnect();
      motionPreference.removeEventListener("change", handleMotionPreference);
    };
  }, []);

  useEffect(() => {
    if (!hasStarted) return;

    const timer = window.setInterval(() => {
      setSeconds((current) => Math.max(11, current - 1));
    }, 1000);
    const selectAnswer = window.setTimeout(() => setPhase("selected"), 1900);
    const highlightLaunch = window.setTimeout(() => setPhase("cta"), 3000);
    const finish = window.setTimeout(() => {
      window.clearInterval(timer);
      setPhase("complete");
    }, 4200);
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const stopForReducedMotion = (event: MediaQueryListEvent) => {
      if (!event.matches) return;
      window.clearInterval(timer);
      window.clearTimeout(selectAnswer);
      window.clearTimeout(highlightLaunch);
      window.clearTimeout(finish);
      setSeconds(11);
      setPhase("complete");
    };
    motionPreference.addEventListener("change", stopForReducedMotion);

    return () => {
      motionPreference.removeEventListener("change", stopForReducedMotion);
      window.clearInterval(timer);
      window.clearTimeout(selectAnswer);
      window.clearTimeout(highlightLaunch);
      window.clearTimeout(finish);
    };
  }, [hasStarted]);

  const answerSelected = phase === "selected" || phase === "cta" || phase === "complete";
  const launchHighlighted = phase === "cta";

  return (
    <div
      ref={rootRef}
      className={styles.demo}
      data-testid="brainlab-hero-cbt-demo"
      role="group"
      aria-label="Illustrative BrainLab CBT demonstration"
    >
      <div className={styles.device}>
        <div className={styles.camera} aria-hidden="true" />
        <div className={styles.screen}>
          <header className={styles.topbar}>
            <div className={styles.brand}>
              <span className={styles.brandMark} aria-hidden="true">B</span>
              <span>
                <strong>BrainLab CBT</strong>
                <small>UTME SIMULATOR PREVIEW</small>
              </span>
            </div>
            <div className={styles.timer}>
              <span className={styles.timerLabel}>DEMO TIMER</span>
              <strong>01:42:{String(seconds).padStart(2, "0")}</strong>
            </div>
          </header>

          <div className={styles.examMeta}>
            <span>PHYSICS</span>
            <span>QUESTION 14 OF 40</span>
            <span className={styles.demoTag}>DEMO</span>
          </div>

          <div className={`${styles.question} ${phase === "idle" ? styles.questionWaiting : styles.questionReveal}`}>
            A cell of e.m.f. 2.0 V and internal resistance 1.0 Ω is connected to a 4.0 Ω load. What is the terminal potential difference?
          </div>

          <div className={styles.options} aria-label="Illustrative answer options">
            {[
              ["A", "1.20 V"],
              ["B", "1.60 V"],
              ["C", "2.00 V"],
              ["D", "2.40 V"],
            ].map(([key, value]) => (
              <div
                key={key}
                className={`${styles.option} ${key === "B" && answerSelected ? styles.optionSelected : ""}`}
              >
                <span className={styles.optionKey}>{key}</span>
                <span>{value}</span>
                {key === "B" && answerSelected ? <span className={styles.selectedLabel}>SELECTED</span> : null}
              </div>
            ))}
          </div>

          <div className={styles.keypadBlock}>
            <div className={styles.keypadHeading}>
              <span>8-KEY NAVIGATION</span>
              <span>USE YOUR KEYBOARD</span>
            </div>
            <div className={styles.keypad} aria-hidden="true">
              {SHORTCUTS.map(([key, label]) => (
                <div
                  key={key}
                  className={`${styles.key} ${key === "B" && answerSelected ? styles.keySelected : ""}`}
                >
                  <strong>{key}</strong>
                  <small>{label}</small>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.launchRow}>
            <span className={styles.previewNote}>Illustrative preview · No exam session started</span>
            <Link
              href="/cbt"
              className={`${styles.launchButton} ${launchHighlighted ? styles.launchHighlight : ""}`}
            >
              Launch UTME Simulator <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </div>
      <div className={styles.laptopBase} aria-hidden="true">
        <span />
      </div>
      <p className={styles.demoCaption}>
        A closer look at the BrainLab 8-key CBT experience.
      </p>
      <p className="sr-only">
        The BrainLab exam supports A, B, C and D to select answers; P for previous;
        N for next; R to clear a selection; and S to submit. This is a demonstration only.
      </p>
    </div>
  );
}
