"use client";

import { useActionState, useEffect, useRef } from "react";
import { addInstalledPart, type InstalledPartActionState } from "./actions";

const initialState: InstalledPartActionState = { error: null };

type InstalledPartFormProps = {
  carId: string;
};

export function InstalledPartForm({ carId }: InstalledPartFormProps) {
  const [state, formAction, pending] = useActionState(addInstalledPart, initialState);
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
      aria-describedby={state.error ? "installed-part-error" : state.success ? "installed-part-status" : undefined}
    >
      <input type="hidden" name="carId" value={carId} />
      <input
        name="brand"
        maxLength={80}
        required
        placeholder="Brand"
        aria-label="Part brand"
        defaultValue={state.values?.brand}
      />
      <input
        name="name"
        minLength={2}
        maxLength={140}
        required
        placeholder="Part name"
        aria-label="Part name"
        defaultValue={state.values?.name}
      />
      <input
        name="category"
        minLength={2}
        maxLength={80}
        required
        placeholder="Category"
        aria-label="Part category"
        defaultValue={state.values?.category}
      />
      <input
        name="partNumber"
        maxLength={80}
        placeholder="Part number (optional)"
        aria-label="Part number"
        defaultValue={state.values?.partNumber}
      />
      <textarea
        name="notes"
        maxLength={500}
        placeholder="Install notes, settings, fitment..."
        aria-label="Part notes"
        defaultValue={state.values?.notes}
      />

      {state.error ? (
        <p id="installed-part-error" role="alert" aria-live="polite">
          {state.error}
        </p>
      ) : null}

      {state.success ? (
        <p id="installed-part-status" role="status" aria-live="polite">
          PART LOGGED.
        </p>
      ) : null}

      <button type="submit" disabled={pending}>
        {pending ? "LOGGING PART…" : "LOG PART →"}
      </button>
    </form>
  );
}
