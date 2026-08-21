import { notFound } from "next/navigation";
import { getPublicMemberProfile } from "@/lib/member-profile-repository";

export const dynamic = "force-dynamic";

type PublicProfilePageProps = {
  params: Promise<{ handle: string }>;
};

export default async function PublicProfilePage({ params }: PublicProfilePageProps) {
  const { handle } = await params;
  const member = await getPublicMemberProfile(handle);

  if (!member) notFound();

  return (
    <div className="shell">
      <section className="hero" style={{ minHeight: "auto", paddingBottom: 42 }}>
        <div>
          <div className="eyebrow">MEMBER GARAGE // @{member.handle.toUpperCase()}</div>
          <h1 style={{ fontSize: "clamp(46px,7vw,92px)" }}>
            {(member.displayName ?? member.handle).toUpperCase()}
          </h1>
          <p className="lead">{member.bio ?? "Cars, parts, build history and proof. No empty flexing."}</p>
        </div>
        <aside className="heroPanel">
          <div className="eyebrow">SOCIETY PROFILE</div>
          <div className="gauge">{String(member.cars.length).padStart(2, "0")} <small>CARS</small></div>
          <div className="meter"><span style={{ width: `${Math.min(100, member.cars.length * 20)}%` }} /></div>
          <div className="gauge">{member.cars.filter((car) => car.isVerified).length} <small>VERIFIED</small></div>
        </aside>
      </section>

      <h2 className="sectionTitle">THE GARAGE</h2>
      <section className="grid">
        {member.cars.map((car) => (
          <article className="card" key={car.id}>
            <span className="number">// {car.isVerified ? "VERIFIED BUILD" : "ACTIVE BUILD"}</span>
            <h2>{car.year} {car.make} {car.model}</h2>
            <p>{car.nickname ? `“${car.nickname}” · ` : ""}{car.trim ?? ""}</p>
            <p>{car.engine ?? "ENGINE NOT LOGGED"} · {car.drivetrain ?? "DRIVETRAIN NOT LOGGED"}</p>
            <p><strong>{car.powerHp ? `${car.powerHp} HP` : "POWER TBD"}</strong></p>
            <p>{car._count.buildEntries} build updates · {car._count.carParts} parts logged</p>
          </article>
        ))}
      </section>
    </div>
  );
}
