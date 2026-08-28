# VinoCastello

A clean, mobile-first wine cellar experience built with Next.js, TypeScript, and Tailwind CSS.

## Getting started

```bash
npm install
cp .env.example .env.local
npm run dev
```

`OPENAI_API_KEY` is required for wine recognition. `DATABASE_URL` is required
for cellar storage. Both are read only by server-side routes and are never sent
to the browser. The application creates the `wines` table and its database index
automatically on the first database request.

The recognition route reads `OPENAI_API_KEY` from the running Node.js function,
trims accidental surrounding whitespace, and passes that value directly to the
OpenAI provider. Its runtime diagnostic reports only whether the setting exists
and its raw and trimmed character counts; it never reports the key itself. If
`exists` is `true` while `length` is `0`, Vercel has injected an explicitly empty
environment-variable value—the application cannot reconstruct a secret from
that value. Replace the Production value in **Project Settings → Environment
Variables**, then redeploy Production so the new function receives it. A
nonzero `length` with a zero `trimmedLength` means the configured value contains
whitespace only and must likewise be replaced.

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Create Neon through the Vercel Marketplace

No schema import or migration command is needed. In the Vercel dashboard:

1. Open the application project.
2. Open **Storage**, click **Create Database**, and select **Neon**. If Neon is
   not shown there, click **Marketplace**, search for **Neon Postgres**, and
   click **Add Integration**.
3. Click **Continue**, select the Vercel team and this project, then click
   **Install**.
4. Choose **Create a new Neon database**, enter a database name, select the
   closest region, and click **Create**.
5. Select every Vercel environment in which the database should be available
   (**Production**, **Preview**, and/or **Development**) and click **Connect**.
6. Redeploy the project so the newly injected values are available to the
   server functions.

The Marketplace connection automatically injects `DATABASE_URL` (the pooled
connection string used by this application), `DATABASE_URL_UNPOOLED`, `PGHOST`,
`PGHOST_UNPOOLED`, `PGUSER`, `PGDATABASE`, and `PGPASSWORD` into each selected
environment. You do not need to add any of these by hand on Vercel. For local
development, copy `DATABASE_URL` from the connected project's environment
variables into `.env.local` (or run `vercel env pull`). Never expose it through
a `NEXT_PUBLIC_` variable.

## Scripts

- `npm run dev` starts the development server.
- `npm run build` creates a production build.
- `npm run start` serves the production build.
- `npm run lint` runs ESLint.
- `npm run typecheck` checks the TypeScript project.

## Stack

- Next.js with the App Router
- TypeScript
- Tailwind CSS
