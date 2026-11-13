# Obsidian Cup — handover for a new Claude chat

Last updated 13 Nov 2026, 22:45 (Helsinki time). Attach this file to a new chat,
or say: "read docs/HANDOVER.md in ObsidianCup/obsidian-cup and continue".

## How to start the new chat

1. Attach the GitHub repo **ObsidianCup/obsidian-cup** (push access) and clone it
   with enough history (`--depth=1000`, a shallow clone breaks merges).
2. Read, in this order: `CLAUDE.md`, this file, `docs/PLAYER-ACCOUNTS-PLAN.md`
   (decisions table), `docs/REGISTRATION-WHAT-IF-AUDIT.md`, `docs/MOVING-HOSTS.md`,
   `supabase/README.md`, `docs/SEASON-5-LAUNCH-PLAN.md`.
3. Work on `main` (live). Keep `redesign` level with `main` after every push
   (`git push origin main && git push origin main:redesign`).

## Who and how to work

- Owner: Uriana, founder and head organiser (an adult; her test account used
  an under-18 birth date only to see the minors' screens). Not a developer: plain
  words, show previews (screenshots), confirm before big or irreversible changes.
- **Give the owner ONE task at a time**, wait for "done", then the next.
- When the owner must paste SQL, give **raw GitHub links**, e.g.
  `https://raw.githubusercontent.com/ObsidianCup/obsidian-cup/main/supabase/migrations/<file>.sql`
  (she selects all, copies, pastes into Supabase SQL Editor → New query → Run).
- The owner writes Bangla; Claude writes English. **Translation is on hold: she
  does it by hand.** Do not write Bangla for her unless asked.
- She often says "dont make changes yet": discuss first, build only on "go" / "build".
- She likes to run the UX skills (vectorlab-ux-skills: ux-audit, anti-slop,
  typography, colour-palette, keyboard, loaders, forms, defaults, icon-buttons,
  page-patterns, surfaces, transitions). Follow their rules in new UI.
- Security, no compromises: the repo is public. Never put secrets, the Supabase
  secret/service_role key, real player data or personal email addresses in the
  repo or chat. Only the Supabase Project URL and publishable key may appear in
  chat. Passwords and secret keys go straight into Supabase / GitHub settings
  by the owner. No Supabase MCP / direct AI database access. No AI photos of
  players. Permissions live in the database (RLS), never only in page code.
  If she sends a screenshot with player details, do not copy them anywhere.
- **Do not suggest a lawyer** (she cannot afford one; said 2 Nov).
- Do not trace or copy other people's drawings or artwork.
- Tournament facts must match the owner's Instagram (@obsidian.volleyball,
  @obsidian.futsal); ask when unsure. No placeholders on the live site.
- Commit messages end with the co-author lines the session provides.

## Site basics

- Static HTML/CSS/vanilla JS. `main` = https://obsidiancup.vercel.app (every
  push deploys). Strict security policy: **no inline scripts**, each page has
  its own `js/page-*.js`.
- Design: "Obsidian Glass", refreshed 9 Nov (`css/glass.css`, `css/account.css`,
  `js/components.js`). Colours: page #0b1012, panels #151c1f, lines #2a3337 /
  #3d484c, text #eeeae3, soft #c9cfd0, mist #a7b0b2, Ice #d7e9ec (main button,
  focus), **amber #f2b84b only for "Next up" / live status**. Fonts: Unbounded
  500/600, Figtree 400/500, Noto Sans Bengali. Rules: max 3 weights (none over
  600), body 16px, secondary 14px, nothing under 12px, 8px grid, sentence case,
  no all-caps, 44px tap areas, buttons never disabled (`ocBusy` / `ocIsBusy`),
  icon-only buttons need a tooltip, destructive actions use a dialog that names
  the thing. **Transitions are wanted** (owner, 9 Nov): short, tied to an action,
  plus a 200ms page fade; all off for reduced motion. No scroll-triggered effects.
- Story text on laptops: heading left, text right (about 75 characters a line).
- Sports: **Volleyball** and **Futsal** (never "football" in wording; the
  database id stays `football`).
- Taglines are nationwide: "Bangladesh's stage for volleyball and futsal",
  "A stage for players from every corner of Bangladesh". No "the leading".
- Share image: `assets/og-image-v2.jpg` (rename again if it changes, apps cache it).

## Bangla

Source files in `docs/translation/`: `site-text.json` (every id → English),
`bn-received.json` (Bangla by id), `bn-claude-drafts.json`. After changing them
run `python3 scripts/build_bn.py` → regenerates `js/lang-site.js`. New page text
is matched by its English wording; add it to site-text.json with `"bn": ""`.
New account strings: English in `js/oc-accounts.js` (`OC_TEXT.en`) + id
`acct.<key>` in site-text.json. Many strings added since 2 Nov have no Bangla
(home page, delete account, new errors); a few changed English lines have stale
Bangla (rules-05, rules-07, rules-09, acct.errExists, acct.laterGuardianWhy).
`js/lang.js` must never write text into an element that holds a control or icon
(fixed 13 Nov; it deleted the sport tick boxes in Bangla).

## Hosting

- Vercel support said in writing (2 Nov): the site is organisational/commercial,
  the free plan is not allowed, hiding or moving payment does not change that.
- Owner's current plan (9 Nov): **Vercel Pro ($20/month) only during registration
  and tournament months**, free plan the rest of the year with stats and rosters
  only. She also asked about Hostinger (13 Nov: about $96 upfront for 4 years,
  figures from review sites); **no decision yet**.
- The site is ready to move at any time: `docs/MOVING-HOSTS.md`, `site.json`,
  `scripts/move_site.py`, `scripts/build_host_files.py` (`_headers`, `_redirects`,
  `.htaccess` made from `vercel.json`). The other hosts' files are untested on a
  real host.
- Registration features must sit behind one on/off setting in `js/config.js`.

## Player accounts (Supabase)

Live in the database: migrations **001–013** and the legal seed (owner ran 013
and the seed on 9 Nov). Accounts are **not public** (`accountsEnabled: false`);
`/pages/account.html` works by direct link. Organiser page `/pages/admin.html`
(two-step login) works live (seen 13 Nov).

What exists:
- Sign up / log in (email+password, Google, player code via Edge Function
  `login-with-code`), Turnstile, Gmail sender (GitHub Action every 15 min),
  admin two-step.
- Consents: Terms **1.2**, Privacy **1.4**, DOB declaration 1.2 (`OC_LEGAL`).
  Legal source `docs/legal/legal-texts-en-v1.md` → `python3 scripts/split_legal.py`.
  The legal page lists only Terms, Privacy, Media consent. Tournament documents
  (participation 1.0, payment 1.1, guardian, captain) show only inside
  registration when built; captain ones to captains only.
- Sports chooser, profile form (auto-save), private photo, player card, live card
  switch, checklist, organiser list / CSV / backup / level / look-up.
- **Delete account** (9 Nov): dialog naming the account, type DELETE, login
  within 15 minutes (`amr` time in the token), 14 days, logging in cancels,
  blocked for captains of active teams and members after the deadline. The
  request works live (owner saw the date, 13 Nov). Final deletion is done by
  `scripts/email/send-emails.mjs`; **not yet seen working live**.
- Events / categories / teams tables exist (009) but there is no team UI.

## Open problems (13 Nov)

1. **The "account will be deleted" email did not arrive.** Not yet diagnosed.
   Likely causes, in order: `EMAIL_MODE` is still `test` and the address is not
   in `EMAIL_TEST_TO`; the GitHub secrets are missing; the scheduled workflow
   is disabled or late. Ask her to open GitHub → Actions → "Send emails" →
   latest run and read the log line (it says which case). One step at a time.
2. **An unknown account** (a throwaway-email address, joined 10 Nov) is in the
   player list. Claude did not create it and has no database access. The account
   page is reachable by anyone with the link (the repo is public). Suggest she
   deletes it in Supabase → Authentication → Users, and consider blocking
   throwaway email domains before launch.
3. The organiser account itself shows in the player list with no profile; fine,
   but could be hidden from the list.

## Decided, not built (wait for "go" / "start teams")

All in the decisions table of `docs/PLAYER-ACCOUNTS-PLAN.md`:
- **Teams:** no captain codes; any confirmed player creates a team; one team link;
  eligible players join directly; captain can remove; captain must be a player
  (under-18 captain allowed with parent consent); vice-captain required; optional
  non-playing coach; captains see age eligibility, never date of birth; leave /
  remove freely until the deadline, then organisers only.
- **Parent consent:** parent email + phone (not the player's), page with tick
  boxes and typed name; siblings may share an email; flag 3+ children or
  mismatches; paper form as backup; spam-folder note wherever an email is sent.
- **Payment:** bKash to one dedicated number, captain enters the transaction ID,
  also allowed from a parent's number; no event credit; refunds only.
- **ID:** any government or institution ID card showing photo and date of birth.
- Build order: teams → parent consent → payment, approve lists, waitlist, reminders.
- Read `docs/REGISTRATION-WHAT-IF-AUDIT.md` first: it lists clashes with the
  current database (one team per event, slot taken on create, lock on submit,
  emails only to accounts, no payment/waitlist/ban tables) and her unanswered
  questions (player in both U19 and open age; birth certificate + photo ID for
  under-18s; helpers; slot order by transaction time; waitlist pays when offered).

## Open questions for the owner

- Host: Vercel Pro for registration months, or Hostinger?
- Rules page: slot order ("first come" vs "order of verified payment") and
  forfeit timing disagree between pages; no futsal rules yet.
- Refund and payment rules that used to say "(new)" need her yes (Payment 1.1).
- Season 5: dates, venue, categories, squad sizes, fee, slots.
- "Silhoutte" and "Team 01": real team spellings?
- "Midfielder" as a normal futsal position? "Anonymous Player" quotes real?
- Legal page lines are about 95 characters wide (her choice to fill the page).

## Tests (all passing 13 Nov)

- `supabase/tests/rls_test.mjs`: 184 database rule checks (PGlite; run with
  `node rls_test.mjs <repo path>` from a folder with `@electric-sql/pglite`).
- `scripts/email/sender_test.mjs`: email sender and scheduled deletion (18).
- `scripts/site-tests/` (README inside): every page EN/BN at four widths and all
  links; account flows with a stand-in database (51); accounts-on, reduced
  motion, keyboard, menu.
- `python3 scripts/build_host_files.py --check`.
- Not testable from a Claude session: real Supabase login, Google, Turnstile,
  real emails, live deletion, Google Fonts (previews use stand-in fonts).

## Other documents

- `docs/WEBSITE-AUDIT-2026-11.md`: content, SEO and accessibility findings
  (Bangla not indexable, no structured data, weak home title).
- `docs/translation/BANGLA-STYLE-NOTES.md`: style notes for her translation.
- `docs/SEASON-5-LAUNCH-PLAN.md`: launch research and handbook plan.

## Links

- Live site: https://obsidiancup.vercel.app
- Account page: https://obsidiancup.vercel.app/pages/account.html
- Organiser page: https://obsidiancup.vercel.app/pages/admin.html
- Redesign canvas (Nov 2026): https://claude.ai/artifact/FHR5zYpRnzXft3ZqKYeXJy
- Older canvases: https://claude.ai/artifact/5yGTcp4ErvHb8ZZiA2yrpQ (redesign),
  https://claude.ai/artifact/Jua7GRA96cR3rvqHXe8pko (logo)
