import Link from "next/link";
import { getCurrentMember } from "@/lib/current-member";
import { updateMemberProfile } from "./actions";

export default async function ProfilePage() {
  const member = await getCurrentMember();

  return (
    <div className="shell onboardingShell">
      <div className="eyebrow">MEMBER ONBOARDING // IDENTITY</div>
      <h1 className="garageTitle">CLAIM YOUR<br/><em>CALLSIGN.</em></h1>
      <p className="lead">
        Your Society handle becomes the public URL for your garage. Keep it recognizable; the builds will do the flexing.
      </p>

      <form action={updateMemberProfile} className="onboardingForm">
        <label>
          <span>SOCIETY HANDLE</span>
          <input name="handle" required minLength={3} maxLength={32} pattern="[A-Za-z0-9_-]+" defaultValue={member.handle} />
        </label>
        <label>
          <span>DISPLAY NAME</span>
          <input name="displayName" required maxLength={80} defaultValue={member.displayName ?? member.handle} />
        </label>
        <label>
          <span>BIO // 280 MAX</span>
          <textarea name="bio" maxLength={280} rows={5} defaultValue={member.bio ?? ""} placeholder="What do you build, race, wrench on, or obsess over?" />
        </label>
        <div className="onboardingActions">
          <Link href="/garage">SKIP FOR NOW</Link>
          <button type="submit">SAVE & BUILD GARAGE →</button>
        </div>
      </form>
    </div>
  );
}
