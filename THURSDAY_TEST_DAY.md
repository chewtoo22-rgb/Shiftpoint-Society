# Shiftpoint Society Thursday Hands-On Test Runbook

This runbook is for validating the Phase 0 Society experience on a real browser against a test deployment. It intentionally separates CI-proven behavior from hands-on behavior that has not yet been exercised.

## Hard gate before testing

Do not promote a checkpoint for hands-on testing unless the latest `Shiftpoint CI` run for `phase-0/foundation` is green. The workflow must complete Prisma generation, TypeScript typecheck, Vitest, and the production Next.js build.

Record the tested commit SHA and CI run number before starting.

## Test accounts and data

Use two separate authenticated Society members, **Member A** and **Member B**. Give each member at least one unique handle. Keep at least one account with no cars initially so first-garage onboarding can be exercised.

Do not use production credentials or production-only data.

## 1. Authentication and onboarding continuity

1. Sign in as Member A.
2. Open Profile and save a mixed-case handle such as `Boosted_SVT`.
3. Confirm the stored/public identity resolves through the canonical lowercase handle.
4. If Member A owns no cars, confirm profile completion continues to `/garage/new`.
5. Create the first car and confirm the flow returns to the garage.
6. Open the public garage from Profile and confirm the new car is visible without an extra cache wait.
7. Re-open the public profile with different handle casing and confirm it resolves to the same member.

Expected boundary: browser-submitted member/owner IDs must never decide ownership; the authenticated server-side member does.

## 2. Garage ownership isolation

1. As Member A, create or select a car and note its ID from the URL.
2. Sign in as Member B.
3. Attempt to navigate to or submit Member A's car ID through any available garage/build form or URL.
4. Confirm Member B cannot read or mutate Member A's private garage state.
5. Confirm Member B can still view Member A's explicitly public garage/build pages read-only.

Expected boundary: private garage reads and writes require `carId + authenticated owner`; public pages remain read-only and expose only their explicit public projection.

## 3. Build updates and parts ledger

1. As the car owner, add a build-log milestone with leading/trailing whitespace in the title/body.
2. Confirm normalized content appears in the private garage.
3. Open the public build and confirm the new milestone appears immediately.
4. Add an installed part.
5. Confirm the private parts ledger updates and the public build reflects the change.
6. Repeat the ownership-isolation attempt from Member B using Member A's car ID.

Expected boundary: a foreign car ID must fail before build-log or shared-parts persistence is touched.

## 4. Society feed interactions

1. As Member A, create a post without a car.
2. Create another post attached to a car owned by Member A.
3. Attempt to attach Member B's car ID and confirm the write is rejected.
4. As Member B, comment and react to Member A's post.
5. Return to Member A and verify Activity shows that engagement.
6. Mark Activity seen, switch accounts, and confirm unread state is independent per member.

Expected boundary: post authorship, comments, and reactions are bound to the authenticated member; client identity fields cannot override it.

## 5. Media/upload path

Exercise both an image and a video candidate if the configured test storage supports them.

1. Choose a normal filename and complete the upload/attach flow.
2. Confirm progress reaches completion and the media appears on the intended post.
3. Retry completion and confirm it is idempotent rather than duplicating media.
4. Try an overlong filename, path-like filename (`../x.jpg`, `a\\b.jpg`), and a filename containing a bidi/control character; confirm validation fails before storage/persistence.
5. Attempt to complete an upload against a post owned by another member; confirm it fails closed.

Expected boundary: upload intent, object-key namespace, signed completion grant, authenticated member, and owned post must all agree before persistence.

## 6. Public garage/privacy checks

1. Open a member with zero public cars and confirm the intentional empty state is shown.
2. Open a member with cars and inspect profile/build pages while signed out if supported by the deployment.
3. Confirm no internal user IDs, auth subjects, owner IDs, or private relationship data are rendered or exposed in page payloads.
4. Confirm public build lookup requires both the requested car ID and owner handle.
5. If a test member has more than 50 cars, confirm the page reports the true total while showing only the bounded recent set.

Expected boundary: public routes are read-only, bounded, and use explicit field allowlists.

## 7. Keyboard and accessibility smoke test

1. Reload a page and press Tab.
2. Confirm **Skip to Content** appears and Enter moves focus to the main content region.
3. Continue through Feed, Activity, Garage, and Profile controls with the keyboard only.
4. Confirm visible focus indication is never lost.
5. Confirm the active primary destination is exposed as the current page in both desktop and mobile navigation.
6. Exercise the media viewer with keyboard controls if media is present.

## 8. Browser/release shell checks

Inspect response headers on several representative routes and confirm:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` disables camera, microphone, and geolocation

Do not add or validate a production CSP until all real OAuth, media, and storage origins are known and tested.

## Defect capture

For every failure, record:

- commit SHA and CI run number
- account role (A/B/signed out)
- route and action attempted
- expected vs. observed result
- browser/device
- console/network error if relevant
- whether data was written despite the failure

Treat any cross-member write, private-data disclosure, upload ownership bypass, or destructive inconsistency as a release blocker.

## Ready-to-call-tested criteria

A capability is only considered hands-on validated after the relevant steps above are actually exercised on the Thursday deployment. Passing CI alone proves the automated gates; it does not prove browser, auth-provider, storage-provider, or deployment-specific behavior.
