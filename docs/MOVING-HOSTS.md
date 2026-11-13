# Moving the website to another host or address

The site is built so that moving takes about an hour of clicks and one command.
Nothing about players moves: accounts, photos, consents and emails live in
Supabase and GitHub, not on the web host.

## What is already prepared

| Thing | Where | Why it helps |
| --- | --- | --- |
| The site's address | `site.json` | One command changes it everywhere |
| Redirects and security settings | `vercel.json` (the original) | One place to edit |
| The same settings for Cloudflare and Netlify | `_headers`, `_redirects` | Made from `vercel.json` by a script |
| The same settings for Hostinger and similar hosts | `.htaccess` | Made from `vercel.json` by a script |
| Login links | The pages use their own address | Nothing to change in the pages |
| No build step | Plain files | Any host can serve the repo as it is |

After editing `vercel.json`, run `python3 scripts/build_host_files.py`.
`python3 scripts/build_host_files.py --check` says whether the copies are up to date.

## Part 1: build a copy on the new host (the live site is not touched)

Pick the host's steps. In every case the "folder to publish" is the top of the
repo and there is no build command.

- **Hostinger:** hPanel → Websites → your site → Advanced → Git. Connect the
  GitHub repo `ObsidianCup/obsidian-cup`, branch `main`, folder `public_html`.
  Auto-deploy on. Confirm first that your plan includes Git deployment.
- **Cloudflare Pages:** Workers & Pages → Create → Pages → Connect to Git.
  Build command: empty. Output folder: `/`.
- **Netlify:** Add new site → Import from Git. Build command: empty. Publish
  folder: `.`.
- **Vercel Pro:** nothing to move; upgrade the plan in Billing.

The new host gives a temporary address. Claude tests every page on it:
pages load, old addresses redirect, security settings are present
(`curl -I <address>` shows `content-security-policy`), the 404 page shows.

Login will not work on the temporary address yet. That is expected: Supabase
only accepts addresses it has been told about (part 3).

## Part 2: change the address in the repo

```
python3 scripts/move_site.py https://NEW-ADDRESS --dry-run     # shows what would change
python3 scripts/move_site.py https://NEW-ADDRESS
```

It updates every page, the sitemap, the email templates and the host files.
It leaves published legal texts alone: they must stay exactly as people agreed
to them. The next legal version should name the new address.

## Part 3: steps only the owner can do (one at a time)

1. **Domain:** point the domain at the new host (the host shows the exact DNS
   records). Wait until the site opens on the new address with a padlock.
2. **Supabase → Authentication → URL Configuration:** set Site URL to the new
   address and add `https://NEW-ADDRESS/pages/account.html` to Redirect URLs.
   Keep the old one in the list for now.
3. **Google login:** Google Cloud Console → Credentials → the OAuth client →
   add the new address under "Authorised JavaScript origins". (The redirect
   address is Supabase's and does not change.)
4. **Anti-bot check (Cloudflare Turnstile):** add the new hostname to the widget.
5. **Login with player code:** Supabase → Edge Functions → `login-with-code` →
   paste the updated `supabase/functions/login-with-code/index.ts` → Deploy.
   It accepts the old and the new address during the move.
6. **Supabase email templates:** paste the five updated files from
   `supabase/email-templates/` (they show the logo from the site's address).
7. **Test together:** sign up, confirm the email, log in with email, Google
   and player code, reset a password, open the organiser page.
8. **Old address:** leave the old Vercel site running for a few weeks, then
   ask Claude to turn it into a redirect to the new address.

## If something goes wrong

Point the domain back at the old host. The old site is still there, and no
player data was moved, so nothing is lost.

## What ties the site to one host

Nothing in the pages. Only these are host-specific, and all three are kept in
the repo side by side: `vercel.json`, `_headers` + `_redirects`, `.htaccess`.
Vercel's private preview links have no equivalent on Hostinger.
