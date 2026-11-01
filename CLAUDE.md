# Obsidian Cup website — notes for Claude

Read this first in any new session, then `docs/HANDOVER.md`.

## What this is

Official website of Obsidian Cup, a volleyball and futsal tournament
organiser in Dhaka, Bangladesh. Static site (HTML, CSS, vanilla JS) on
Vercel; every push to `main` deploys to https://obsidiancup.vercel.app.
The site owner is not a developer: explain things in plain words, show
previews, and confirm before big or irreversible changes.

## Where things are

- Season settings (registration open, fixtures, rules visibility): `js/config.js`
- Translations EN/BN: `js/lang.js` (Bangla is incomplete; the owner writes Bangla,
  Claude writes English)
- Navbar and footer are injected by `js/components.js`
- Tournament details popups: `TOURNAMENTS` object in `js/main.js`
- All pages except home live in `pages/`
- See `README.md` for structure and season checklist

## Active project: player accounts

Plan and every decision so far: `docs/PLAYER-ACCOUNTS-PLAN.md`.
Legal/consent texts (English source): `docs/legal/legal-texts-en-v1.md`.
Season 5 launch plan (research, emails, history, handbook, setup steps): `docs/SEASON-5-LAUNCH-PLAN.md`.
Keep both files updated as work progresses and decisions change.

## Rules

- This repo is **public**. Never commit secrets, the Supabase `service_role`
  key, or any real player data.
- Enforce permissions in the database (Supabase Row Level Security), never
  only in page code.
- Keep images small (logos under ~420px); compress new assets.
- Avoid decorative motion and scroll-triggered fade-ins; keep text readable.
- Tournament facts (dates, venues, results) must match the owner's Instagram
  @obsidian.volleyball and @obsidian.futsal (before Nov 2026: @obsidiancup); ask when unsure instead of guessing.
- Commit messages end with the co-author line the session provides.
