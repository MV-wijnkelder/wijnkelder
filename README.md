# Marcel's Wijnkelder

A clean, mobile-first wine cellar experience built with Next.js, TypeScript, and Tailwind CSS.

## Getting started

```bash
npm install
cp .env.example .env.local
npm run dev
```

Add the OpenAI and Microsoft Graph values from `.env.example` to `.env.local` before using wine recognition and Excel storage. All credentials are only read behind server-side API routes and are never sent to the browser.

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
