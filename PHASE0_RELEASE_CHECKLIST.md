# Shiftpoint Society Phase 0 Release Checklist

This checklist turns the current Phase 0 hardening boundary into explicit merge evidence. It does not expand product scope.

## Exact-head validation

- [ ] Record the exact Phase 0 commit under test.
- [ ] `Shiftpoint CI` passes on that exact commit.
- [ ] Prisma generation passes.
- [ ] TypeScript typecheck passes.
- [ ] Vitest passes.
- [ ] Production Next.js build passes.

## Auth and ownership boundaries

- [ ] Member-scoped writes resolve the current member server-side.
- [ ] Public member lookup is constrained by requested handle.
- [ ] Public build lookup is constrained by both car ID and owner handle.
- [ ] Public post detail is constrained to the requested post ID.
- [ ] Malformed writes are rejected before auth/database side effects where validation can occur first.

## Media integrity

- [ ] Upload intent is bound to the authenticated member.
- [ ] Ownership and metadata are revalidated in the persistence transaction.
- [ ] Four-media attachment cap is enforced transactionally.
- [ ] Completion is idempotent and retries do not create duplicate attachments/posts.
- [ ] Pending media survives safe retry without silently creating a second post.
- [ ] Orphan reporting remains non-destructive; cleanup is not exposed through normal UI paths.

## Garage and build identity

- [ ] Category-distinct parts do not collapse to one catalog identity.
- [ ] Installed and ledger counts remain owner scoped.
- [ ] Large garages/builds use bounded preview projections while preserving accurate counts.
- [ ] Build/feed history ordering is deterministic when timestamps tie.
- [ ] Deep links resolve only the intended owner/car/build/post records.

## Cache and projection correctness

- [ ] Comment/reaction writes refresh the intended feed-detail cache.
- [ ] Missing-post writes do not trigger bogus refreshes.
- [ ] Bounded projections do not change authoritative counts.
- [ ] Stable ordering is used anywhere pagination or preview limits depend on ordering.

## Accessibility and interaction

- [ ] Feed/gallery controls are keyboard reachable.
- [ ] Fullscreen media viewer has a usable focus/escape path.
- [ ] Mobile swipe navigation does not trap keyboard/focus users.
- [ ] Critical controls have accessible names and visible focus treatment.

## Thursday/manual smoke

Run the existing `THURSDAY_TEST_DAY.md` against the exact candidate build and retain evidence for:

- onboarding/authenticated identity
- garage creation/editing
- parts ledger identity
- feed post creation
- reactions/comments
- image/video upload and retry
- idempotent media completion
- public profile/build/post deep links
- notification/unread behavior

## Stop conditions

Do not mark Phase 0 merge-ready if any of these remain reproducible:

- cross-member read/write leakage
- duplicate post/media creation from retry
- media ownership mismatch accepted after authorization
- nondeterministic pagination/history ordering
- unbounded projection/query behavior on large datasets
- destructive orphan cleanup reachable through normal app/UI paths
- exact-head CI failure

## Exit condition

Phase 0 may leave draft status only when the exact integration head is green and the applicable manual cases above have evidence. A green build alone is not release evidence.