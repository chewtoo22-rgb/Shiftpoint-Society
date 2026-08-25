"use client";

import Link from "next/link";
import { useActionState } from "react";
import { createGarageCar, type GarageCarActionState } from "./actions";

const initialState: GarageCarActionState = { error: null };

export function NewGarageCarForm() {
  const [state, formAction, pending] = useActionState(createGarageCar, initialState);
  const values = state.values;

  return (
    <form
      action={formAction}
      className="onboardingForm"
      aria-describedby={state.error ? "garage-car-form-error" : undefined}
    >
      <label><span>YEAR</span><input name="year" type="number" min="1886" max={new Date().getFullYear() + 1} required placeholder="2000" defaultValue={values?.year} /></label>
      <label><span>MAKE</span><input name="make" required minLength={2} maxLength={80} placeholder="Ford" defaultValue={values?.make} /></label>
      <label><span>MODEL</span><input name="model" required maxLength={80} placeholder="Contour SVT" defaultValue={values?.model} /></label>
      <label><span>TRIM</span><input name="trim" maxLength={80} placeholder="SVT" defaultValue={values?.trim} /></label>
      <label><span>NICKNAME</span><input name="nickname" maxLength={80} placeholder="Optional" defaultValue={values?.nickname} /></label>
      <label><span>ENGINE</span><input name="engine" maxLength={120} placeholder="2.5L Duratec V6" defaultValue={values?.engine} /></label>
      <label><span>DRIVETRAIN</span><input name="drivetrain" maxLength={80} placeholder="FWD / 5MT" defaultValue={values?.drivetrain} /></label>
      <label><span>POWER HP</span><input name="powerHp" type="number" min="1" max="5000" placeholder="284" defaultValue={values?.powerHp} /></label>

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
