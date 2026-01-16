# Repository Guidelines

## Project Structure & Module Organization
- `app/`: Next.js App Router entrypoints, including `app/page.jsx`, `app/layout.jsx`, `app/globals.css`, and API routes under `app/api/*/route.js`.
- `lib/db.js`: Turso/LibSQL client wrapper used by API routes.
- `public/`: static assets (PWA icons).
- `scripts/setup-db.js`: database initialization script.
- Root config: `next.config.js`, `tailwind.config.js`, `postcss.config.js`, `jsconfig.json`.

## Build, Test, and Development Commands
- `npm run dev`: start the Next.js dev server with hot reload.
- `npm run build`: build the production bundle.
- `npm run start`: run the production server after a build.
- `npm run db:setup`: initialize the LibSQL schema; requires DB env vars.

## Coding Style & Naming Conventions
- Language: JavaScript/JSX (React 18, Next.js App Router).
- Formatting: 2-space indentation, semicolons, and single quotes are used consistently in source files.
- File naming: route handlers use `route.js` under `app/api/<name>/`.
- Styling: Tailwind is configured; keep utility classes or CSS variables consistent with the existing theme system in `app/page.jsx`.

## Testing Guidelines
- No automated test framework is present. Validate changes manually by running the app and exercising sync/history flows.
- If you add tests, prefer colocating with features (e.g., `app/**/__tests__`) and document the new command in this file.

## Commit & Pull Request Guidelines
- Existing history uses generic `init` messages; no formal convention is established.
- Use concise, imperative commit messages that mention the area touched (e.g., `sync: handle timestamp conflicts`).
- PRs should include a brief summary, steps to verify, and screenshots or recordings for UI changes.

## Security & Configuration Tips
- Configure secrets in `.env.local` (not committed):
  - `TURSO_DATABASE_URL`
  - `TURSO_AUTH_TOKEN`
  - `NEXT_PUBLIC_APP_PASSWORD`
- Avoid logging secrets and confirm password checks remain server-side.
