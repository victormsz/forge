# ForgeSheet — D&D 5.5 Sheet Maker

ForgeSheet is a mobile-first Next.js 16 app for crafting D&D 5.5 characters, logging spells with rich targeting metadata, and exporting polished PDFs (coming soon). Accounts are powered by NextAuth with Google and Discord OAuth, and every character belongs to a PostgreSQL-backed user record.

## Core Features
- **Auth + Ownership** — NextAuth + Prisma adapter keeps user accounts, sessions, and OAuth identities in sync.
- **Characters & Spells** — Prisma models cover point-buy/random stat generation, spell targeting shapes (single, cone, circle, line, square), and affinity (friendly, hostile, all, environment).
- **Mobile dashboard** — Landing experience is optimized for touch devices first, while still scaling up to desktop.
- **PDF export (beta)** — Server-side PDF generation overlays your data on the legacy 5E JPEG sheet, ready for the table.

## Tech Stack
- Next.js 16 App Router + React 19
- NextAuth v4 with Google & Discord providers
- Prisma 7 + PostgreSQL
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
2. Configure environment variables by copying the sample file:
	```bash
	cp .env.example .env
	```
3. Fill in `.env` with your database connection string, `NEXTAUTH_SECRET`, and OAuth credentials from Google/Discord developer consoles.
4. Run the initial Prisma migration (creates auth + character tables):
	```bash
	npx prisma migrate dev --name init
	```
5. Start the dev server:
	```bash
	npm run dev
	```
6. Visit [http://localhost:3000](http://localhost:3000) and sign in to unlock the builder dashboard.

### PDF Template Setup
1. Drop your sheet artwork (the JPEG from the design team) into `public/templates/dnd-5e-sheet.jpg`.
2. Hit `npm run dev` (or restart if it was already running) so Next.js can serve the static asset.
3. Open the Characters page and click **Export PDF** on any card — this calls `/api/characters/:id/sheet` and streams the generated file.
4. Need a different layout? Duplicate `DEFAULT_CHARACTER_SHEET_TEMPLATE` in `lib/export/character-sheet-template.ts` and tweak the coordinates/asset path.

## Database & Prisma
- Generate the Prisma Client after schema edits:
  ```bash
  npx prisma generate
  ```
- Inspect the database in the Prisma Studio GUI:
  ```bash
  npx prisma studio
  ```

## Environment Variables
| Name | Description |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string.
| `NEXTAUTH_SECRET` | Random 32+ character string used for signing tokens.
| `NEXTAUTH_URL` | Base URL of the deployed app (defaults to `http://localhost:3000`).
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth credentials. |
| `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET` | Discord OAuth credentials. |

## Project Scripts
| Command | Description |
| --- | --- |
| `npm run dev` | Start the local Next.js dev server. |
| `npm run build` | Create a production build. |
| `npm run start` | Serve the production build. |
| `npm run lint` | Run ESLint across the repo. |

## Roadmap
- Character dashboard with point-buy and random roll workflows.
- Custom spell editor (shape, affinity, damage, save DCs, etc.).
- PDF export pipeline using server-rendered templates.
- Party sharing and invite links.

## Contributing
Issues and PRs are welcome! Please run `npm run lint` before submitting and clearly describe any schema changes so migrations stay in sync with the deployed database.
