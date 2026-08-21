import { signIn } from "@/auth";

export default function SignInPage() {
  return (
    <div className="shell">
      <section className="hero" style={{ minHeight: "65vh" }}>
        <div>
          <div className="eyebrow">MEMBER ACCESS // SHIFTPOINT SOCIETY</div>
          <h1>ENTER THE <em>SOCIETY.</em></h1>
          <p className="lead">
            Sign in with GitHub to claim your member identity, create your garage,
            log build updates, and keep your parts ledger tied to you.
          </p>
          <form
            action={async () => {
              "use server";
              await signIn("github", { redirectTo: "/garage" });
            }}
          >
            <button className="cta" type="submit">SIGN IN WITH GITHUB →</button>
          </form>
        </div>
        <aside className="heroPanel">
          <div className="eyebrow">IDENTITY RULES</div>
          <h2>YOUR CAR. YOUR LOG. YOUR REP.</h2>
          <p className="lead" style={{ fontSize: 15 }}>
            Owner-scoped garage actions never trust an owner ID from the browser.
            The authenticated session defines ownership at the server boundary.
          </p>
        </aside>
      </section>
    </div>
  );
}
