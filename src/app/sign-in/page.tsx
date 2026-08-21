import { signIn } from "@/auth";

export default function SignInPage() {
  return (
    <div className="shell">
      <section className="hero" style={{ minHeight: "65vh" }}>
        <div>
          <div className="eyebrow">MEMBER ACCESS // SHIFTPOINT SOCIETY</div>
          <h1>ENTER THE <em>SOCIETY.</em></h1>
          <p className="lead">
            Sign in with GitHub, claim your Society identity, then add your first car.
            Your garage, build history, and parts ledger stay tied to your member account.
          </p>
          <form
            action={async () => {
              "use server";
              await signIn("github", { redirectTo: "/profile" });
            }}
          >
            <button className="cta" type="submit">SIGN IN WITH GITHUB →</button>
          </form>
        </div>
        <aside className="heroPanel">
          <div className="eyebrow">FIRST-LAP FLOW</div>
          <h2>SIGN IN → CALLSIGN → FIRST CAR</h2>
          <p className="lead" style={{ fontSize: 15 }}>
            New members move through identity setup before entering the garage, so public handles and ownership are established before the first build is created.
          </p>
        </aside>
      </section>
    </div>
  );
}
