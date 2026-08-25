"use client";

import { useActionState, useEffect, useRef } from "react";
import { addBuildUpdate, type BuildUpdateActionState } from "./actions";

const initialState: BuildUpdateActionState = { error: null };

type BuildUpdateFormProps = {
  carId: string;
};

function fieldDescriptionId(field: "title" | "body", hasError: boolean) {
  return hasError ? `build-update-${field}-error` : undefined;
}

export function BuildUpdateForm({ carId }: BuildUpdateFormProps) {
  const [state, formAction, pending] = useActionState(addBuildUpdate, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const titleError = state.fieldErrors?.title?.[0];
  const bodyError = state.fieldErrors?.body?.[0];

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
        aria-invalid={Boolean(titleError)}
        aria-describedby={fieldDescriptionId("title", Boolean(titleError))}
        defaultValue={state.values?.title}
      />
      {titleError ? (
        <p id="build-update-title-error" role="alert">
          {titleError}
        </p>
      ) : null}

      <textarea
        name="body"
        minLength={3}
        maxLength={4000}
        required
        placeholder="Parts, settings, numbers, results, lessons..."
        aria-label="Build update details"
        aria-invalid={Boolean(bodyError)}
        aria-describedby={fieldDescriptionId("body", Boolean(bodyError))}
        defaultValue={state.values?.body}
      />
      {bodyError ? (
        <p id="build-update-body-error" role="alert">
          {bodyError}
        </p>
      ) : null}

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
