# Player Accounts System — Plan and Decisions

Last updated: 31 Oct 2026. Status: **Stage 1 built (accounts, consents, autosaving profile, player codes, admin list). Waiting for the SQL to be run in Supabase and testing. Target: Season 5 volleyball launch.**

Stage 1 files: `supabase/` (SQL, tests, README), `pages/account.html`, `pages/admin.html`, `pages/legal.html`, `js/oc-accounts.js`, `js/account.js`, `js/admin.js`, `css/account.css`, `legal/en/*.md`. Supabase project `mpxcoipozjnqkjwtondm` (Singapore). Accounts stay hidden from the menu until `accountsEnabled: true` in `js/config.js`.

Full launch plan (legal setup, research, emails, history, handbook, setup steps): [`SEASON-5-LAUNCH-PLAN.md`](SEASON-5-LAUNCH-PLAN.md)

This file records every decision made so far, so work can continue from any
chat or account. Update it whenever a decision changes.

## Goal

Replace Fillout registration forms with player accounts on the Obsidian Cup
website. Players keep a profile, captains build teams, teams register for
events, and the organiser verifies everything from one admin page.

## Decisions

| Topic | Decision |
| --- | --- |
| Who has accounts | Every player has their own account |
| Login | Google sign-in (live since 1 Nov 2026; Google Cloud project `obsidian-cup` on obsidiancup.official, app published) or email + password (both free). No phone/SMS login. Passwords are never emailed |
| Player code | Every account gets a permanent code from the player's initials + 3 digits, e.g. Uriana Faiha → `OC-UF427` (digits skip 0 and 1), emailed in the welcome email; used for check-in QR, player card, certificates, public page `/player/<code>` |
| Custom codes | Organisers can reserve a code for an email (`reserved_player_codes`) or change any code from the SQL Editor. Founder's code: OC-UF023 |
| Choosing a code | After the automatic code, a player can pick another, Instagram-style: suggestions (777, 123, 2026, …) or their own 3–4 digits, always `OC-` + their initials, live "available/taken" check. At most 2 changes. A code someone gives up is retired forever (`retired_player_codes`). If the welcome email already went out, a `code_changed` email is queued (005) |
| Login with code | Players can log in with player code + password instead of email. The Edge Function `supabase/functions/login-with-code` looks up the email on the server, so a code never reveals an email. Max 5 failed tries per code and 20 per address in 15 minutes (005). Google login and email login stay |
| Date of birth | Must match the player's ID (checked at tournaments). First entry is free; a player can change it at most 2 times, then only an organiser can. Saved on leaving the field, after a confirmation |
| Login links | `flowType: 'implicit'` so confirmation and reset links work on any device; expired links show a clear message |
| Passwords | Show/hide button on every password field; sign-up and reset ask for the password twice |
| Phone numbers | Country picker (Bangladesh first, then Finland, India, then all countries), validated per country with libphonenumber-js, stored as international numbers like +8801711000000 |
| Load | Load-tested with 1,000 and 3,000 simultaneous players on real Postgres; player codes for the same initials are handed out one at a time (004) |
| Organiser (legal) | Obsidian Cup is not a legal entity yet. Legal texts name **Uriana Faiha, founder and head organiser, trading as Obsidian Cup**. Recommended next step: sole proprietorship trade licence; later an OPC |
| Saving | Profile forms autosave as the player types |
| Teams | Captain creates a team with a **captain code**; players join with a **team join code** and the captain approves. No searching other players |
| Captain codes | Issued by the organiser from the admin page. One code = one team in one event. Single use, expires, tied to the first account that uses it |
| Admin | Only the organiser (obsidiancup.official@gmail.com) for now. Admin powers need two-step login (authenticator app, `aal2` checked in the database, 006) |
| Site security | Strict security headers incl. Content-Security-Policy (no inline scripts allowed; page scripts live in `js/page-*.js`, analytics in `js/analytics.js`); Cloudflare Turnstile on sign-up, login, code login and reset; full JSON backup button on the admin page (store only in the organiser Drive) |
| Consent | Each player agrees for themselves: at sign-up (terms, privacy, real DOB) and per event (participation agreement, media part A, fitness). Media part B (individual feature) is optional |
| Ages | 13+ can create an account without a guardian. Under 13: guardian consent before the account can be used. Under 18: guardian consent needed only for tournaments (joining a team, ID upload, playing). For 13–17 accounts, collect only basic profile data until the guardian consents (lawyer to confirm this fits the PDPO's rules on children's data) |
| Guardian consent | Guardian completes consent themselves via a private one-time link (7-day expiry) the player sends them. Paper form fallback at check-in |
| ID photos | Required to play. Private storage, only player + admin can view. Compressed on upload. Marked verified once; image deleted 30 days after the event |
| Medical notes | Optional, separate explicit consent (health data is sensitive under Bangladesh's PDPO 2025) |
| Payment | Manual bKash. Captain enters transaction ID; admin verifies. Each transaction ID usable once. Consider a bKash Personal Retail Account to separate tournament money |
| Emails | 15 automatic emails (welcome, guardian, join, payment reminders, confirmed, match-day pack, changes, results). Email queue table in DB; GitHub Action every 15 min sends via Gmail SMTP (app password); same job keeps Supabase awake. Supabase auth emails use Gmail as custom SMTP. Switch to Resend once a domain exists |
| History | Import past rosters from Fillout CSV exports and the organiser's awards list. Players claim past records ("this is me"), admin approves |
| Certificates | Later stage. PDF per player with QR + `/verify/<id>` page |
| Handbook | One page EN/BN + PDF, new edition per season, linked from the event agreement |
| Languages | Everything in English and Bangla. Claude writes English; the organiser writes the Bangla |
| Cost | Free tiers only for now, with a clear upgrade path |
| Legal status | No budget to register yet; stay as Uriana Faiha trading as Obsidian Cup. Revisit a trade licence later |
| Sports | Multi-sport from day one: each event has a sport and its own rules (squad size, special roles like libero, position list, age and gender limits) |
| Positions | Players pick preferred positions freely from the sport's list (volleyball: outside hitter, setter, middle blocker, opposite, libero; football: goalkeeper, defender, midfielder, forward). Libero cap (2) is a per-team volleyball rule |
| Sports profile | Optional: height, weight (never public), standing reach, vertical jump, playing hand and foot, level, year started, preferred jersey, shirt size, short bio, and a "show my stats" switch for future public player pages. Shown to the player as a private player card. Under-13s only after guardian consent (007). Privacy Notice bumped to 1.1 to cover it; 1.0 stays registered for old records. The Claude Doc copy of the legal texts still needs the 1.1 changes |
| Tournament items | Event agreement, guardian consent, ID photo and joining a team are explained in a "Before your first tournament" card instead of empty tick boxes; they are collected at registration (stage 3) |
| Jerseys | Not supplied by Obsidian Cup. Teams must wear matching numbered jerseys; jersey number stored per team, unique within the team |
| Logo | For now: the OC monogram from logo round 2 (O in front of C, chip on the C), in `assets/logo-oc.svg` (masked, works on any background). Favicon (`favicon.svg` + `.ico`), `apple-touch-icon.png`, `og-image.jpg` and `email-logo.png` are made from it. The organiser may redesign it later; swap those files and the email templates |

## Legal texts

- English source: [`docs/legal/legal-texts-en-v1.md`](legal/legal-texts-en-v1.md)
  (also a Claude Doc in the organiser's account: https://claude.ai/artifact/UGqdnFVxxwXvSGMMp5w879)
- Bangla translation: to be added as `docs/legal/legal-texts-bn-v1.md`
- Every agreement is stored with document name, version, language, timestamp.
  Changing a text = new version number, players re-agree.
- **Before launch:** fill placeholders ([Organiser legal name], [Postal address]),
  decide controlling language, and get a one-time review by a Bangladeshi lawyer
  (especially the liability section and guardian consent, and storing data in
  Singapore under the PDPO 2025).

## Technical setup

| Piece | Choice | Free limit | Upgrade |
| --- | --- | --- | --- |
| Website | Existing static site on Vercel (vanilla HTML/CSS/JS) | Hobby plan; officially non-commercial, check terms | Vercel Pro, or Cloudflare Pages (free, commercial OK) |
| Accounts, database, file storage | Supabase, Singapore region, project `obsidian-cup` | 500 MB DB, 1 GB storage, 50k monthly users | Pro $25/month, same project |
| Login | Supabase Auth: Google provider + email/password | Free | Free |
| Email sending | Gmail SMTP (~500/day) via GitHub Actions queue sender | Free | Resend (needs domain; free 100/day, 3,000/month) |
| Keep-alive | GitHub Action pinging the database daily (free projects pause after ~7 days of low activity) | Free | Not needed on Pro |
| Domain | Optional, ~$10–15/year. Buy before setting up Google login | — | — |

Supabase account must be owned by obsidiancup.official@gmail.com.

## Security rules (non-negotiable)

1. All permissions are enforced **in the database** with Row Level Security,
   never only in page code. The page code is public (this repo is public).
2. Only the Supabase **anon public key** goes in the website. The
   `service_role` key never goes in the repo, the website, or a chat.
3. Captains see only name, position, jersey number and completion status of
   their players. Never phone, DOB, ID, emergency contact or medical notes.
4. Admin is checked in the database against an allowlist of emails.
5. ID photos live in a private storage bucket; access only via short-lived
   signed links for the owner and admin.
6. No real player data is ever committed to this repo. Backups are downloaded
   from the admin page to the organiser's Google Drive.
7. Before launch, automated tests try to read and change other players'
   data and act as admin from a normal account. All must fail.

## Rules the database enforces

- A player can be in only one team per event.
- Squad size, special-role limits (e.g. 2 liberos) and age/gender limits come from each event's sport rules (volleyball: 6–12 players, max 2 liberos); unique jersey numbers per team.
- Unique team name per event.
- Age eligibility computed from date of birth as of the event date.
- Name and date of birth lock once the organiser verifies the player.
- Roster changes lock at the event's registration deadline.
- Team slot limit per category, with a waitlist.
- bKash transaction ID unique across all registrations.
- Under-13 accounts are locked until guardian consent; under-18 players cannot join a team, upload ID or play until guardian consent is recorded.
- Possible duplicate accounts (same name + DOB) are flagged to the admin.

## Roadmap (agreed 1 Nov 2026)

Rule: no security shortcuts. Keys never go in chat or the repo; Claude does
not get direct access to the live database (no Supabase MCP on the real
project); real player photos only, never AI-made ones of players.

1. **Done — foundation:** accounts, consents, autosave profile, player codes
   (choose your own, log in with code), Gmail sender + branded login emails,
   Google login, reset password, admin list. 79 security tests, load-tested.
2. **Built 1 Nov — security hardening** (owner steps pending: run SQL,
   redeploy function, Turnstile keys, account 2-step checklist): CAPTCHA (Cloudflare Turnstile, free)
   on sign-up / login / reset; security headers on the site (CSP, HSTS,
   frame and referrer rules); two-step login for the admin page; owner
   checks: 2-step on GitHub, Supabase, Vercel, Google; minimum password
   length set in Supabase too; weekly backup routine.
3. **Now — website redesign** (three homepage directions on the "Obsidian Cup —
   Website Redesign" design canvas in the organiser's account, round 2 built
   with the anti-slop, typography, spacing, reduced-motion and transitions
   skills: A Court, B Obsidian Glass, C Programme. **Chosen: B Obsidian Glass**
   (1 Nov). Tokens: Glass #0b1012 (60%), Facet #151c1f, Bone #eeeae3 (30%),
   Mist #a7b0b2, Ice #d7e9ec (main button + focus ring, 10%; second buttons use Ice at 10% opacity with a 45% border).
   Unbounded 500/600 headings, Figtree 400/500 text. No ghost buttons: the
   second action is a filled Facet button. Sticky header keeps Log in in view.
   Rules for the build: max 3 weights (none over 600), body 16px, nothing
   under 12px, headings line-height 1.1–1.2, 8px spacing grid, text ≤70ch,
   sentence case, no all-caps labels, no stats strip, no scroll fade-ins,
   every transition has a prefers-reduced-motion fallback): design system first (colours 60/30/10, type,
   spacing, components) shown as a preview, then home → event pages → the
   rest. Live site changes only after approval. New logo slots in when ready.
4. **Teams + emails:** captain codes, teams, join codes, roster rules;
   guardian consent link; automatic emails sent from the queue (welcome,
   code changed, join requests) with a GitHub Action every 15 minutes, which
   also keeps Supabase awake.
5. **Season 5 registration:** event page + per-event consents, ID photo
   upload (private), bKash transaction ID, admin verification queue,
   reminders, confirmed / match-day emails, handbook page, CSV export.
6. **Before launch:** Bangla texts, lawyer review of legal texts, full
   security and load test pass, rate limits raised, accounts switched on.
7. **After Season 5:** history import (MVPs, winners), public player pages,
   certificates with verify links, photo gallery with watermarks (ImageKit
   or Supabase Storage, media consent respected), domain + Resend.

## Open questions

- Postal address for the legal texts; whether to get a trade licence now.
- Season 5 dates, venue, categories, fees, deadline, team limits.
- Handbook inputs: match format, MVP selection, appeals process, safeguarding contact.
- Controlling language (English or Bangla) if the versions differ.
- Offer event credit as an alternative to refunds?
- Confirm the new refund rules marked "(new)" in the Payment policy.

## Notes from the old Fillout form (OVC S4, All Age Boys)

Fields to carry over: team name; captain and vice-captain name, phone,
email, age, Instagram; per player: full name, age, position
(Regular/Libero), role (Captain/Vice-Captain/Player), ID photo, Instagram;
emergency contact name, relationship, phone; captain declaration.
Bugs found in it: ending page said "Super Cup Season 2" on the OVC S4 form;
linked @obsidian.volleyball instead of @obsidiancup; "Player Roaster" typo;
age was free text.
