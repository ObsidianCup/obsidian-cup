# Player Accounts System — Plan and Decisions

Last updated: 31 Oct 2026. Status: **planning done, nothing built yet. Target: Season 5 volleyball launch.**

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
| Login | Google sign-in, or email + password (both free). No phone/SMS login. Passwords are never emailed |
| Player code | Every account gets a permanent code like `OC-7KM2Q` (no 0/O/1/I), emailed in the welcome email; used for check-in QR, player card, certificates, public page `/player/<code>` |
| Organiser (legal) | Obsidian Cup is not a legal entity yet. Legal texts name **Uriana Faiha, founder and head organiser, trading as Obsidian Cup**. Recommended next step: sole proprietorship trade licence; later an OPC |
| Saving | Profile forms autosave as the player types |
| Teams | Captain creates a team with a **captain code**; players join with a **team join code** and the captain approves. No searching other players |
| Captain codes | Issued by the organiser from the admin page. One code = one team in one event. Single use, expires, tied to the first account that uses it |
| Admin | Only the organiser (obsidiancup.official@gmail.com) for now |
| Consent | Each player agrees for themselves: at sign-up (terms, privacy, real DOB) and per event (participation agreement, media part A, fitness). Media part B (individual feature) is optional |
| Under 18 | Guardian completes consent themselves via a private one-time link (7-day expiry) the player sends them. Paper form fallback at check-in |
| ID photos | Required to play. Private storage, only player + admin can view. Compressed on upload. Marked verified once; image deleted 30 days after the event |
| Medical notes | Optional, separate explicit consent (health data is sensitive under Bangladesh's PDPO 2025) |
| Payment | Manual bKash. Captain enters transaction ID; admin verifies. Each transaction ID usable once. Consider a bKash Personal Retail Account to separate tournament money |
| Emails | 15 automatic emails (welcome, guardian, join, payment reminders, confirmed, match-day pack, changes, results). Email queue table in DB; GitHub Action every 15 min sends via Gmail SMTP (app password); same job keeps Supabase awake. Supabase auth emails use Gmail as custom SMTP. Switch to Resend once a domain exists |
| History | Import past rosters from Fillout CSV exports and the organiser's awards list. Players claim past records ("this is me"), admin approves |
| Certificates | Later stage. PDF per player with QR + `/verify/<id>` page |
| Handbook | One page EN/BN + PDF, new edition per season, linked from the event agreement |
| Languages | Everything in English and Bangla. Claude writes English; the organiser writes the Bangla |
| Cost | Free tiers only for now, with a clear upgrade path |

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
- 6–12 players per team; at most 2 liberos; unique jersey numbers per team.
- Unique team name per event.
- Age eligibility computed from date of birth as of the event date.
- Name and date of birth lock once the organiser verifies the player.
- Roster changes lock at the event's registration deadline.
- Team slot limit per category, with a waitlist.
- bKash transaction ID unique across all registrations.
- Under-18 players cannot join a team until guardian consent is recorded.
- Possible duplicate accounts (same name + DOB) are flagged to the admin.

## Build stages

1. **Foundation:** Supabase schema, Google + email/password login, player code + welcome email, player profile with
   autosave, sign-up consents, admin page skeleton, security tests.
2. **Teams:** captain codes, team creation, join codes, roster rules.
3. **Registration:** per-event consents, ID upload, guardian consent link,
   bKash transaction ID, admin verification queue, CSV export, deadlines.
4. **Later:** public player history pages, domain, more sports.

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
