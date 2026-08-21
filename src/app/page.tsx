import Link from "next/link";

const pillars = [
  ["01", "REAL GARAGES", "Your cars are your profile. Document the build, dyno numbers, parts, wins, failures and every wrench turn between."],
  ["02", "THE MEET NEVER ENDS", "Pulls, installs, track nights and questions flow through a community feed built around cars instead of engagement bait."],
  ["03", "WRENCH KNOWLEDGE", "Model-specific mechanical knowledge, community fixes and verified builds turn experience into something the next owner can use."],
  ["04", "PARTS THAT FIT", "See what's actually installed on community cars, discover deals in context and follow prices on the parts you want."],
  ["05", "LOCAL SCENE", "Find meets, track nights and people building nearby without losing the larger national community."],
  ["06", "LEGENDS REVIVED", "Later, your Society identity crosses into the drag game. Same account. Same garage DNA. A new place to race."],
];

export default function Home() {
  return <div className="shell">
    <section className="hero">
      <div>
        <div className="eyebrow">CARS & COFFEE THAT NEVER ENDS // EST. 2026</div>
        <h1>BUILT TO <em>DRIVE.</em><br/>BUILT TOGETHER.</h1>
        <p className="lead">Shiftpoint Society is the digital garage for people who actually care about the machine. Build logs, real-world knowledge, video, meets, parts and the people behind all of it.</p>
        <p><Link className="cta" href="/garage">START YOUR GARAGE →</Link></p>
      </div>
      <aside className="heroPanel">
        <div className="eyebrow">SOCIETY TELEMETRY</div>
        <div className="gauge">1320 <small>FT</small></div><div className="meter"><span/></div>
        <div className="gauge">000 <small>FAKE CLOUT</small></div><div className="meter"><span style={{width:"4%"}}/></div>
        <div className="gauge">100 <small>% COMMUNITY</small></div><div className="meter"><span style={{width:"100%"}}/></div>
      </aside>
    </section>
    <h2 className="sectionTitle">THE SOCIETY</h2>
    <p className="lead">Content gives us something to gather around. Community makes us come back.</p>
    <section className="grid">
      {pillars.map(([n,title,body])=><article className="card" key={n}><span className="number">// {n}</span><h2>{title}</h2><p>{body}</p></article>)}
    </section>
  </div>;
}
