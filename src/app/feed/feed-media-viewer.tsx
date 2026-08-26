"use client";

import { useEffect, useId, useRef, useState } from "react";
import styles from "./feed-media-viewer.module.css";

type FeedMediaViewerProps = {
  src: string;
  alt: string;
  positionLabel?: string;
};

type GalleryItem = {
  src: string;
  alt: string;
  positionLabel?: string;
};

const SWIPE_THRESHOLD_PX = 48;

export function FeedMediaViewer({ src, alt, positionLabel }: FeedMediaViewerProps) {
  const dialogId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const touchStartXRef = useRef<number | null>(null);
  const [open, setOpen] = useState(false);
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  const showPrevious = () => {
    setActiveIndex((index) => (index - 1 + galleryItems.length) % galleryItems.length);
  };

  const showNext = () => {
    setActiveIndex((index) => (index + 1) % galleryItems.length);
  };

  const openViewer = () => {
    const trigger = triggerRef.current;
    const gallery = trigger?.closest("figure")?.parentElement;
    const triggers = gallery
      ? Array.from(gallery.querySelectorAll<HTMLButtonElement>("button[data-feed-media-trigger]"))
      : [];

    const items = triggers.flatMap((item) => {
      const itemSrc = item.dataset.feedMediaSrc;
      const itemAlt = item.dataset.feedMediaAlt;
      if (!itemSrc || !itemAlt) return [];
      return [{ src: itemSrc, alt: itemAlt, positionLabel: item.dataset.feedMediaPosition || undefined }];
    });

    if (items.length > 0 && trigger) {
      const triggerIndex = triggers.indexOf(trigger);
      setGalleryItems(items);
      setActiveIndex(Math.max(0, triggerIndex));
    } else {
      setGalleryItems([{ src, alt, positionLabel }]);
      setActiveIndex(0);
    }

    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = "hidden";

    const dialog = dialogRef.current;
    const focusable = dialog
      ? Array.from(dialog.querySelectorAll<HTMLElement>("button:not([disabled]), [href], [tabindex]:not([tabindex='-1'])"))
      : [];
    focusable[0]?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        return;
      }

      if (event.key === "Tab" && focusable.length > 0) {
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement;

        if (event.shiftKey && active === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && active === last) {
          event.preventDefault();
          first.focus();
        }
        return;
      }

      if (galleryItems.length <= 1) return;

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setActiveIndex((index) => (index - 1 + galleryItems.length) % galleryItems.length);
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        setActiveIndex((index) => (index + 1) % galleryItems.length);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [galleryItems.length, open]);

  const activeItem = galleryItems[activeIndex] || { src, alt, positionLabel };
  const hasNavigation = galleryItems.length > 1;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        onClick={openViewer}
        aria-label={`Open ${alt} fullscreen`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={dialogId}
        data-feed-media-trigger
        data-feed-media-src={src}
        data-feed-media-alt={alt}
        data-feed-media-position={positionLabel || ""}
      >
        <img src={src} alt={alt} loading="lazy" />
        <span className={styles.hint}>VIEW FULLSCREEN ↗</span>
      </button>

      {open && (
        <div
          id={dialogId}
          ref={dialogRef}
          className={styles.backdrop}
          role="dialog"
          aria-modal="true"
          aria-label={activeItem.alt}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div className={styles.panel}>
            <div className={styles.bar}>
              <span aria-live="polite">
                {activeItem.positionLabel
                  ? `SOCIETY MEDIA // ${activeItem.positionLabel}`
                  : "SOCIETY MEDIA"}
              </span>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close media viewer">
                CLOSE ×
              </button>
            </div>
            <div
              className={styles.stage}
              onTouchStart={(event) => {
                touchStartXRef.current = event.touches[0]?.clientX ?? null;
              }}
              onTouchEnd={(event) => {
                if (!hasNavigation || touchStartXRef.current === null) return;
                const endX = event.changedTouches[0]?.clientX;
                if (endX === undefined) return;

                const deltaX = endX - touchStartXRef.current;
                touchStartXRef.current = null;

                if (Math.abs(deltaX) < SWIPE_THRESHOLD_PX) return;
                if (deltaX > 0) showPrevious();
                else showNext();
              }}
            >
              {hasNavigation && (
                <button
                  type="button"
                  className={`${styles.navButton} ${styles.previous}`}
                  onClick={showPrevious}
                  aria-label="Previous image"
                >
                  ←
                </button>
              )}
              <img src={activeItem.src} alt={activeItem.alt} />
              {hasNavigation && (
                <button
                  type="button"
                  className={`${styles.navButton} ${styles.next}`}
                  onClick={showNext}
                  aria-label="Next image"
                >
                  →
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
