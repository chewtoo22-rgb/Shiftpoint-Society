"use client";

import Link from "next/link";
import { useActionState } from "react";
import { createGarageCar, type GarageCarActionState, type GarageCarFormValues } from "./actions";

const initialState: GarageCarActionState = { error: null };

type FieldProps = {
  name: keyof GarageCarFormValues;
  label: string;
  defaultValue?: string;
  type?: "text" | "number";
  min?: string;
  max?: string;
  minLength?: number;
  maxLength?: number;
  placeholder?: string;
  required?: boolean;
  errors?: string[];
};

function GarageField({
  name,
  label,
  defaultValue,
  type = "text",
  min,
  max,
  minLength,
  maxLength,
  placeholder,
  required,
  errors,
}: FieldProps) {
  const errorId = `garage-car-${name}-error`;
  const hasError = Boolean(errors?.length);

  return (
    <label>
      <span>{label}</span>
      <input
        name={name}
        type={type}
        min={min}
        max={max}
        minLength={minLength}
        maxLength={maxLength}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue}
        aria-invalid={hasError || undefined}
        aria-describedby={hasError ? errorId : undefined}
      />
      {hasError ? (
        <small id={errorId} className="fieldError">
          {errors?.[0]}
        </small>
      ) : null}
    </label>
  );
}

export function NewGarageCarForm() {
  const [state, formAction, pending] = useActionState(createGarageCar, initialState);
  const values = state.values;
  const fieldErrors = state.fieldErrors;

  return (
    <form
      action={formAction}
      className="onboardingForm"
      aria-describedby={state.error ? "garage-car-form-error" : undefined}
      noValidate
    >
      <GarageField name="year" label="YEAR" type="number" min="1886" max={String(new Date().getFullYear() + 1)} required placeholder="2000" defaultValue={values?.year} errors={fieldErrors?.year} />
      <GarageField name="make" label="MAKE" required minLength={2} maxLength={80} placeholder="Ford" defaultValue={values?.make} errors={fieldErrors?.make} />
      <GarageField name="model" label="MODEL" required maxLength={80} placeholder="Contour SVT" defaultValue={values?.model} errors={fieldErrors?.model} />
      <GarageField name="trim" label="TRIM" maxLength={80} placeholder="SVT" defaultValue={values?.trim} errors={fieldErrors?.trim} />
      <GarageField name="nickname" label="NICKNAME" maxLength={80} placeholder="Optional" defaultValue={values?.nickname} errors={fieldErrors?.nickname} />
      <GarageField name="engine" label="ENGINE" maxLength={120} placeholder="2.5L Duratec V6" defaultValue={values?.engine} errors={fieldErrors?.engine} />
      <GarageField name="drivetrain" label="DRIVETRAIN" maxLength={80} placeholder="FWD / 5MT" defaultValue={values?.drivetrain} errors={fieldErrors?.drivetrain} />
      <GarageField name="powerHp" label="POWER HP" type="number" min="1" max="5000" placeholder="284" defaultValue={values?.powerHp} errors={fieldErrors?.powerHp} />

      {state.error ? (
        <p id="garage-car-form-error" role="alert" aria-live="polite">
          {state.error}
        </p>
      ) : null}

      <div className="onboardingActions">
        <Link href="/profile">BACK TO PROFILE</Link>
        <button type="submit" disabled={pending}>
          {pending ? "CREATING MACHINE…" : "CREATE GARAGE →"}
        </button>
      </div>
    </form>
  );
}
