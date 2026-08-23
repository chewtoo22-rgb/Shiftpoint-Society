import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicCarBuild } from "@/lib/public-car-repository";
import { BuildShareButton } from "./build-share-button";

export const dynamic = "force-dynamic";

type PublicCarPageProps = {
  params: Promise<{ handle: string; carId: string }>;
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function summarizePost(body: string) {
  const normalized = body.replace(/\s+/g, " ").trim();
  return normalized.length > 180 ? `${normalized.slice(0, 177)}...` : normalized;
}

export default async function PublicCarPage({ params }: PublicCarPageProps) {
  const { handle, carId } = await params;
  const car = await getPublicCarBuild(handle, carId);

  if (!car) notFound();

  const buildName = car.nickname ?? `${car.year} ${car.make} ${car.model}`;

  return (
    <div className="shell">
      <section className="hero" style={{ minHeight: "auto", paddingBottom: 42 }}>
        <div>
          <div className="eyebrow">PUBLIC BUILD // @{car.owner.handle.toUpperCase()}</div>
          <h1 style={{ fontSize: "clamp(42px,6vw,80px)" }}>
            {buildName.toUpperCase()}
          </h1>
          <p className="lead">
            {car.year} {car.make} {car.model}{car.trim ? ` ${car.trim}` : ""} · {car.isVerified ? "VERIFIED BUILD" : "ACTIVE BUILD"}
          </p>
          <p>
            {car.engine ?? "ENGINE NOT LOGGED"} · {car.drivetrain ?? "DRIVETRAIN NOT LOGGED"}
          </p>
        </div>
        <aside className="heroPanel">
          <div className="eyebrow">BUILD SNAPSHOT</div>
          <div className="gauge">{car.powerHp ?? "—"} <small>HP</small></div>
          <div className="gauge">{car.torqueLbFt ?? "—"} <small>LB-FT</small></div>
          <div className="gauge">
            {car.quarterMileSeconds ? car.quarterMileSeconds.toFixed(2) : "—"} <small>1/4 MI</small>
          </div>
          <p>{car._count.buildEntries} updates · {car._count.carParts} parts · {car._count.posts} Society posts</p>
          <div style={{ marginTop: 18 }}>
            <BuildShareButton handle={car.owner.handle} carId={car.id} buildName={buildName} />
          </div>
        </aside>
      </section>

      <section className="grid">
        <article className="card">
          <span className="number">// BUILD LOG</span>
          <h2>LATEST MILESTONES</h2>
          {car.buildEntries.length === 0 ? (
            <p>No build updates logged yet.</p>
          ) : (
            car.buildEntries.map((entry) => (
              <div key={entry.id} style={{ marginTop: 18 }}>
                <strong>{entry.title}</strong>
                <p>{formatDate(entry.occurredAt)}</p>
                <p>{entry.body}</p>
                {(entry.dynoHp || entry.dynoTorque || entry.mileage) && (
                  <p>
                    {entry.dynoHp ? `${entry.dynoHp} hp` : ""}
                    {entry.dynoHp && entry.dynoTorque ? " · " : ""}
                    {entry.dynoTorque ? `${entry.dynoTorque} lb-ft` : ""}
                    {(entry.dynoHp || entry.dynoTorque) && entry.mileage ? " · " : ""}
                    {entry.mileage ? `${entry.mileage.toLocaleString()} mi` : ""}
                  </p>
                )}
              </div>
            ))
          )}
        </article>

        <article className="card">
          <span className="number">// PARTS LEDGER</span>
          <h2>TRACKED HARDWARE</h2>
          {car.carParts.length === 0 ? (
            <p>No parts logged yet.</p>
          ) : (
            car.carParts.map(({ part, installedAt, notes }) => (
              <div key={part.id} style={{ marginTop: 18 }}>
                <strong>{part.brand} {part.name}</strong>
                <p>{part.category.toUpperCase()}{part.partNumber ? ` · ${part.partNumber}` : ""}</p>
                <p>{installedAt ? `Installed ${formatDate(installedAt)}` : "Tracked, not marked installed"}</p>
                {notes && <p>{notes}</p>}
              </div>
            ))
          )}
        </article>
      </section>

      <section style={{ marginTop: 28 }}>
        <article className="card">
          <span className="number">// SOCIETY ACTIVITY</span>
          <h2>RECENT POSTS ABOUT THIS BUILD</h2>
          {car.posts.length === 0 ? (
            <p>No Society posts have been attached to this build yet.</p>
          ) : (
            <div style={{ display: "grid", gap: 16, marginTop: 18 }}>
              {car.posts.map((post) => (
                <Link
                  key={post.id}
                  href={`/feed/${post.id}`}
                  style={{ color: "inherit", textDecoration: "none" }}
                >
                  <div className="heroPanel" style={{ padding: 18 }}>
                    <div className="eyebrow">{post.kind} // {formatDate(post.createdAt)}</div>
                    <p style={{ marginTop: 10 }}>{summarizePost(post.body)}</p>
                    <p style={{ marginTop: 10 }}>
                      {post._count.reactions} reactions · {post._count.comments} comments · VIEW POST →
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </article>
      </section>

      <section style={{ marginTop: 28, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Link className="garageButton" href={`/u/${car.owner.handle}`}>BACK TO MEMBER GARAGE</Link>
        <Link className="garageButton" href="/feed">SOCIETY FEED</Link>
      </section>
    </div>
  );
}
