"use client";

import { useEffect, useState } from "react";
import styles from "./AnimatedLaunchScreen.module.css";

const SESSION_KEY = "brainlab-launch-intro-shown";

export default function AnimatedLaunchScreen() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let isStandalone = false;

    try {
      isStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        // Safari on iOS exposes this non-standard property for installed apps.
        Boolean((navigator as Navigator & { standalone?: boolean }).standalone);

      if (!isStandalone || window.sessionStorage.getItem(SESSION_KEY) === "1") {
        return;
      }

      window.sessionStorage.setItem(SESSION_KEY, "1");
      setVisible(true);
    } catch {
      // If storage is unavailable, do not block access to the app with an intro.
      return;
    }

    const timeout = window.setTimeout(() => setVisible(false), 1900);
    return () => window.clearTimeout(timeout);
  }, []);

  if (!visible) return null;

  return (
    <div className={styles.screen} role="status" aria-live="polite" aria-label="Opening BrainLab Academy">
      <div className={styles.glowTop} aria-hidden="true" />
      <div className={styles.glowBottom} aria-hidden="true" />
      <div className={styles.content}>
        <div className={styles.emblem} aria-hidden="true">
          <span className={styles.orbit} />
          <span className={styles.orbitInner} />
          <span className={styles.sparkleOne} />
          <span className={styles.sparkleTwo} />
          <img src="/brainlab-mark.svg" alt="" className={styles.mark} />
        </div>
        <div className={styles.brand}>
          <p className={styles.eyebrow}>LEARN · PRACTISE · PROGRESS</p>
          <h1>BrainLab <span>Academy</span></h1>
          <p className={styles.tagline}>Practise with purpose.</p>
        </div>
        <div className={styles.loadingTrack} aria-hidden="true">
          <span className={styles.loadingBar} />
        </div>
      </div>
      <span className={styles.footer}>YOUR LEARNING JOURNEY STARTS HERE</span>
    </div>
  );
}
