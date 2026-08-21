# Shiftpoint Society

**Cars & Coffee that never ends.**

Shiftpoint Society is a community-first drag and street racing platform built around real garages, build logs, video, mechanical knowledge, events, parts/deals, and eventually the integrated drag racing game **Legends Revived**.

## Build order

1. Foundation
2. Core platform
3. Community/social layer
4. Parts & deals
5. Polish, monetization, launch
6. Legends Revived (after the site platform is established)

## Phase 0 goals

- Lock stack and repo conventions
- Establish the garage-industrial design system
- Define the database domain model
- Establish CI quality gates
- Create the application shell and core route architecture
- Keep future shared identity/game integration possible without coupling the site to unfinished game code

## Stack

- Next.js App Router
- React + TypeScript
- PostgreSQL
- Prisma ORM
- Auth.js-compatible auth boundary
- Zod validation
- Vitest
- GitHub Actions

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Quality gates:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Product principle

**Community is the product.** Build logs, videos, deals, knowledge, meets, and later the game are the reasons people gather; identity, reputation, discussion, and shared garages are what make the ecosystem stick.
