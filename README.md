# Marcel's Wijnkelder

A clean, mobile-first wine cellar experience built with Next.js, TypeScript, and Tailwind CSS.

## Getting started

```bash
npm install
cp .env.example .env.local
npm run dev
```

Add your OpenAI API key to `.env.local` before using wine recognition. The key is only read by the server-side API route and is never sent to the browser.

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
