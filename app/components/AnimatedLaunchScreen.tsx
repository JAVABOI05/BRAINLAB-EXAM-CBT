"use client";

import { useEffect, useState } from "react";
import styles from "./AnimatedLaunchScreen.module.css";

const SESSION_KEY = "brainlab-launch-intro-shown";

export default function AnimatedLaunchScreen() {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    try {
      const isStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        Boolean((navigator as Navigator & { standalone?: boolean }).standalone);

      if (!isStandalone || window.sessionStorage.getItem(SESSION_KEY) === "1") {
        return;
      }

      window.sessionStorage.setItem(SESSION_KEY, "1");
      setVisible(true);
    } catch {
      return;
    }

    const exitTimer = window.setTimeout(() => setLeaving(true), 3900);
    const removeTimer = window.setTimeout(() => setVisible(false), 4450);

    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(removeTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`${styles.screen} ${leaving ? styles.leaving : ""}`}
      role="status"
      aria-live="polite"
      aria-label="Opening BrainLab Academy"
    >
      <div className={styles.ambient} aria-hidden="true">
        <span className={styles.colorWash} />
        <span className={styles.ribbon} />
        <span className={styles.ribbonAccent} />
        <span className={styles.panelOne} />
        <span className={styles.panelTwo} />
      </div>

      <div className={styles.content}>
        <div className={styles.emblem} aria-hidden="true">
          <span className={styles.bookBack} />
          <span className={styles.bookPageLeft} />
          <span className={styles.bookPageRight} />
          <span className={styles.bookSpine} />
          <span className={styles.pathLine} />
          <span className={styles.pathNode} />
          <span className={styles.logoPlate}>
            <img src="/icon-192.png" alt="" className={styles.mark} />
          </span>
        </div>

        <div className={styles.brand}>
          <p className={styles.eyebrow}>LEARN WITH PURPOSE</p>
          <h1>BrainLab <span>Academy</span></h1>
          <p className={styles.tagline}>Practise with purpose.</p>
          <p className={styles.supportingLine}>Understand more. Go further.</p>
        </div>

        <div className={styles.loadingArea}>
          <div className={styles.loadingTrack} aria-hidden="true">
            <span className={styles.loadingBar} />
          </div>
          <p className={styles.loadingLabel}>YOUR LEARNING JOURNEY IS STARTING</p>
        </div>
      </div>

      <span className={styles.footer}>PRACTISE · UNDERSTAND · PROGRESS</span>
    </div>
  );
}
