# ForgeSheet — D&D 5.5 Sheet Maker

ForgeSheet is a mobile-first Next.js 16 App Router app for crafting D&D 5.5 characters, logging spells with rich targeting metadata, running party chat, and exporting polished PDFs. Accounts run through NextAuth (Google, Discord, or email + verification) with a Prisma/PostgreSQL backend, and guests can trial a limited forge.

## Core Features
- **Auth, email, and guest** — Google/Discord OAuth, email/password with verification links, and a seven-day guest slot (1 hero, no leveling/items/spells).
- **Characters, spells, and items** — Point-buy or random builds, spell targeting shapes/affinities, inventory with equipped slots, and class-aware level-ups powered by `lib/characters/leveling/level-requirements.ts`.
- **Parties & chat** — DMs can create parties (plan-gated limits), invite by email token, and keep a shared chat with item snapshots and attachments.
- **PDF export (implemented)** — `/api/characters/:id/sheet` renders onto `public/templates/dnd-5.5e-sheet.pdf`, including a spellbook second page. A reference grid is drawn by default in `lib/export/generate-character-sheet.ts` to help align coordinates.
- **Mobile-first dashboard** — Landing, dashboard, and roster views are tuned for touch while scaling to desktop.

## Tech Stack
- Next.js 16 App Router + React 19
- NextAuth v4 (Google, Discord, credentials)
- Prisma 7 + PostgreSQL (datasource URL read via `prisma.config.ts`)
- Tailwind CSS v4 (via `@tailwindcss/postcss`)
- TypeScript + ESLint 9

## Prerequisites
- Node.js 18.18+ or 20+
- npm (included with Node)
- PostgreSQL database (local Docker instance is fine)

## Setup
1. Install dependencies:
	```bash
	npm install
	```
2. Create a `.env` file (there is no sample checked in) and fill in the variables below.
3. Run the initial Prisma migration (creates auth, character, and party tables):
	```bash
	npx prisma migrate dev --name init
	```
4. Start the dev server:
	```bash
	npm run dev
	```
5. Visit [http://localhost:3000](http://localhost:3000). Log in with OAuth/email or continue as a guest to open the builder/dashboard.

### Environment Variables
| Name | Description |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string (used by Prisma via `prisma.config.ts`). |
| `NEXTAUTH_SECRET` | Random 32+ character string used for signing tokens. |
| `NEXTAUTH_URL` | Base URL of the deployed app; also used as a fallback for email/invite links. |
| `NEXT_PUBLIC_APP_URL` | Public base URL used in verification and party invite links (defaults to `http://localhost:3000` if unset). |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth credentials. |
| `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET` | Discord OAuth credentials. |

*Email verification and party invite links are logged to the console in development; wire them to a mailer in production.*

### PDF Template Setup
1. Place your sheet artwork PDF at `public/templates/dnd-5.5e-sheet.pdf` (vector PDFs stay crisp).
2. Restart `npm run dev` if it was running so the asset is picked up.
3. Open **Characters** and click **Export PDF** on any card — this streams the generated file from `/api/characters/:id/sheet`.
4. To tweak layout/coordinates or swap assets, adjust `DEFAULT_CHARACTER_SHEET_TEMPLATE` in `lib/export/character-sheet-template.ts`. Disable the reference grid in `lib/export/generate-character-sheet.ts` after alignment.

## Database & Prisma
- Generate the Prisma Client after schema edits:
  ```bash
  npx prisma generate
  ```
- Inspect the database in Prisma Studio:
  ```bash
  npx prisma studio
  ```

## Project Scripts
| Command | Description |
| --- | --- |
| `npm run dev` | Start the local Next.js dev server. |
| `npm run build` | Create a production build. |
| `npm run start` | Serve the production build. |
| `npm run lint` | Run ESLint across the repo. |

## Roadmap
- Ship production email delivery for verification and party invites (currently console in dev).
- Polish PDF export defaults (grid off by default, richer templates).
- Expand party collaboration (more attachment types, invite management UX).

## Contributing
Issues and PRs are welcome! Please run `npm run lint` before submitting and clearly describe any schema changes so migrations stay in sync with the deployed database.
