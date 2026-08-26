"use client";

import { useState } from "react";

type MilestoneShareButtonProps = {
  entryId: string;
  title: string;
  buildName: string;
};

export function MilestoneShareButton({ entryId, title, buildName }: MilestoneShareButtonProps) {
  const [status, setStatus] = useState<"idle" | "copied" | "shared" | "failed">("idle");

  async function shareMilestone() {
    const url = new URL(window.location.href);
    url.hash = `build-entry-${entryId}`;
    const shareTitle = `${title} — ${buildName} on Shiftpoint Society`;

    try {
      if (navigator.share) {
        await navigator.share({ title: shareTitle, url: url.toString() });
        setStatus("shared");
        return;
      }

      await navigator.clipboard.writeText(url.toString());
      setStatus("copied");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setStatus("idle");
        return;
      }

      setStatus("failed");
    }
  }

  const label = status === "copied"
    ? "MILESTONE LINK COPIED ✓"
    : status === "shared"
      ? "MILESTONE SHARED ✓"
      : status === "failed"
        ? "SHARE FAILED"
        : "SHARE MILESTONE →";

  return (
    <button type="button" className="garageButton" onClick={shareMilestone}>
      {label}
    </button>
  );
}
