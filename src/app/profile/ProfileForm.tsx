"use client";

import Link from "next/link";
import { useActionState } from "react";
import { type ProfileActionState, updateMemberProfile } from "./actions";

type ProfileFormProps = {
  handle: string;
  displayName: string;
  bio: string;
  publicProfileHref: string;
};

const initialState: ProfileActionState = { error: null };

export function ProfileForm({ handle, displayName, bio, publicProfileHref }: ProfileFormProps) {
  const [state, formAction, pending] = useActionState(updateMemberProfile, initialState);

  return (
    <form
      action={formAction}
      className="onboardingForm"
      aria-describedby={state.error ? "profile-form-error" : undefined}
    >
      <label>
        <span>SOCIETY HANDLE</span>
        <input name="handle" required minLength={3} maxLength={32} pattern="[A-Za-z0-9_-]+" defaultValue={handle} />
      </label>
      <label>
        <span>DISPLAY NAME</span>
        <input name="displayName" required maxLength={80} defaultValue={displayName} />
      </label>
      <label>
        <span>BIO // 280 MAX</span>
        <textarea
          name="bio"
          maxLength={280}
          rows={5}
          defaultValue={bio}
          placeholder="What do you build, race, wrench on, or obsess over?"
        />
      </label>

      {state.error ? (
        <p id="profile-form-error" role="alert" aria-live="polite">
          {state.error}
        </p>
      ) : null}

      <div className="onboardingActions">
        <Link href={publicProfileHref}>VIEW PUBLIC GARAGE ↗</Link>
        <Link href="/garage">BACK TO GARAGE</Link>
        <button type="submit" disabled={pending}>
          {pending ? "SAVING PROFILE…" : "SAVE PROFILE →"}
        </button>
      </div>
    </form>
  );
}
