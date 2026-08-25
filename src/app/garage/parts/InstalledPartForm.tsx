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
  const fieldErrors = state.fieldErrors ?? {};

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
        aria-invalid={fieldErrors.brand?.length ? true : undefined}
        aria-describedby={fieldErrors.brand?.length ? "installed-part-brand-error" : undefined}
        defaultValue={state.values?.brand}
      />
      {fieldErrors.brand?.length ? (
        <p id="installed-part-brand-error">{fieldErrors.brand.join(" ")}</p>
      ) : null}

      <input
        name="name"
        minLength={2}
        maxLength={140}
        required
        placeholder="Part name"
        aria-label="Part name"
        aria-invalid={fieldErrors.name?.length ? true : undefined}
        aria-describedby={fieldErrors.name?.length ? "installed-part-name-error" : undefined}
        defaultValue={state.values?.name}
      />
      {fieldErrors.name?.length ? (
        <p id="installed-part-name-error">{fieldErrors.name.join(" ")}</p>
      ) : null}

      <input
        name="category"
        minLength={2}
        maxLength={80}
        required
        placeholder="Category"
        aria-label="Part category"
        aria-invalid={fieldErrors.category?.length ? true : undefined}
        aria-describedby={fieldErrors.category?.length ? "installed-part-category-error" : undefined}
        defaultValue={state.values?.category}
      />
      {fieldErrors.category?.length ? (
        <p id="installed-part-category-error">{fieldErrors.category.join(" ")}</p>
      ) : null}

      <input
        name="partNumber"
        maxLength={80}
        placeholder="Part number (optional)"
        aria-label="Part number"
        aria-invalid={fieldErrors.partNumber?.length ? true : undefined}
        aria-describedby={fieldErrors.partNumber?.length ? "installed-part-number-error" : undefined}
        defaultValue={state.values?.partNumber}
      />
      {fieldErrors.partNumber?.length ? (
        <p id="installed-part-number-error">{fieldErrors.partNumber.join(" ")}</p>
      ) : null}

      <textarea
        name="notes"
        maxLength={500}
        placeholder="Install notes, settings, fitment..."
        aria-label="Part notes"
        aria-invalid={fieldErrors.notes?.length ? true : undefined}
        aria-describedby={fieldErrors.notes?.length ? "installed-part-notes-error" : undefined}
        defaultValue={state.values?.notes}
      />
      {fieldErrors.notes?.length ? (
        <p id="installed-part-notes-error">{fieldErrors.notes.join(" ")}</p>
      ) : null}

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
