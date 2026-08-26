"use client";

import { useState } from "react";

type BuildShareButtonProps = {
  handle: string;
  carId: string;
  buildName: string;
};

export function BuildShareButton({ handle, carId, buildName }: BuildShareButtonProps) {
  const [status, setStatus] = useState<"idle" | "copied" | "shared" | "failed">("idle");

  async function shareBuild() {
    const url = `${window.location.origin}/u/${encodeURIComponent(handle)}/cars/${encodeURIComponent(carId)}`;
    const title = `${buildName} on Shiftpoint Society`;

    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        setStatus("shared");
        return;
      }

      await navigator.clipboard.writeText(url);
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
    ? "BUILD LINK COPIED ✓"
    : status === "shared"
      ? "BUILD SHARED ✓"
      : status === "failed"
        ? "SHARE FAILED"
        : "SHARE BUILD →";

  return (
    <button type="button" className="garageButton" onClick={shareBuild}>
      {label}
    </button>
  );
}
