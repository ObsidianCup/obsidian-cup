# Security: what is in place and what is left to do

Written 13 Nov 2026 after a full security pass. Plain words on purpose.

## What was checked

- Every page script, for ways a visitor's text could run as code.
- The security headers the site sends (`vercel.json`).
- Every database table, rule and function (`supabase/migrations`).
- The log-in-with-code function, the email sender and its GitHub workflow.
- The three libraries in `js/vendor` against the official published files.
- The repository, for secrets or player data (none found).

## What was already good

- Every table has row level security; players see only their own data.
- Organiser rights need the two-step login, checked in the database.
- No inline scripts; the secret key is only in GitHub and Supabase.
- Log-in tries are counted and limited; the anti-bot check is on.

## What changed on 13 Nov

| Area | Change |
| --- | --- |
| Email sender | The email library (nodemailer 6.9.16) had known security holes, including one that could send an email to the wrong domain. Updated to 10.5.0. The sender now refuses anything that is not one plain email address. |
| Database (014) | A handful of helper functions could be run by visitors who are not logged in (harmless ones, but none should be open). Now none can. Published events can be read by visitors without an error. |
| Database (014) | Throwaway email addresses cannot make an account. |
| Log in with code | Only the live site may call it; wrong answers all take the same time, so nobody can find out which codes exist; odd or oversized requests are refused early. |
| Headers | Inline style blocks and inline event handlers are now blocked too; more browser features switched off; account and organiser pages are marked "do not index" in the headers as well. |
| Legal page | Documents are cleaned before they are shown: plain formatting only. |
| Organiser CSV | Cells that a spreadsheet could read as a formula are made safe even behind spaces or a tab. |
| GitHub | Workflow actions pinned to exact versions; the email job never runs in a copy of the repository; Dependabot proposes updates. |
| Reporting | `/.well-known/security.txt` tells researchers where to write. Its date must be renewed before 1 Nov 2027. |

## To do, by the owner (one at a time, in this order)

1. **Run migration 014.** Supabase → SQL Editor → New query → paste all of
   <https://raw.githubusercontent.com/ObsidianCup/obsidian-cup/main/supabase/migrations/014_security_hardening.sql>
   → Run. Then a new query: `notify pgrst, 'reload schema';` → Run.
2. **Redeploy the log-in function.** Supabase → Edge Functions →
   `login-with-code` → Code → replace everything with
   <https://raw.githubusercontent.com/ObsidianCup/obsidian-cup/main/supabase/functions/login-with-code/index.ts>
   → Deploy. "Verify JWT" stays off.
3. **Delete the unknown account** (the throwaway-email one from 10 Nov):
   Supabase → Authentication → Users → the three dots on its row → Delete user.
4. **Two-step login on every account that can change the site.** GitHub,
   Supabase, Vercel, and the Obsidian Cup Gmail. One stolen password on any of
   these is worse than any hole in the website.
5. **GitHub → the repository → Settings → Advanced Security** (may be called
   "Code security"): turn on Secret Protection with Push protection (a key
   pasted by mistake is refused before it is public), Dependabot alerts, and
   Code scanning → Default setup.
6. **GitHub → Settings → Branches → Add a ruleset for `main`:** block force
   pushes and deletion.
7. **Supabase → Authentication → URL Configuration:** Site URL is the live
   address, and Redirect URLs lists only the live account page. Remove
   anything else (old previews, localhost).
8. **Supabase → Authentication → Sign In / Providers → Email:** minimum
   password length 8 or more, "Confirm email" on, "Secure email change" on.
   Switch off any provider that is not used (only Email and Google are).
9. **Supabase → Authentication → Attack Protection:** the anti-bot check
   (Turnstile) is on. "Leaked password protection" needs the paid plan; turn
   it on if the project is ever upgraded.
10. **Supabase → Authentication → Rate Limits:** leave the defaults; do not
    raise them.

## If something goes wrong

- A real player's email is refused: Supabase → Table Editor →
  `blocked_email_domains` → delete the row for that domain.
- A key was pasted somewhere public: make a new one in the same place the old
  one came from (Supabase → Project Settings → API Keys, or Google → App
  passwords), put the new one in GitHub → Settings → Secrets, delete the old.
  A removed commit does not un-leak a key.
- Someone reports a hole: thank them, do not share details publicly, and open
  a new Claude chat with the handover file.

## Not possible to check from a Claude session

The live Supabase settings above, real emails, Google log in, the anti-bot
check, and how the headers arrive from the live host. After the next push,
<https://securityheaders.com> and <https://observatory.mozilla.org> show the
live headers (both free, no account).

## Checks to re-run after changes

`supabase/tests/rls_test.mjs` (includes: no function open to visitors, every
table has row level security, visitors can write nothing),
`scripts/email/sender_test.mjs`, `python3 scripts/check_vendor.py`,
`python3 scripts/build_host_files.py --check`, and the site tests.
