import Link from "next/link";
import { createGarageCar } from "./actions";

export default function NewGarageCarPage() {
  return (
    <div className="shell onboardingShell">
      <div className="eyebrow">GARAGE ONBOARDING // STEP 01</div>
      <h1 className="garageTitle">ADD YOUR<br/><em>MACHINE.</em></h1>
      <p className="lead">Start with the facts. You can add dyno numbers, parts, photos and build history after the car exists.</p>

      <form action={createGarageCar} className="onboardingForm">
        <label><span>YEAR</span><input name="year" type="number" min="1886" max={new Date().getFullYear() + 1} required placeholder="2000" /></label>
        <label><span>MAKE</span><input name="make" required maxLength={80} placeholder="Ford" /></label>
        <label><span>MODEL</span><input name="model" required maxLength={80} placeholder="Contour SVT" /></label>
        <label><span>TRIM</span><input name="trim" maxLength={80} placeholder="SVT" /></label>
        <label><span>NICKNAME</span><input name="nickname" maxLength={80} placeholder="Optional" /></label>
        <label><span>ENGINE</span><input name="engine" maxLength={120} placeholder="2.5L Duratec V6" /></label>
        <label><span>DRIVETRAIN</span><input name="drivetrain" maxLength={80} placeholder="FWD / 5MT" /></label>
        <label><span>POWER HP</span><input name="powerHp" type="number" min="1" max="5000" placeholder="284" /></label>
        <div className="onboardingActions">
          <Link href="/garage">CANCEL</Link>
          <button type="submit">CREATE GARAGE →</button>
        </div>
      </form>
    </div>
  );
}
