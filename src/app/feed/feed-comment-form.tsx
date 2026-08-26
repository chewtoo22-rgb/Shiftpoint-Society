"use client";

import { useActionState, useEffect, useId, useRef } from "react";
import { submitFeedComment, type FeedCommentActionState } from "./actions";
import styles from "./feed.module.css";

const initialState: FeedCommentActionState = { error: null };

type FeedCommentFormProps = {
  postId: string;
};

export function FeedCommentForm({ postId }: FeedCommentFormProps) {
  const [state, formAction, pending] = useActionState(submitFeedComment, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const id = useId();
  const bodyError = state.fieldErrors?.body?.[0];
  const fieldErrorId = `${id}-comment-error`;
  const formStatusId = `${id}-comment-status`;

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
    }
  }, [state.success]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className={styles.commentForm}
      aria-describedby={state.error ? formStatusId : state.success ? formStatusId : undefined}
    >
      <input type="hidden" name="postId" value={postId} />
      <div>
        <input
          name="body"
          required
          maxLength={600}
          placeholder="Add to the wrench talk…"
          aria-label="Add a comment"
          aria-invalid={Boolean(bodyError)}
          aria-describedby={bodyError ? fieldErrorId : undefined}
          defaultValue={state.value}
        />
        {bodyError ? (
          <p id={fieldErrorId} role="alert">
            {bodyError}
          </p>
        ) : null}
      </div>
      <button type="submit" disabled={pending}>
        {pending ? "REPLYING…" : "REPLY →"}
      </button>
      {state.error ? (
        <p id={formStatusId} role="alert" aria-live="polite">
          {state.error}
        </p>
      ) : state.success ? (
        <p id={formStatusId} role="status" aria-live="polite">
          REPLY POSTED.
        </p>
      ) : null}
    </form>
  );
}
