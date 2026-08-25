# Marcel's Wijnkelder

A clean, mobile-first wine cellar experience built with Next.js, TypeScript, and Tailwind CSS.

## Getting started

```bash
npm install
cp .env.example .env.local
npm run dev
```

`OPENAI_API_KEY` is the only setting required for wine recognition and is sufficient for a Vercel production deployment. Microsoft Graph settings are optional: add them only to enable **Toevoegen aan wijnkelder**. Excel storage is loaded lazily when that action is used and is not part of the recognition request. All credentials are only read behind server-side API routes and are never sent to the browser.

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
