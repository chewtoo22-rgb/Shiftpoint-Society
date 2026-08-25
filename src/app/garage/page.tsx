import Link from "next/link";
import { redirect } from "next/navigation";
import { BuildUpdateForm } from "@/app/garage/BuildUpdateForm";
import { addInstalledPart } from "@/app/garage/parts/actions";
import { getGarage, getGarageSwitcher } from "@/lib/garage-repository";

export const dynamic = "force-dynamic";

type GaragePageProps = {
  searchParams?: Promise<{ car?: string }>;
};

export default async function GaragePage({ searchParams }: GaragePageProps) {
  const params = await searchParams;
  const selectedCarId = params?.car;
  const [garage, cars] = await Promise.all([
    getGarage(selectedCarId),
    getGarageSwitcher(),
  ]);

  if (!garage) {
    // An invalid/foreign explicit selection should fall back to the member's canonical
    // garage. A healthy empty garage should continue into first-car onboarding.
    redirect(selectedCarId ? "/garage" : "/garage/new");
  }

  return (
    <div className="shell garageShell">
      {cars.length > 1 && (
        <section className="garageSwitcher" aria-label="Garage vehicles">
          <div className="sectionKicker">MY VEHICLES</div>
          <div className="garageSwitcherLinks">
            {cars.map((car) => {
              const active = car.id === garage.id;
              const label = car.nickname?.trim() || `${car.year} ${car.make} ${car.model}`;
              return (
                <Link
                  key={car.id}
                  className={active ? "garageButton" : "secondaryCta"}
                  href={`/garage?car=${encodeURIComponent(car.id)}`}
                  aria-current={active ? "page" : undefined}
                >
                  {label.toUpperCase()}
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <section className="garageHero">
        <div>
          <div className="eyebrow">{garage.eyebrow}</div>
          <h1 className="garageTitle">{garage.year} {garage.make}<br/><em>{garage.model}</em></h1>
          <p className="lead">Real car. Real parts. Real numbers. Every change gets a timestamp, context and proof trail instead of disappearing into a social feed.</p>
          <p><Link className="secondaryCta" href="/garage/new">+ ADD ANOTHER CAR</Link></p>
        </div>
        <div className="specPlate">
          <div><span>ENGINE</span><strong>{garage.engine}</strong></div>
          <div><span>DRIVETRAIN</span><strong>{garage.drivetrain}</strong></div>
          <div><span>POWER</span><strong>{garage.power}</strong></div>
          <div><span>1/4 MILE</span><strong>{garage.quarterMile}</strong></div>
        </div>
      </section>

      <section className="garageStats">
        <article><span>BUILD STATUS</span><strong>{garage.status}</strong><small>{garage.lastUpdated}</small></article>
        <article><span>WRENCH SCORE</span><strong>{garage.wrenchScore}</strong><small>Community verified</small></article>
        <article><span>PARTS LOGGED</span><strong>{garage.partsLogged}</strong><small>{garage.partsInstalled} currently installed</small></article>
        <article><span>BUILD AGE</span><strong>{garage.buildAge}</strong><small>Still evolving</small></article>
      </section>

      <section className="buildComposer">
        <div>
          <div className="sectionKicker">LOG THE WORK</div>
          <h2>ADD BUILD UPDATE</h2>
          <p>Turn wrench time into permanent build history.</p>
        </div>
        <BuildUpdateForm carId={garage.id} />
      </section>

      <section className="buildComposer partsComposer">
        <div>
          <div className="sectionKicker">PARTS LEDGER</div>
          <h2>LOG INSTALLED PART</h2>
          <p>Build the exact machine history, one installed component at a time.</p>
        </div>
        <form action={addInstalledPart}>
          <input type="hidden" name="carId" value={garage.id} />
          <input name="brand" maxLength={80} required placeholder="Brand" aria-label="Part brand" />
          <input name="name" maxLength={140} required placeholder="Part name" aria-label="Part name" />
          <input name="category" maxLength={80} required placeholder="Category" aria-label="Part category" />
          <input name="partNumber" maxLength={80} placeholder="Part number (optional)" aria-label="Part number" />
          <textarea name="notes" maxLength={500} placeholder="Install notes, settings, fitment..." aria-label="Part notes" />
          <button type="submit">LOG PART →</button>
        </form>
      </section>

      <section className="garageColumns">
        <div>
          <div className="sectionKicker">CURRENT SETUP</div>
          <div className="modList">
            {garage.mods.map((mod) => (
              <article key={`${mod.type}-${mod.name}`} className="modRow">
                <span>{mod.type}</span><strong>{mod.name}</strong><b>{mod.delta}</b>
              </article>
            ))}
          </div>
        </div>
        <div>
          <div className="sectionKicker">BUILD LOG</div>
          <div className="timeline">
            {garage.timeline.map((item) => (
              <article key={item.date + item.title}>
                <time>{item.date}</time><div><strong>{item.title}</strong><p>{item.detail}</p></div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
