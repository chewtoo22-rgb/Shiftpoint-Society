"use client";

import { useEffect, useState } from "react";
import styles from "./feed-media-viewer.module.css";

type FeedMediaViewerProps = {
  src: string;
  alt: string;
  positionLabel?: string;
};

export function FeedMediaViewer({ src, alt, positionLabel }: FeedMediaViewerProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen(true)}
        aria-label={`Open ${alt} fullscreen`}
      >
        <img src={src} alt={alt} loading="lazy" />
        <span className={styles.hint}>VIEW FULLSCREEN ↗</span>
      </button>

      {open && (
        <div
          className={styles.backdrop}
          role="dialog"
          aria-modal="true"
          aria-label={alt}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div className={styles.panel}>
            <div className={styles.bar}>
              <span>{positionLabel ? `SOCIETY MEDIA // ${positionLabel}` : "SOCIETY MEDIA"}</span>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close media viewer">
                CLOSE ×
              </button>
            </div>
            <img src={src} alt={alt} />
          </div>
        </div>
      )}
    </>
  );
}
