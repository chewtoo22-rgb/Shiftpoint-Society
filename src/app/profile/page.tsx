import { getCurrentMember } from "@/lib/current-member";
import { ProfileForm } from "./ProfileForm";

export default async function ProfilePage() {
  const member = await getCurrentMember();
  const publicProfileHref = `/u/${encodeURIComponent(member.handle)}`;

  return (
    <div className="shell onboardingShell">
      <div className="eyebrow">MEMBER PROFILE // IDENTITY</div>
      <h1 className="garageTitle">CLAIM YOUR<br/><em>CALLSIGN.</em></h1>
      <p className="lead">
        Your Society handle becomes the public URL for your garage. Keep it recognizable; the builds will do the flexing.
      </p>

      <ProfileForm
        handle={member.handle}
        displayName={member.displayName ?? member.handle}
        bio={member.bio ?? ""}
        publicProfileHref={publicProfileHref}
      />
    </div>
  );
}
