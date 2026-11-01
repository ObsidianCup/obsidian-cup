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
- The "Obsidian Glass" redesign went LIVE on 1 Nov 2026 (merge commit b1bdd48,
  owner said "we go live"). `redesign` is kept level with `main`; new work can go
  on `main` directly or on a preview branch first for bigger changes.

## Design: B "Obsidian Glass" (locked in)

Colours: Glass #0b1012 page, Facet #151c1f panels, Line #2a3337 / #3d484c,
Bone #eeeae3 text, Soft #c9cfd0, Mist #a7b0b2, Ice #d7e9ec main button and
focus, Ice tint rgba(215,233,236,.10), Ice edge rgba(215,233,236,.45).
Fonts: Unbounded 500/600 headings, Figtree 400/500 text, Noto Sans Bengali.
Rules: max 3 weights (none over 600), body 16px, nothing under 12px, 8px grid,
text ≤70ch, sentence case, no all-caps labels, no stats strip, no ghost
buttons, no decorative motion, reduced-motion fallbacks.
Code: `css/glass.css`, `js/components.js` (`injectGlassChrome()` when
`body.theme-glass`). Pages rebuilt in glass: index, volleyball, futsal,
tournaments, about, faq, 404, account, admin, legal.
Not yet glass: experiences, register, rules, fixtures.
Logo: OC monogram (`assets/logo-oc.svg`) for now; the owner will redesign it.
Design canvases (Claude artifacts): redesign
https://claude.ai/artifact/5yGTcp4ErvHb8ZZiA2yrpQ, logo
https://claude.ai/artifact/Jua7GRA96cR3rvqHXe8pko

## Owner's redesign review (1 Nov) — status

Done on `redesign` (1 Nov): contact email on one line, no underline; partner
logos trimmed and larger; About page right column: the OC monogram as outline linework with
faint echo rings (owner dropped the player drawings; `.g-about-mark`, sticky, desktop only); FAQ "Email us or message us on Instagram";
Instagram is now **@obsidian.volleyball** and **@obsidian.futsal** everywhere
(config.js `instagramVolleyballUrl` / `instagramFutsalUrl`); **futsal, not
football**: tournament is "Obsidian Futsal Cup, Season 1" (OFC), page
`pages/futsal.html`, old football URLs redirect in vercel.json. In the
accounts code the sport id stays `football` (database value from 009) but is
shown as "Futsal" with futsal positions (goalkeeper, defender, winger, pivot).
Two Instagram profile pictures (1080×1080, ash-black and maroon) sent to the
owner.

Still to do: legal texts (payment 1.0, participation 1.0) still mention
@obsidiancup / football; change them in the next legal version. The owner's Bangla
for all 248 missing lines is in `js/lang.js` and `js/oc-accounts.js` (1 Nov).
Some glass-page text has no `data-key` yet (season list, partner cards,
buttons), so it stays English in Bangla mode. Bangla received so far is saved
in `docs/translation/bn-received.json` (180 of 464 lines: menu, footer, home,
volleyball, futsal, seasons, about, FAQ, part of accounts; NOT yet applied). The owner is translating
ALL site text (464 lines, file `obsidian-cup-all-website-text.txt`, ids in
`docs/translation/site-text.json`, e.g. [home-14], [acct.authIntro]). When it
comes back: add a data-key to every element by its id, put the Bangla in
lang.js / oc-accounts.js, and check every page in Bangla. Redesign is live (1 Nov). Bangla: apply the owner's full file when it comes back.

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
2. Cloudflare Turnstile: DONE 1 Nov (site key in config.js on main and
   redesign, secret in Supabase). `login-with-code` function redeployed from
   the repo, Verify JWT off: DONE 1 Nov.
   Google account 2-Step Verification: DONE 1 Nov.
   GitHub 2FA: DONE 1 Nov. Gmail as Supabase custom SMTP (app password): DONE 1 Nov.
   Bangla: all 499 site lines received and live (1 Nov).
   Supabase Auth: min password 8, secure email/password change, rate limits
   (emails 100/h, sign-ups+sign-ins 500/5 min, token verifications 100/5 min): DONE 1 Nov.
3. 2FA on GitHub, Supabase, Vercel, Cloudflare and both Google accounts.
4. GitHub secret scanning, push protection, Dependabot.
5. Supabase Auth: min password 8, secure email change, secure password change,
   raise rate limits (emails ~100/h, sign-ins ~300 per 5 min).

## Done 1 Nov (late): all pages in glass, Bangla wiring, audit

- Player stories, Register, Rules, Fixtures rebuilt in glass. Register now
  explains the Season 5 account-based flow (old April Super Cup info removed).
  Player-story quotes hidden until the owner confirms they are real
  (`showPlayerQuotes` in js/config.js).
- New tab/phone icons (OC fills the icon; SVG switches colour for light/dark
  tab bars); icon links carry ?v=2 to beat browser caches.
- Bangla: `scripts/build_bn.py` builds `js/lang-site.js` from
  docs/translation/*.json. lang.js translates [data-key] elements and any
  other element whose English matches the owner's file, keeps links inside
  Bangla, restores English exactly. Run the script after saving new Bangla.
- Audit script (local, Playwright): every page at 1280/375px in EN and BN: no
  script errors, missing files, sideways scroll, broken links. Legal page got
  a proper heading; sitemap lists register and rules.
- Before accounts launch: legal texts still show "[Postal address]" and a
  "[Lawyer to confirm…]" note.

## Player card, photo and gate check (built 1 Nov, on `redesign`)

Migration `010_player_card.sql` (photo bucket + rules, card_token, `new_card_token()`,
`check_player()` organisers-only), account page photo upload + card QR, gate page
`pages/check.html` + `js/page-check.js`, QR lib `js/vendor/qrcode-generator-1.4.4.js`
(MIT), Privacy Notice 1.2 (seed regenerated). Tests: 145 passing.
OWNER STILL HAS TO: run 010 and the legal seed in the SQL Editor (README step 6b).
Owner (and every account) will be asked to agree to Privacy 1.2 on next login.
New account/gate strings need Bangla (in docs/translation/site-text.json, bn empty).

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
