# Obsidian Cup — handover for a new Claude chat

Last updated 2 Nov 2026, 14:30 (Helsinki time). Attach this file to a new chat,
or say: "read docs/HANDOVER.md in ObsidianCup/obsidian-cup and continue".

## How to start the new chat

1. Attach the GitHub repo **ObsidianCup/obsidian-cup** (push access) and clone it
   with enough history (`--depth=1000`, a shallow clone breaks merges).
2. Read, in this order: `CLAUDE.md`, this file, `docs/PLAYER-ACCOUNTS-PLAN.md`,
   `supabase/README.md`, `docs/SEASON-5-LAUNCH-PLAN.md`.
3. Work on `main` (live). Keep `redesign` level with `main` after every push.

## Who and how to work

- Owner: Uriana, founder and head organiser (an adult; her test account used
  an under-18 birth date only to see the minors' screens). Not a developer: plain
  words, show previews (screenshots), confirm before big or irreversible changes.
- **Give the owner ONE task at a time**, wait for "done", then the next.
- When the owner must paste SQL, give **raw GitHub links**, e.g.
  `https://raw.githubusercontent.com/ObsidianCup/obsidian-cup/main/supabase/migrations/<file>.sql`
  (she selects all, copies, pastes into Supabase SQL Editor → New query → Run).
- The owner writes Bangla; Claude writes English. Claude's Bangla drafts go in
  `docs/translation/bn-claude-drafts.json` for her to check.
- The owner often sends several changes at once ("dont make changes now, ill
  give u all at once"): wait until she says go.
- Security, no compromises: the repo is public. Never put secrets, the Supabase
  secret/service_role key, real player data or personal email addresses in the
  repo or chat. Only the Supabase Project URL and publishable key may appear in
  chat. Passwords and secret keys go straight into Supabase / GitHub settings
  by the owner. No Supabase MCP / direct AI database access. No AI photos of
  players. Permissions live in the database (RLS), never only in page code.
- Do not trace or copy other people's drawings or artwork (declined before; the
  owner chose the OC logo art instead).
- Tournament facts must match the owner's Instagram (@obsidian.volleyball,
  @obsidian.futsal); ask when unsure.
- Commit messages end with the co-author lines the session provides.

## Site basics

- Static HTML/CSS/vanilla JS on Vercel. `main` = https://obsidiancup.vercel.app
  (every push deploys). Strict security policy: **no inline scripts**, each page
  has its own `js/page-*.js`.
- Design "Obsidian Glass" is live on every page (`css/glass.css`,
  `js/components.js`). Colours: page #0b1012, panels #151c1f, lines #2a3337 /
  #3d484c, text #eeeae3, soft #c9cfd0, mist #a7b0b2, Ice #d7e9ec (main button,
  focus). Fonts: Unbounded 500/600, Figtree 400/500, Noto Sans Bengali.
  Rules: max 3 weights (none over 600), body 16px, nothing under 12px, 8px
  grid, text ≤70ch, sentence case, no all-caps, no decorative motion,
  reduced-motion fallbacks.
- Sports: **Volleyball** and **Futsal** (never "football" in wording; the
  database id stays `football`). Futsal tournament: "Obsidian Futsal Cup,
  Season 1" (OFC), `pages/futsal.html`.
- Taglines are nationwide and sport-neutral ("a stage for players from all
  over Bangladesh"); no "in Dhaka", no "run by players".
- Seasons are shown as separate cards on the tournaments page.

## Bangla

All site text has Bangla and is live. Source files in `docs/translation/`:
`site-text.json` (every id → English), `bn-received.json` (Bangla by id),
`bn-claude-drafts.json` (Claude drafts waiting for the owner's check).
After changing them run `python3 scripts/build_bn.py` → regenerates
`js/lang-site.js`. New account strings: English in `js/oc-accounts.js`
(`OC_TEXT.en`), add the id `acct.<key>` to site-text.json and the Bangla to
bn-received.json (+ drafts file if Claude wrote it), then run the script.

## Player accounts (Supabase) — state on 2 Nov

All migrations **001–012 are live** in the database, plus the legal seed
(owner confirmed "done" 2 Nov 14:27). Accounts are **not public yet**
(`js/config.js` `accountsEnabled: false`); the page works by direct link
`/pages/account.html` for the private test run. Organiser page:
`/pages/admin.html` (needs two-step login).

What exists:
- Sign up / log in (email+password, Google, player code via Edge Function
  `login-with-code`), Turnstile captcha, Gmail SMTP sender, admin two-step.
- Consent to legal documents with versions: Terms 1.1, Privacy 1.3, DOB
  declaration 1.2 (`OC_LEGAL` in js/oc-accounts.js). Legal source:
  `docs/legal/legal-texts-en-v1.md` → `python3 scripts/split_legal.py` →
  `legal/en/*.md` + `supabase/seed/legal_documents.sql`. Legal page redesigned
  (doc tabs, contents list, tables as cards on phones). No postal address.
  The legal page lists only Terms, Privacy and Media consent. Tournament documents
  (event agreement, payment, guardian, captain) open Terms if asked for by link;
  show them inside registration, captain ones to captains only (owner, 2 Nov).
- Before the account opens the player chooses sports (volleyball / futsal);
  they can add the other later, cannot remove all.
- Profile form: basics, contact, emergency contact, then a general sports part
  (height, weight, **level chosen once then locked**, year started, jersey,
  Bangladeshi shirt sizes with chest), then a **Volleyball group** (positions,
  playing hand, reach, jump) and a **Futsal group** (positions: goalkeeper,
  defender, winger, pivot; stronger foot). Only the groups for the player's
  sports show. Older saved futsal positions (midfielder, forward) still show
  ticked until unticked. DOB can be changed twice (limit enforced, not shown).
- Private profile photo (bucket `avatars`, private).
- Player card: photo, name, code, jersey, DOB, ID-check badge, current
  tournament team, general stats, then per-sport positions and stats.
  **Live card** (moving logo, today's colour ring, ticking clock) shows only
  while the organiser switch is on (`site_settings.live_card`, default off).
  The QR code and gate page were removed (gate staff already have names).
- Organiser page: player list, search, CSV, full backup, level dropdown per
  player (`admin_set_level`), player look-up (photo, teams), **Live player card
  on/off switch** with today's colour.
- Checklist on the account home with an OK button once everything is done.
- Events / categories / captain codes / teams tables exist (009) but there is
  no team UI yet.

Tests: `supabase/tests/rls_test.mjs` (165 passing, PGlite; run with
`node rls_test.mjs <repo path>` from a folder with `@electric-sql/pglite`
installed). Load test: `supabase/tests/load_test.mjs`.
Setup steps for a fresh database: `supabase/README.md` (steps 1–7, 6b–6d).

## Open questions for the owner

- Should "Midfielder" be a normal futsal position for everyone? (Now only kept
  for players who saved it before.)
- Check Claude's Bangla drafts (`bn-claude-drafts.json`), latest: level lock,
  live switch, sports checklist line.
- Are the "Anonymous Player" quotes on the experiences page real? (hidden
  until `showPlayerQuotes` is true)
- FAQ refund / photo-consent wording vs the legal texts: which wins?
- The "(new)" labels were removed
  from Payment policy 1.1 at the owner's request, but she has not confirmed those
  rules yet.
- Season 5: dates, categories, squad sizes, fee, slots.
- Copy review suggestions waiting for a yes:
  https://claude.ai/artifact/5uxY5nRkXihEX2ugvV3Uid
- Confirm these are done (not recorded): GitHub repo secrets for the email
  workflow (SUPABASE_URL, SUPABASE_SECRET_KEY, GMAIL_USER, GMAIL_APP_PASSWORD,
  EMAIL_TEST_TO) and GitHub secret scanning / push protection / Dependabot.

## Hosting (2 Nov)

Vercel support replied in writing: the site counts as organisational and commercial use, needs Pro, off-site or hidden payment does not change that, and there are no discounts. Plan: buy a domain, test a copy on Cloudflare with Vercel left running, switch only after everything passes. Waiting for the owner to buy the domain. Check Cloudflare's own terms first (only a third-party review was read).

Update 13 Nov: no host chosen yet. Options on the table: Vercel Pro only in registration months ($20/month, agreed 9 Nov), or Hostinger Premium (about $96 upfront for 4 years; figures from review sites). The owner asked to make the site easy to move meanwhile: done, see docs/MOVING-HOSTS.md (site.json, scripts/move_site.py, scripts/build_host_files.py, _headers/_redirects/.htaccess made from vercel.json). Registration features still go behind one on/off setting.

## Stage 1 (9 Nov): built, waiting for the owner's Supabase step

- Delete account: card at the bottom of the account page; type DELETE; must have
  logged in within 15 minutes (token "amr" time); 14 days, logging in cancels;
  blocked for captains of active teams and players on a team after the deadline
  (event status 'closed'); teams in open events are left. Migration 013, emails
  in scripts/email/templates.mjs, deletion run by scripts/email/send-emails.mjs.
  The live deletion (Auth admin API with the new secret key) is untested.
- "Log in or sign up" menu label ("Log in" on phones); sign-up with a used email
  now says so and switches to Log in.
- Rules page: captain (player, under-18 with parent consent, vice-captain, coach)
  and liberos. The 013 captain-18 migration was dropped (never ran live).
- Terms 1.2 and Privacy 1.4 (deleting, captains); everyone agrees again.
- Owner must run: 013_delete_account.sql, then seed/legal_documents.sql
  (supabase/README.md step 6e). Until then the live account page shows the new
  agreement but cannot save it, so do this before anyone tests.
- Bangla out of date (owner translates): rules-05, rules-07, acct.errExists,
  acct.laterGuardianWhy; new acct.delete* keys have no Bangla.

## Redesign (9 Nov): built and live

Canvas: https://claude.ai/artifact/FHR5zYpRnzXft3ZqKYeXJy. Built: home (hero with amber "Next up" card, Volleyball/Futsal tabs in js/page-home.js, framed seasons list, sign-up steps shown only when accounts are on), phone menu as a slide-over (tooltips, Escape, focus kept inside), page fade and hover transitions (all off for reduced motion), account page (player card beside the profile on wide screens, delete as a native dialog naming the account, buttons never disabled: ocBusy/ocIsBusy), inner pages' headings and season cards. New English on the home page has no Bangla yet (site-text.json home-NN entries). Live site follows the owner's Instagram facts; no placeholders.

## Self-test pass (13 Nov)

Tests now live in the repo: `scripts/site-tests/` (browser tests with a stand-in database, see its README), `scripts/email/sender_test.mjs`, `supabase/tests/rls_test.mjs` (184). All pass. Bugs found and fixed: (1) in Bangla the page translator wrote text over labels and buttons that held tick boxes or icons, deleting them, so Bangla users could not choose a sport (js/lang.js now skips elements holding controls); (2) log in hung for ever if the Turnstile script was blocked (now a clear message); (3) home page account sections never appeared with accountsEnabled on (`window.SITE_CONFIG` is undefined for a const); (4) header was see-through over scrolling text; (5) logo link tap area under 44px. Not testable here: real Supabase login, Google, Turnstile, real emails, the live scheduled deletion, fonts from Google.

## Next steps (suggested order)

1. Private test run of accounts with a few friends on the live site; collect
   the owner's change list and do it in one batch.
2. Team decisions, parent consent and delete account are agreed (2 Nov, see the
   decisions table in PLAYER-ACCOUNTS-PLAN.md) but NOT built; wait for the owner's
   "go". Do not suggest a lawyer: she cannot afford one. Season 5 team registration:
   team pages on top of 009, guardian consent, per-event consents, ID upload, bKash payment,
   verification queue, reminders, handbook (see SEASON-5-LAUNCH-PLAN.md).
3. Legal: participation 1.0 still mentions football; fix in the next version.
4. Public launch: `accountsEnabled: true` in js/config.js.

## Handy tools Claude used (rebuild in a new session if needed)

- Local preview: `python3 -m http.server 8765` in the repo, Playwright
  screenshots at 1280 and 375/390px, EN and BN.
- Account page previews without a real login: route `supabase-js` to a small
  stand-in script that returns a fake profile.
- Site audit: every page EN/BN at 1280/375 for script errors, missing files,
  sideways scroll and broken links. Only known item: Fixtures is left out of
  the sitemap on purpose.

## Audit and Bangla notes (2 Nov)

What-if audit of the registration plan, with clashes against the current database: `docs/REGISTRATION-WHAT-IF-AUDIT.md`. Read it before building.
Full audit: `docs/WEBSITE-AUDIT-2026-11.md`. Bangla style notes for the owner's
manual translation: `docs/translation/BANGLA-STYLE-NOTES.md`. Translation work is
on hold: the owner does it by hand.

## Links

- Live site: https://obsidiancup.vercel.app
- Account page: https://obsidiancup.vercel.app/pages/account.html
- Organiser page: https://obsidiancup.vercel.app/pages/admin.html
- Design canvases: https://claude.ai/artifact/5yGTcp4ErvHb8ZZiA2yrpQ (redesign),
  https://claude.ai/artifact/Jua7GRA96cR3rvqHXe8pko (logo)
