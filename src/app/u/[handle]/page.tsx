import Link from "next/link";
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

  const carCount = member._count.cars;
  const renderedCarCount = member.cars.length;
  const verifiedShownCount = member.cars.filter((car) => car.isVerified).length;
  const isGarageTruncated = carCount > renderedCarCount;

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
        <aside className="heroPanel" aria-label="Garage summary">
          <div className="eyebrow">SOCIETY PROFILE</div>
          <div className="gauge">{String(carCount).padStart(2, "0")} <small>{carCount === 1 ? "CAR" : "CARS"}</small></div>
          <div className="meter"><span style={{ width: `${Math.min(100, carCount * 20)}%` }} /></div>
          <div className="gauge">
            {verifiedShownCount} <small>{isGarageTruncated ? "VERIFIED SHOWN" : "VERIFIED"}</small>
          </div>
        </aside>
      </section>

      <h2 className="sectionTitle" id="garage-title">THE GARAGE</h2>
      {carCount === 0 ? (
        <section className="card" aria-labelledby="garage-title">
          <span className="number">// GARAGE INITIALIZING</span>
          <h2>NO PUBLIC BUILDS YET</h2>
          <p>This member has not published a car build to their Society garage yet.</p>
          <p>Check back when the first machine, parts ledger, and build updates are logged.</p>
        </section>
      ) : (
        <>
          {isGarageTruncated && (
            <p className="lead" aria-live="polite">
              Showing the {renderedCarCount} most recently updated builds from this {carCount}-car garage.
            </p>
          )}
          <section className="grid" aria-labelledby="garage-title">
            {member.cars.map((car) => (
              <Link
                aria-label={`View ${car.year} ${car.make} ${car.model} build`}
                className="card"
                href={`/u/${member.handle}/cars/${car.id}`}
                key={car.id}
              >
                <span className="number">// {car.isVerified ? "VERIFIED BUILD" : "ACTIVE BUILD"}</span>
                <h2>{car.year} {car.make} {car.model}</h2>
                <p>{car.nickname ? `“${car.nickname}” · ` : ""}{car.trim ?? ""}</p>
                <p>{car.engine ?? "ENGINE NOT LOGGED"} · {car.drivetrain ?? "DRIVETRAIN NOT LOGGED"}</p>
                <p><strong>{car.powerHp ? `${car.powerHp} HP` : "POWER TBD"}</strong></p>
                <p>{car._count.buildEntries} build updates · {car._count.carParts} parts logged</p>
                <span className="garageButton">VIEW BUILD →</span>
              </Link>
            ))}
          </section>
        </>
      )}
    </div>
  );
}
