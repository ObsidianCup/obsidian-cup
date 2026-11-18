# Obsidian Cup — handover for a new Claude chat

Last updated 18 Nov 2026, 02:00 (Helsinki time). Attach this file to a new chat,
or say: "read docs/HANDOVER.md in ObsidianCup/obsidian-cup and continue".

## How to start the new chat

1. Attach the GitHub repo **ObsidianCup/obsidian-cup** (push access) and clone it
   with history (`--depth=1000`; a shallow clone breaks merges).
2. Read, in this order: `CLAUDE.md`, `.ux-profile.md`, this file,
   `docs/SECURITY.md`, `supabase/README.md`, `docs/PLAYER-ACCOUNTS-PLAN.md`
   (decisions table), `docs/REGISTRATION-WHAT-IF-AUDIT.md`, `docs/MOVING-HOSTS.md`.
3. Work on `main` (live). Keep `redesign` level with `main` after every push:
   `git push origin main && git push origin main:redesign`.
4. `main` is protected by the "Protect main" ruleset: no force push, no deletion.
   Normal pushes work.

## Where we stopped (18 Nov, 02:00)

1. **Opening photo and "Glimpse of us": LIVE since 18 Nov.** She chose "Cinema":
   full-screen spike photo (original `hero-spike.jpg` / `-tall.jpg`, only 1280 wide,
   no bigger copy exists), darker film grade + grain (`assets/photos/grain.png`),
   fades to black beyond 1440px, photo moves slower than the words on scroll
   (showy mode only, `js/hero.js`); phones: photo shifted so the jumping player is
   further right. "Glimpse of us" = straight 3D cards (no tilt, her wish): front
   card centred, others wait further back, caption under the row (`js/gallery.js`).
   Styles in `css/home.css` (body classes `hd sc`). Samples A to E stay on branch
   `glimpse-sample`. She wants the site **flashy, a big project**: next design
   ideas need a sample first.
2. **Emails: LIVE since 18 Nov** (job run by hand, log said `EMAIL_MODE: live`). Old note: All GitHub secrets and the variable exist (see
   "Emails" below). A test email arrived on 17 Nov ("Sent 1, failed 0"). She
   has **not yet** switched `EMAIL_MODE` from `test` to `live`. Last instruction
   given: GitHub → Settings → Secrets and variables → Actions → Variables →
   `EMAIL_MODE` → pencil → `live`. After that, run the job once by hand and read
   the log (see "Emails").
3. **Migration 015 maybe not run.** She said "i think that one is run". Check:
   Supabase SQL Editor, `select public.delete_unconfirmed_accounts(7);` should
   return a number, not "function does not exist". If missing, give her the raw
   link to `015_signup_name_and_cleanup.sql`. The nightly clean-up needs the
   `pg_cron` extension (Database → Extensions).
4. **Bangla: on hold** (owner, 17 Nov). Do not rewrite it until she says so.
   Background below.

## Who and how to work

- Owner: Uriana, founder and head organiser (an adult). Not a developer: plain
  words, show previews (screenshots), confirm before big or irreversible changes.
- **Give the owner ONE task at a time**, wait for "done", then the next. She
  often writes "don" for "done".
- When she must paste SQL, give **raw GitHub links**:
  `https://raw.githubusercontent.com/ObsidianCup/obsidian-cup/main/supabase/migrations/<file>.sql`
  (she selects all, copies, pastes into Supabase → SQL Editor → New query → Run;
  then `notify pgrst, 'reload schema';`). She once pasted an Edge Function into
  the SQL Editor: say exactly where each thing goes.
- She often says "dont make changes yet" or "show me first": discuss or sample
  first, build only on "go". **Design changes: sample first, then commit.**
- She runs the UX skills (vectorlab-ux-skills, `ux-audit`, frontend-design,
  site-audit). Follow `.ux-profile.md` in all UI.
- Security, no compromises: the repo is public. Never put secrets, the Supabase
  secret key, real player data or personal email addresses in the repo or chat.
  Only the Supabase Project URL and publishable key may appear in chat. Secret
  keys and passwords go straight into Supabase / GitHub settings by her.
  No direct AI database access. No AI photos of players. Permissions live in
  the database (RLS). Screenshots with player details: never copy them anywhere.
  The Notion roster pages hold phone numbers, emails and emergency contacts
  (including minors): never copy them.
- **2FA is already on everywhere** (GitHub, Supabase, her other accounts). Never
  ask again.
- **Do not suggest a lawyer** (she cannot afford one).
- Do not trace or copy other people's drawings or artwork.
- Tournament facts must match her Instagram (@obsidian.volleyball,
  @obsidian.futsal); ask when unsure. No placeholders on the live site.
- Commit messages end with the co-author lines the session provides.

## Site basics

- Static HTML/CSS/vanilla JS. `main` = https://obsidiancup.vercel.app (every
  push deploys). Strict security policy: **no inline scripts**, no inline
  `<style>` blocks; each page has its own `js/page-*.js`.
- Design "Obsidian Glass" (`css/glass.css`, `css/account.css`,
  `js/components.js`). Colours: page #0b1012, panels #151c1f, lines #2a3337 /
  #3d484c, text #eeeae3, soft #c9cfd0, mist #a7b0b2, Ice #d7e9ec (main button,
  focus), **amber #f2b84b only for "Next up" / live status**. Fonts (self-hosted
  in `assets/fonts`, no Google): Unbounded 500/600, Figtree 400/500, Noto Sans
  Bengali. Rules in `.ux-profile.md`: ≤3 weights, body 16px, nothing under
  12px, 8px grid, sentence case, 44px tap areas, buttons never disabled.
- **Motion:** "showy" mode is **live for everyone** since 16 Nov
  (`MOTION_DEFAULT = 'showy'` in `js/motion-boot.js`; `?motion=calm` previews
  the calm site; back to calm = set it to `'calm'`). Files `js/motion.js`,
  `css/motion.css`. Off under reduced motion; account, organiser and legal
  pages stay calm. Test: `scripts/site-tests/motion-checks.js`.
- **Home page now:** full-width opening photo `assets/photos/hero-spike.webp`
  (phone crop `hero-spike-tall.webp`) with the headline on top; "Season 4
  champions" with **Champions / Runners-up** labels; **"Glimpse of us"**
  slideshow (18 photos, dark band, front photo bright, others dimmed, changes
  every 4 s, waits 8 s after a manual move, no pause button by her choice;
  `js/gallery.js`); closing block "Were you there?" (share your experience,
  email us).
- **Volleyball seasons are numbered 1 to 4 in date order** (her numbering, as in
  Notion): S1 Obsidian Volleyball Cup (Jan 2026), S2 All Stars Cup (Feb), S3
  Super Cup (Apr), S4 Obsidian Volleyball Cup (1–4 Jul). Each heading says
  "Season N" with the tournament name underneath. Anchor ids `ovasc-s1`,
  `ovsc-s2` kept so old links work. **Unconfirmed:** whether Instagram counts
  the same way.
- Each season on Volleyball / Past seasons shows champions, runners-up,
  individual awards (MVP, best spiker, setter, receiver; she approved showing
  these names) and team lists (S1–S3; **Season 4 team lists missing**: she has
  to send U19 boys (5) and girls open age (6) team names).
- Team spellings she confirmed: **Silhoutte, Zenith, Dhaka Colonizers.**
- Analytics: Google Analytics **off** (`analyticsEnabled: false`); the public
  site sets no cookies and makes no outside requests. Turning it on needs a
  Privacy notice update and a cookie choice first.
- SEO: home title names the sports and country; `SportsOrganization` JSON-LD;
  `llms.txt`; `/.well-known/security.txt` (renew before 1 Nov 2027).
- Photos: `assets/photos/*.webp`, re-encoded, no camera or location data, max
  1100px tall. Her 21 extra photos from 17 Nov are in the chat history only;
  unused good ones: Season 1 indoor photos, warm-ups.

## Player accounts (Supabase)

Database: migrations **001–016** written. She ran 001–014, 008 (late, 17 Nov)
and 016; **015 uncertain** (see "Where we stopped"). Accounts are **public**
(`accountsEnabled: true`, 16 Nov). Organiser page `/pages/admin.html` (two-step
login) works.

What exists:
- Sign up (asks **full name first**, then email and password; name sent as
  `full_name`), log in (email+password, Google, player code via Edge Function
  `login-with-code`), Turnstile, throwaway email domains blocked
  (`blocked_email_domains` table).
- "Your account is not finished yet" card when name, date of birth or gender is
  missing, with a button to the first empty field.
- Menu says **"My account"** (phones: "Account") when someone is logged in on
  that device (`ocSignedIn` in `js/components.js` reads the saved session).
- Player card shows **"Jersey 23"** (it said "#23" and she took it for an error).
- Profile, private photo (organiser list shows small photos too), consents
  (Terms 1.2, Privacy 1.4, DOB 1.2), delete account (14 days; the email job
  carries out the deletion).
- Events / categories / teams tables exist (009) but there is **no team UI**.

## Emails

- GitHub Action `send-emails.yml` (timer every 15 min; GitHub often runs it
  hours late). Claude can start it and read the log:
  `gh workflow run send-emails.yml -R ObsidianCup/obsidian-cup --ref main`,
  then read the job log with `gh api` (hide addresses with sed).
- GitHub secrets (all set 17 Nov): `SUPABASE_URL`, `SUPABASE_SECRET_KEY` (a new
  key named `github-email-job`), `GMAIL_USER` (obsidiancup.official),
  `GMAIL_APP_PASSWORD` (a new app password "GitHub email job"), `EMAIL_TEST_TO`.
  Variable: `EMAIL_MODE` = **test** (switch to `live` is pending).
- **Do not delete** the older Google app password "Obsidian Cup Website": it is
  in use elsewhere (probably Supabase's sign-up confirmation emails).
- Templates allowed: welcome, code_changed, deletion_requested,
  deletion_cancelled, account_deleted (016 fixed the last three being thrown
  away, and a code change after an expired welcome sending nothing).
- Emails older than 7 days are never sent. Supabase itself sends confirm-email
  and reset-password messages; its built-in sender has low hourly limits (not
  checked: Authentication → Emails → SMTP Settings).

## Security

All of `docs/SECURITY.md` is done: migration 014, Edge Function redeployed,
security headers, vendor fingerprints, Dependabot, CodeQL (0 alerts), secret
scanning + push protection, private vulnerability reporting, "Protect main",
Supabase URL / sign-in / Turnstile settings checked. She keeps "Allow new users
to sign up" on. Two Dependabot PRs (#1 checkout v7.0.1, #2 setup-node v7.1.0)
are open; commit ids match the official tags; merge after emails are live and
re-check the job runs.

## Bangla (on hold)

Source files in `docs/translation/`; after changes run
`python3 scripts/build_bn.py` (regenerates `js/lang-site.js`). Many lines
changed since Nov have **empty Bangla** (English shows). She finds the current
Bangla stiff (word for word, odd loanwords). Research (Prothom Alo sports, bKash,
read with Firecrawl): Bangladeshi sites write everyday English loanwords in
Bangla letters (টুর্নামেন্ট, চ্যাম্পিয়ন, রানার-আপ) and use অনূর্ধ্ব-১৯. Two
styles were offered (A: like Prothom Alo, "আসর" for season; B: mixed with
English letters for names and terms), plus আপনি or তুমি. **No answer; on hold.**

## Hosting

Vercel says the free plan is not allowed for this site. Her plan: Vercel Pro
only in registration and tournament months, or Hostinger; **no decision yet**.
The site moves easily: `docs/MOVING-HOSTS.md`, `site.json`,
`scripts/move_site.py`, `scripts/build_host_files.py`. A new host's address
must also be added in Supabase → Authentication → URL Configuration.

## Decided, not built (wait for "go")

From `docs/PLAYER-ACCOUNTS-PLAN.md`: teams (one team link, any confirmed player
creates a team, captain must be a player, vice-captain required), parent consent,
bKash payment with transaction ID, ID check. Build order: teams → parent consent
→ payment, approve lists, waitlist, reminders. Read
`docs/REGISTRATION-WHAT-IF-AUDIT.md` first.

## Open questions for the owner

- Lusion-style redesign: screenshots of what she likes, then sample approval.
- Switch emails to live.
- Instagram season numbering the same as the site's Season 1–4?
- Super Cup (Season 3) boys runner-up: Zenith? (she is checking)
- Season 4 team lists (U19 boys, girls open age).
- Host decision. Season 5 dates, venue, fee, slots.
- Rules page: slot order and forfeit timing disagree; no futsal rules yet.

## Tests (all passing 17 Nov)

- `supabase/tests/rls_test.mjs`: 218 database checks (PGlite; run
  `node rls_test.mjs <repo path>` from a folder with `@electric-sql/pglite`).
- `scripts/email/sender_test.mjs` (30).
- `scripts/site-tests/` (serve the site on localhost:8765 first):
  `full-audit.js`, `account-flows.js`, `more-checks.js`, `motion-checks.js`,
  `signup-checks.js`. Test browser: `NODE_PATH=/opt/npm-tools/node_modules`.
- `python3 scripts/build_host_files.py --check`, `python3 scripts/check_vendor.py`.
- Not testable from a session: real logins, Google, Turnstile, live sites
  outside the allowlist (lusion.co was blocked).

## Links

- Live site: https://obsidiancup.vercel.app
- Account page: https://obsidiancup.vercel.app/pages/account.html
- Organiser page: https://obsidiancup.vercel.app/pages/admin.html
- GitHub secrets: https://github.com/ObsidianCup/obsidian-cup/settings/secrets/actions
- Notion source for past seasons: "Obsidian Volleyball Database" (Season 1–4
  pages; Notion's "Season 4" page was a copy of Season 3, her own text is the
  source for Season 4 awards).
