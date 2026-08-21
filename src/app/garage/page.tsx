import Link from "next/link";
import { addBuildUpdate } from "@/app/garage/actions";
import { getPrimaryGarage } from "@/lib/garage-repository";

export const dynamic = "force-dynamic";

export default async function GaragePage() {
  const garage = await getPrimaryGarage();

  return (
    <div className="shell garageShell">
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
        <form action={addBuildUpdate}>
          <input type="hidden" name="carId" value={garage.id} />
          <input name="title" minLength={3} maxLength={120} required placeholder="What changed?" aria-label="Build update title" />
          <textarea name="body" minLength={3} maxLength={4000} required placeholder="Parts, settings, numbers, results, lessons..." aria-label="Build update details" />
          <button type="submit">LOG UPDATE →</button>
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
