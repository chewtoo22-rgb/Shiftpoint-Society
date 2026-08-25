"use client";

import { useActionState, useEffect, useRef } from "react";
import { addBuildUpdate, type BuildUpdateActionState } from "./actions";

const initialState: BuildUpdateActionState = { error: null };

type BuildUpdateFormProps = {
  carId: string;
};

export function BuildUpdateForm({ carId }: BuildUpdateFormProps) {
  const [state, formAction, pending] = useActionState(addBuildUpdate, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
    }
  }, [state.success]);

  return (
    <form
      ref={formRef}
      action={formAction}
      aria-describedby={state.error ? "build-update-error" : state.success ? "build-update-status" : undefined}
    >
      <input type="hidden" name="carId" value={carId} />
      <input
        name="title"
        minLength={3}
        maxLength={120}
        required
        placeholder="What changed?"
        aria-label="Build update title"
        defaultValue={state.values?.title}
      />
      <textarea
        name="body"
        minLength={3}
        maxLength={4000}
        required
        placeholder="Parts, settings, numbers, results, lessons..."
        aria-label="Build update details"
        defaultValue={state.values?.body}
      />

      {state.error ? (
        <p id="build-update-error" role="alert" aria-live="polite">
          {state.error}
        </p>
      ) : null}

      {state.success ? (
        <p id="build-update-status" role="status" aria-live="polite">
          BUILD UPDATE LOGGED.
        </p>
      ) : null}

      <button type="submit" disabled={pending}>
        {pending ? "LOGGING UPDATE…" : "LOG UPDATE →"}
      </button>
    </form>
  );
}
