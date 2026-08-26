"use client";

import { useState } from "react";

type PostShareButtonProps = {
  postId: string;
  authorHandle: string;
};

export function PostShareButton({ postId, authorHandle }: PostShareButtonProps) {
  const [status, setStatus] = useState<"idle" | "copied" | "shared" | "failed">("idle");

  async function sharePost() {
    const url = `${window.location.origin}/feed/${postId}`;
    const title = `Shiftpoint Society post by @${authorHandle}`;

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
    ? "LINK COPIED ✓"
    : status === "shared"
      ? "SHARED ✓"
      : status === "failed"
        ? "SHARE FAILED"
        : "SHARE POST →";

  return (
    <button type="button" className="garageButton" onClick={sharePost}>
      {label}
    </button>
  );
}
