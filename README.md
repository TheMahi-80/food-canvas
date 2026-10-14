# Food Canvas

Bangla-first ordering website for Food Canvas (Chattogram, near CUET). Customers browse the menu,
build a cart, and send the order request through WhatsApp. There is no order backend or payment.

Project rules and business facts live in `CLAUDE.md`.

## Requirements

- Node.js 20.9+ (developed on Node 24), npm

## Setup

```bash
npm install
cp .env.example .env.local   # then fill in real values
npm run dev                  # http://localhost:3000
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run typecheck` | Generate route types, then `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | Unit tests (Vitest) |

## Environment variables

See `.env.example`. Only placeholders are committed; real values go in `.env.local` (git-ignored)
and in the Vercel project settings. The Supabase service-role key is not used by this app.

## Conventions

- UI copy: `lib/i18n/bn.ts` (single Bangla catalog). Do not hard-code strings in components.
- Theme: `data-theme` on `<html>`, set before paint by `themeInitScript` (`lib/theme.ts`);
  colors are CSS variables in `app/globals.css` (dark + light).
- Business logic (pricing, WhatsApp message, opening hours) lives in `lib/` as tested pure functions.
