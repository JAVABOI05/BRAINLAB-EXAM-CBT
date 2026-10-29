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

    // Give the full brand reveal time to land before the elegant exit transition.
    const exitTimer = window.setTimeout(() => setLeaving(true), 3200);
    const removeTimer = window.setTimeout(() => setVisible(false), 3700);

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
        <span className={styles.ambientOrbOne} />
        <span className={styles.ambientOrbTwo} />
        <span className={styles.ambientOrbThree} />
        <span className={styles.starField} />
      </div>
      <div className={styles.content}>
        <div className={styles.emblem} aria-hidden="true">
          <span className={styles.halo} />
          <span className={styles.orbit} />
          <span className={styles.orbitInner} />
          <span className={styles.orbitAccent} />
          <span className={styles.sparkleOne} />
          <span className={styles.sparkleTwo} />
          <span className={styles.sparkleThree} />
          <span className={styles.logoPlate}>
            <img src="/icon-192.png" alt="" className={styles.mark} />
          </span>
        </div>
        <div className={styles.brand}>
          <p className={styles.eyebrow}><span /> THE FUTURE OF LEARNING <span /></p>
          <h1>BrainLab <span>Academy</span></h1>
          <p className={styles.tagline}>Practise with purpose.</p>
          <p className={styles.supportingLine}>Discover. Understand. Achieve.</p>
        </div>
        <div className={styles.loadingArea}>
          <div className={styles.loadingTrack} aria-hidden="true">
            <span className={styles.loadingBar} />
          </div>
          <p className={styles.loadingLabel}>PREPARING YOUR LEARNING SPACE</p>
        </div>
      </div>
      <span className={styles.footer}>YOUR NEXT BREAKTHROUGH STARTS HERE</span>
    </div>
  );
}
