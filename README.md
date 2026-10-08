# AVYAYA — Knowledge That Endures

An offline-ready learning app for students: lessons, quizzes, progress tracking, downloads and badges. Students create an account with a username and password, sign in, and can change their password from Settings → Password & Security.

## Tech
- Static HTML/CSS/vanilla JS app in `public/` (PWA with a service worker)
- Netlify Functions (`netlify/functions/auth.ts`) for account APIs under `/api/auth/*`
- Netlify Database (managed Postgres) with Drizzle ORM (`db/`)
- Passwords hashed with Node's `scrypt`; sessions are random bearer tokens stored in the database

## Run locally
```bash
npm install
netlify dev
```

Database migrations live in `netlify/database/migrations/` and are applied automatically on deploy. After changing `db/schema.ts`, run `npx drizzle-kit generate --name <change_name>`.
