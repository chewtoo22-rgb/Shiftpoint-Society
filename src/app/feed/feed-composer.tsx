"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState, useTransition } from "react";
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

type MediaUploadState = {
  name: string;
  status: "ready" | "uploading" | "uploaded" | "attaching" | "attached" | "failed";
};

type MediaPreview = {
  name: string;
  kind: "IMAGE" | "VIDEO";
  url: string;
};

type UploadTarget = Awaited<ReturnType<typeof requestFeedPostMediaUploads>>[number];

type CachedUpload = {
  target: UploadTarget;
  uploaded: boolean;
  completed: boolean;
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

function fileFingerprint(file: File) {
  return `${file.name}:${file.type}:${file.size}:${file.lastModified}`;
}

function statusLabel(status: MediaUploadState["status"]) {
  switch (status) {
    case "uploading":
      return "UPLOADING";
    case "uploaded":
      return "UPLOADED";
    case "attaching":
      return "ATTACHING";
    case "attached":
      return "ATTACHED";
    case "failed":
      return "FAILED";
    default:
      return "READY";
  }
}

export function FeedComposer({ cars }: FeedComposerProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const uploadCacheRef = useRef<Map<string, CachedUpload>>(new Map());
  const pendingPostIdRef = useRef<string | null>(null);
  const previewUrlsRef = useRef<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [mediaSummary, setMediaSummary] = useState<string | null>(null);
  const [mediaIsValid, setMediaIsValid] = useState(true);
  const [uploadStates, setUploadStates] = useState<MediaUploadState[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<MediaPreview[]>([]);
  const [hasPendingPost, setHasPendingPost] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    return () => {
      previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  useEffect(() => {
    if (!hasPendingPost) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasPendingPost]);

  function clearMediaPreviews() {
    previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    previewUrlsRef.current = [];
    setMediaPreviews([]);
  }

  function setUploadStatus(index: number, status: MediaUploadState["status"]) {
    setUploadStates((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, status } : item)),
    );
  }

  function handleMediaChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.currentTarget.files ?? []);
    uploadCacheRef.current.clear();
    clearMediaPreviews();
    setError(null);

    if (!files.length) {
      setMediaIsValid(true);
      setMediaSummary(null);
      setUploadStates([]);
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
      const previews = files.map((file, index) => {
        const url = URL.createObjectURL(file);
        previewUrlsRef.current.push(url);
        return {
          name: file.name,
          kind: validated[index]?.kind === "VIDEO" ? "VIDEO" as const : "IMAGE" as const,
          url,
        };
      });

      setMediaIsValid(true);
      setMediaSummary(`${parts.join(" + ")} ready to upload.`);
      setUploadStates(files.map((file) => ({ name: file.name, status: "ready" })));
      setMediaPreviews(previews);
    } catch (caught) {
      clearMediaPreviews();
      setMediaIsValid(false);
      setMediaSummary(null);
      setUploadStates(files.map((file) => ({ name: file.name, status: "failed" })));
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
      setUploadStates(
        files.map((file) => {
          const cached = uploadCacheRef.current.get(fileFingerprint(file));
          return {
            name: file.name,
            status: cached?.completed ? "attached" : cached?.uploaded ? "uploaded" : "ready",
          };
        }),
      );
    } catch (caught) {
      setMediaIsValid(false);
      setError(caught instanceof Error ? caught.message : "Selected media is not valid.");
      return;
    }

    startTransition(async () => {
      try {
        formData.delete("media");
        let postId = pendingPostIdRef.current;
        if (!postId) {
          const post = await createFeedPost(formData);
          postId = post.id;
          pendingPostIdRef.current = post.id;
          setHasPendingPost(true);
        }

        const uploadTargets: UploadTarget[] = new Array(files.length);
        const missingIndexes = files
          .map((file, index) => ({ file, index, cached: uploadCacheRef.current.get(fileFingerprint(file)) }))
          .filter(({ cached }) => !cached?.uploaded);

        const freshTargets = missingIndexes.length
          ? await requestFeedPostMediaUploads(
              missingIndexes.map(({ file }) => ({
                name: file.name,
                mimeType: file.type,
                sizeBytes: file.size,
              })),
            )
          : [];

        let freshTargetIndex = 0;
        for (let index = 0; index < files.length; index += 1) {
          const file = files[index];
          if (!file) throw new Error("Media upload file mismatch.");

          const fingerprint = fileFingerprint(file);
          const cached = uploadCacheRef.current.get(fingerprint);
          if (cached?.uploaded) {
            uploadTargets[index] = cached.target;
            setUploadStatus(index, cached.completed ? "attached" : "uploaded");
            continue;
          }

          const target = freshTargets[freshTargetIndex];
          freshTargetIndex += 1;
          if (!target) throw new Error("Media upload target mismatch.");

          uploadCacheRef.current.set(fingerprint, { target, uploaded: false, completed: false });
          uploadTargets[index] = target;

          setUploadStatus(index, "uploading");
          const response = await fetch(target.uploadUrl, {
            method: target.method,
            headers: target.headers,
            body: file,
          });

          if (!response.ok) {
            uploadCacheRef.current.delete(fingerprint);
            setUploadStatus(index, "failed");
            throw new Error(`Media upload failed for ${file.name} (${response.status}). Retry will keep files that already uploaded.`);
          }

          uploadCacheRef.current.set(fingerprint, { target, uploaded: true, completed: false });
          setUploadStatus(index, "uploaded");
        }

        for (let index = 0; index < uploadTargets.length; index += 1) {
          const target = uploadTargets[index];
          const file = files[index];
          if (!target || !file) throw new Error("Media completion target mismatch.");

          const fingerprint = fileFingerprint(file);
          const cached = uploadCacheRef.current.get(fingerprint);
          if (cached?.completed) {
            setUploadStatus(index, "attached");
            continue;
          }

          setUploadStatus(index, "attaching");
          try {
            await completeFeedPostMediaUpload({
              postId,
              completionToken: target.completionToken,
            });
          } catch (caught) {
            setUploadStatus(index, "failed");
            throw caught;
          }

          uploadCacheRef.current.set(fingerprint, { target, uploaded: true, completed: true });
          setUploadStatus(index, "attached");
        }

        formRef.current?.reset();
        uploadCacheRef.current.clear();
        pendingPostIdRef.current = null;
        clearMediaPreviews();
        setHasPendingPost(false);
        setMediaSummary(null);
        setMediaIsValid(true);
        setUploadStates([]);
        router.refresh();
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : "Could not publish this update.";
        setError(
          pendingPostIdRef.current
            ? `Your post was created, but media attachment is incomplete. Retry to finish only the remaining media on this same post. ${message}`
            : message,
        );
      }
    });
  }

  const lockPostFields = isPending || hasPendingPost;

  return (
    <form ref={formRef} onSubmit={handleSubmit} className={`${styles.composer} card`}>
      <div className="eyebrow">POST TO THE SOCIETY</div>
      <textarea
        name="body"
        required
        maxLength={1200}
        placeholder="What are you working on?"
        disabled={lockPostFields}
      />
      <input
        name="media"
        type="file"
        accept="image/avif,image/gif,image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm"
        multiple
        onChange={handleMediaChange}
        aria-label={`Attach up to ${POST_MEDIA_LIMITS.maxFilesPerPost} photos or videos`}
        aria-invalid={!mediaIsValid}
        disabled={lockPostFields}
      />
      {mediaSummary && <p aria-live="polite">{mediaSummary}</p>}
      {mediaPreviews.length > 0 && (
        <div className={styles.composerPreviewGrid} data-count={mediaPreviews.length} aria-label="Selected media previews">
          {mediaPreviews.map((preview, index) => (
            <figure className={styles.composerPreview} key={`${preview.name}-${index}`}>
              {preview.kind === "VIDEO" ? (
                <video src={preview.url} controls preload="metadata" />
              ) : (
                <img src={preview.url} alt={`Preview of ${preview.name}`} />
              )}
              <figcaption>
                <span>{preview.kind}</span>
                <strong title={preview.name}>{preview.name}</strong>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
      {uploadStates.length > 0 && (
        <ul aria-label="Media upload status" aria-live="polite">
          {uploadStates.map((item, index) => (
            <li key={`${item.name}-${index}`}>
              {item.name} — {statusLabel(item.status)}
            </li>
          ))}
        </ul>
      )}
      {hasPendingPost && (
        <p role="status" aria-live="polite">
          Post saved. Keep this tab open until the remaining media is attached; retry will continue on this same post.
        </p>
      )}
      <div className={styles.composerRow}>
        <select name="carId" defaultValue="" disabled={lockPostFields}>
          <option value="">No car attached</option>
          {cars.map((car) => (
            <option key={car.id} value={car.id}>
              {car.nickname ? `${car.nickname} — ` : ""}{car.year} {car.make} {car.model}
            </option>
          ))}
        </select>
        <select name="kind" defaultValue="GENERAL" aria-label="Post type" disabled={lockPostFields}>
          {postKinds.map((kind) => (
            <option key={kind.value} value={kind.value}>{kind.label}</option>
          ))}
        </select>
        <button className="cta" type="submit" disabled={isPending || !mediaIsValid}>
          {isPending ? "UPLOADING…" : hasPendingPost ? "RETRY MEDIA →" : "DROP UPDATE →"}
        </button>
      </div>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
