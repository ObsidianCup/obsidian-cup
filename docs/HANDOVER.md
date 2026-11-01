# Obsidian Cup — handover for a new Claude chat

Paste this whole file into a new chat (or say: "read docs/HANDOVER.md in
ObsidianCup/obsidian-cup and continue"). Last updated 1 Nov 2026.

## How to start the new chat

1. Attach the GitHub repo **ObsidianCup/obsidian-cup** (push access) and clone it.
2. Read, in this order: `CLAUDE.md`, this file, `docs/PLAYER-ACCOUNTS-PLAN.md`,
   `supabase/README.md`, `docs/SEASON-5-LAUNCH-PLAN.md`.
3. Check out the `redesign` branch for website work (see "Branches").

## Who and how to work

- Owner: Uriana, founder and head organiser. Not a developer: plain words,
  show previews, confirm before big or irreversible changes.
- **Give ONE task at a time** to the owner, wait for "done", then the next.
- The owner writes Bangla; Claude writes English.
- Security, no compromises: the repo is public. Never put secrets, the Supabase
  secret/service_role key, real player data or personal email addresses in the
  repo or chat. Only the Supabase Project URL and publishable key may appear in
  chat. Passwords and secret keys go straight into Supabase / GitHub settings
  by the owner. No Supabase MCP / direct AI database access. No AI photos of
  players. Permissions live in the database (RLS).
- Tournament facts must match the owner's Instagram; ask when unsure.
- Commit messages end with the co-author line the session provides.

## Branches and deploys

- `main` = live site https://obsidiancup.vercel.app (every push deploys).
- `redesign` = new "Obsidian Glass" design, preview only (Vercel → Deployments
  → newest "redesign" Preview → Visit). Latest commit 22bc63b, main merged in.
  Goes live only when the owner says so: merge `redesign` into `main`.

## Design: B "Obsidian Glass" (locked in)

Colours: Glass #0b1012 page, Facet #151c1f panels, Line #2a3337 / #3d484c,
Bone #eeeae3 text, Soft #c9cfd0, Mist #a7b0b2, Ice #d7e9ec main button and
focus, Ice tint rgba(215,233,236,.10), Ice edge rgba(215,233,236,.45).
Fonts: Unbounded 500/600 headings, Figtree 400/500 text, Noto Sans Bengali.
Rules: max 3 weights (none over 600), body 16px, nothing under 12px, 8px grid,
text ≤70ch, sentence case, no all-caps labels, no stats strip, no ghost
buttons, no decorative motion, reduced-motion fallbacks.
Code: `css/glass.css`, `js/components.js` (`injectGlassChrome()` when
`body.theme-glass`). Pages rebuilt in glass: index, volleyball, football,
tournaments, about, faq, 404, account, admin, legal.
Not yet glass: experiences, register, rules, fixtures.
Logo: OC monogram (`assets/logo-oc.svg`) for now; the owner will redesign it.
Design canvases (Claude artifacts): redesign
https://claude.ai/artifact/5yGTcp4ErvHb8ZZiA2yrpQ, logo
https://claude.ai/artifact/Jua7GRA96cR3rvqHXe8pko

## NEXT: owner's review of the redesign preview (1 Nov) — all still TO DO

1. Contact card email (`obsidiancup.official@gmail.com`) must fit on one
   line and not be underlined (about/faq contact cards).
2. It is **futsal, not football**. Rename everywhere on the site (nav, pages,
   tournament names, popups in `js/main.js` TOURNAMENTS, lang.js, about text).
   Suggest `pages/futsal.html` plus a redirect from `pages/football.html` in
   vercel.json. Confirm the exact tournament name with the owner (OFC S1 →
   "Obsidian Futsal Cup"?).
3. New Instagram accounts: **@obsidian.volleyball** and **@obsidian.futsal**
   (replace @obsidiancup in components.js footer, config.js `instagramUrl`,
   index, faq, about, register, rules, page-fixtures.js, the 5 Supabase email
   templates, scripts/email/templates.mjs, CLAUDE.md). Show both where
   relevant; sport pages link their own account.
4. Partners section: Pheezes, Croketopia and Hi. Talha logos look too small;
   make them larger (consistent visual size).
5. About page: big empty space on the right. Add volleyball silhouettes
   (spike, receive/dig, hit) drawn as thin outline linework, like the homepage
   "OBSIDIAN" outline background. Original drawings, static, no motion.
6. FAQ/questions page: say "Email us or message us on Instagram" (both links).
7. Make two Instagram profile pictures (1080×1080 PNG, circle-safe):
   bold "OBSIDIAN" wordmark (Unbounded, like the homepage hero, with the
   outline rows behind it).
   - Volleyball: grey-ish ash-black background (like the original).
   - Futsal: dark maroon background, same design.
   Send both to the owner.
8. Give the owner the list of text that needs Bangla (English keys in
   `js/lang.js` missing a `bn` value, plus new account strings in
   `js/oc-accounts.js`) as a table to fill in; the owner translates.
Then: owner reviews again → "make it live" → merge `redesign` into `main`.

## Player accounts (Supabase) — state

Done and live in the database (owner ran `supabase/SETUP-STAGE-1.sql`,
migrations 001–009): profiles, consent, legal versions (Privacy 1.1),
chosen player codes OC-INITIALS+digits (005), login with player code via Edge
Function `login-with-code` (deployed, Verify JWT off), Google login, admin
two-step (006), sports profile (007), email sender queue (008), events /
categories / captain codes / teams (009). Owner's account is admin.
Tests: `supabase/tests/rls_test.mjs` (127 passing, PGlite),
`supabase/tests/load_test.mjs` (real Postgres, 1,500 players).
`js/config.js`: `accountsEnabled: false` (accounts not public yet),
`turnstileSiteKey: ""`.

Email safety (owner asked: "no random emails go anywhere"): sender only mails
confirmed accounts, only templates welcome/code_changed, only <7 days old,
EMAIL_MODE test by default (only to EMAIL_TEST_TO), never logs addresses.

## Owner's to-do list (give ONE at a time, after the redesign review)

1. GitHub repo secrets: SUPABASE_URL, SUPABASE_SECRET_KEY, GMAIL_USER,
   GMAIL_APP_PASSWORD, EMAIL_TEST_TO (variable EMAIL_MODE optional, default
   test). Then run the "Send emails" workflow once by hand.
2. Cloudflare Turnstile: send Claude the site key; put the secret in Supabase
   → Attack Protection. Then redeploy the `login-with-code` function (captcha
   version in repo).
3. 2FA on GitHub, Supabase, Vercel, Cloudflare and both Google accounts.
4. GitHub secret scanning, push protection, Dependabot.
5. Supabase Auth: min password 8, secure email change, secure password change,
   raise rate limits (emails ~100/h, sign-ins ~300 per 5 min).

## Questions waiting for the owner

- Are the "Anonymous Player" quotes on the experiences page real?
- FAQ refund / photo-consent wording conflicts with the legal texts: which wins?
- Season 5: dates, categories, squad sizes, fee, slots.
- The owner is under 18: raise contracting in the lawyer review.

## Claude's build list after that

Team pages UI (captain code, join, roster) on top of 009; guardian consent
link; Season 5 registration (per-event consents, ID upload, bKash,
verification queue, reminders, handbook); remaining glass pages; add the
owner's Bangla; update the Claude Docs copy of the legal texts (Privacy 1.1);
lawyer review; launch (`accountsEnabled: true`).
