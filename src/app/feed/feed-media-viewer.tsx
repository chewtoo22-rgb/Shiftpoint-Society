"use client";

import { useEffect, useRef, useState } from "react";
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

export function FeedMediaViewer({ src, alt, positionLabel }: FeedMediaViewerProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

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
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
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
              <span>
                {activeItem.positionLabel
                  ? `SOCIETY MEDIA // ${activeItem.positionLabel}`
                  : "SOCIETY MEDIA"}
              </span>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close media viewer">
                CLOSE ×
              </button>
            </div>
            <div className={styles.stage}>
              {hasNavigation && (
                <button
                  type="button"
                  className={`${styles.navButton} ${styles.previous}`}
                  onClick={() => setActiveIndex((index) => (index - 1 + galleryItems.length) % galleryItems.length)}
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
                  onClick={() => setActiveIndex((index) => (index + 1) % galleryItems.length)}
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
