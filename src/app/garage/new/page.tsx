import { NewGarageCarForm } from "./NewGarageCarForm";

export default function NewGarageCarPage() {
  return (
    <div className="shell onboardingShell">
      <div className="eyebrow">GARAGE ONBOARDING // STEP 01</div>
      <h1 className="garageTitle">ADD YOUR<br/><em>MACHINE.</em></h1>
      <p className="lead">Start with the facts. You can add dyno numbers, parts, photos and build history after the car exists.</p>
      <NewGarageCarForm />
    </div>
  );
}
