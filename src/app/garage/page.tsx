const mods = [
  ["INTAKE", "Cold-air system", "+8 hp"],
  ["EXHAUST", "3-inch cat-back", "+14 hp"],
  ["SUSPENSION", "Coilover setup", "-1.4 in"],
  ["TUNE", "93 octane street map", "+31 hp"],
];

const timeline = [
  ["AUG 18", "Baseline dyno", "231 WHP / 218 WTQ"],
  ["AUG 09", "Suspension reset", "Ride height, damping and alignment dialed in"],
  ["JUL 27", "Exhaust installed", "Full 3-inch system with resonator"],
];

export default function GaragePage() {
  return (
    <div className="shell garageShell">
      <section className="garageHero">
        <div>
          <div className="eyebrow">MY GARAGE // BUILD 001</div>
          <h1 className="garageTitle">2000 FORD<br/><em>CONTOUR SVT</em></h1>
          <p className="lead">Real car. Real parts. Real numbers. Every change gets a timestamp, context and proof trail instead of disappearing into a social feed.</p>
        </div>
        <div className="specPlate">
          <div><span>ENGINE</span><strong>2.5L DURATEC V6</strong></div>
          <div><span>DRIVETRAIN</span><strong>FWD / 5MT</strong></div>
          <div><span>POWER</span><strong>284 HP</strong></div>
          <div><span>1/4 MILE</span><strong>13.94 @ 101</strong></div>
        </div>
      </section>

      <section className="garageStats">
        <article><span>BUILD STATUS</span><strong>ACTIVE</strong><small>Last updated 3 days ago</small></article>
        <article><span>WRENCH SCORE</span><strong>87</strong><small>Community verified</small></article>
        <article><span>PARTS LOGGED</span><strong>24</strong><small>19 currently installed</small></article>
        <article><span>BUILD AGE</span><strong>04Y</strong><small>Still evolving</small></article>
      </section>

      <section className="garageColumns">
        <div>
          <div className="sectionKicker">CURRENT SETUP</div>
          <div className="modList">
            {mods.map(([type, name, delta]) => (
              <article key={type} className="modRow">
                <span>{type}</span><strong>{name}</strong><b>{delta}</b>
              </article>
            ))}
          </div>
        </div>
        <div>
          <div className="sectionKicker">BUILD LOG</div>
          <div className="timeline">
            {timeline.map(([date, title, detail]) => (
              <article key={date + title}>
                <time>{date}</time><div><strong>{title}</strong><p>{detail}</p></div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
