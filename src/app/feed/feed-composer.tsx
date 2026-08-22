"use client";

import { ChangeEvent, FormEvent, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { POST_MEDIA_LIMITS, validatePostMediaBatch } from "../../lib/post-media-policy";
import styles from "./feed.module.css";
import {
  completeFeedPostMediaUpload,
  createFeedPost,
  requestFeedPostMediaUploads,
} from "./actions";

type ComposerCar = {
  id: string;
  year: number;
  make: string;
  model: string;
  nickname: string | null;
};

type FeedComposerProps = {
  cars: ComposerCar[];
};

const postKinds = [
  { value: "GENERAL", label: "GENERAL" },
  { value: "PULL", label: "PULL / RUN" },
  { value: "DYNO", label: "DYNO" },
  { value: "INSTALL", label: "INSTALL" },
  { value: "QUESTION", label: "QUESTION" },
  { value: "VIDEO", label: "VIDEO" },
  { value: "EVENT", label: "EVENT" },
] as const;

function validateSelectedFiles(files: File[]) {
  return validatePostMediaBatch(
    files.map((file) => ({
      name: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
    })),
  );
}

export function FeedComposer({ cars }: FeedComposerProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [mediaSummary, setMediaSummary] = useState<string | null>(null);
  const [mediaIsValid, setMediaIsValid] = useState(true);
  const [isPending, startTransition] = useTransition();

  function handleMediaChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.currentTarget.files ?? []);
    setError(null);

    if (!files.length) {
      setMediaIsValid(true);
      setMediaSummary(null);
      return;
    }

    try {
      const validated = validateSelectedFiles(files);
      const imageCount = validated.filter((item) => item.kind === "IMAGE").length;
      const videoCount = validated.length - imageCount;
      const parts = [
        imageCount ? `${imageCount} photo${imageCount === 1 ? "" : "s"}` : null,
        videoCount ? `${videoCount} video${videoCount === 1 ? "" : "s"}` : null,
      ].filter(Boolean);

      setMediaIsValid(true);
      setMediaSummary(`${parts.join(" + ")} ready to upload.`);
    } catch (caught) {
      setMediaIsValid(false);
      setMediaSummary(null);
      setError(caught instanceof Error ? caught.message : "Selected media is not valid.");
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const fileInput = form.elements.namedItem("media") as HTMLInputElement | null;
    const files = Array.from(fileInput?.files ?? []);

    if (!mediaIsValid) {
      setError("Fix the selected media before publishing.");
      return;
    }

    try {
      validateSelectedFiles(files);
    } catch (caught) {
      setMediaIsValid(false);
      setError(caught instanceof Error ? caught.message : "Selected media is not valid.");
      return;
    }

    startTransition(async () => {
      try {
        const uploadTargets = files.length
          ? await requestFeedPostMediaUploads(
              files.map((file) => ({
                name: file.name,
                mimeType: file.type,
                sizeBytes: file.size,
              })),
            )
          : [];

        for (let index = 0; index < uploadTargets.length; index += 1) {
          const target = uploadTargets[index];
          const file = files[index];
          if (!target || !file) throw new Error("Media upload target mismatch.");

          const response = await fetch(target.uploadUrl, {
            method: target.method,
            headers: target.headers,
            body: file,
          });

          if (!response.ok) {
            throw new Error(`Media upload failed (${response.status}).`);
          }
        }

        formData.delete("media");
        const post = await createFeedPost(formData);

        for (const target of uploadTargets) {
          await completeFeedPostMediaUpload({
            postId: post.id,
            completionToken: target.completionToken,
          });
        }

        formRef.current?.reset();
        setMediaSummary(null);
        setMediaIsValid(true);
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not publish this update.");
      }
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className={`${styles.composer} card`}>
      <div className="eyebrow">POST TO THE SOCIETY</div>
      <textarea name="body" required maxLength={1200} placeholder="What are you working on?" />
      <input
        name="media"
        type="file"
        accept="image/avif,image/gif,image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm"
        multiple
        onChange={handleMediaChange}
        aria-label={`Attach up to ${POST_MEDIA_LIMITS.maxFilesPerPost} photos or videos`}
        aria-invalid={!mediaIsValid}
      />
      {mediaSummary && <p aria-live="polite">{mediaSummary}</p>}
      <div className={styles.composerRow}>
        <select name="carId" defaultValue="">
          <option value="">No car attached</option>
          {cars.map((car) => (
            <option key={car.id} value={car.id}>
              {car.nickname ? `${car.nickname} — ` : ""}{car.year} {car.make} {car.model}
            </option>
          ))}
        </select>
        <select name="kind" defaultValue="GENERAL" aria-label="Post type">
          {postKinds.map((kind) => (
            <option key={kind.value} value={kind.value}>{kind.label}</option>
          ))}
        </select>
        <button className="cta" type="submit" disabled={isPending || !mediaIsValid}>
          {isPending ? "UPLOADING…" : "DROP UPDATE →"}
        </button>
      </div>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
