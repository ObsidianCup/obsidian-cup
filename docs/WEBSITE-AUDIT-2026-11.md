# Obsidian Cup — Website Audit

> Audit date: 2 Nov 2026
> Audited by: Claude (UX, content, SEO, accessibility, AI search)
> Pages reviewed: 15 public pages and documents, English and Bangla, at desktop and phone widths
> Site URL: https://obsidiancup.vercel.app

## Executive summary

The site is technically clean and the design is consistent. In the crawl there were no script errors, no broken local files and no sideways scrolling on any page. The biggest risks are rules that disagree between pages and thin information about the next season. The biggest gain is search visibility: Bangla pages cannot be found by search engines, and no page describes the organisation or its events in a form search engines and AI tools can read.

Translation gaps are left out on purpose, because the owner is doing Bangla by hand.

## Scorecard

| Area | State | Why |
| --- | --- | --- |
| Usability | Good | Clear menu, works on phones, clear "registration closed" page |
| Accessibility | Good | Skip link, image text, labelled fields, heading order and language tag all pass. Colour contrast and screen readers were not tested |
| SEO | Fair | Titles, descriptions and canonical links exist. No Bangla indexing, no structured data, weak homepage title |
| AI search | Weak | Crawlers are allowed, but there is no structured data and no llms.txt |

The audit skill's scoring templates and PDF generator were not available in this session, so these are plain judgements rather than a letter grade.

## Critical issues (fix before registration opens)

1. 🔴 **Unconfirmed refund rules now read as final.** The 7 "(new)" labels were removed from the payment policy as asked. Those rules (bKash number of captain or vice-captain, refund within 14 days, bKash charges not refunded, date changes, stopped events, hartal) were drafts waiting for a yes. The owner needs to confirm them. Lawyer review is also still open.
2. 🔴 **Slot rule disagrees.** Rules page: "Slots are allocated on a first-come, first-served basis." Payment policy: "Slots are given in order of verified payment." → Change the Rules page to: "Slots are given in order of verified payment."
3. 🔴 **Forfeit rule disagrees.** Rules page: a team forfeits if it is not there "within 15 minutes of the scheduled match time". Launch plan handbook: forfeit with "fewer than 6 players at 15 minutes before". → The owner picks one; the handbook must match.
4. 🔴 **No futsal rules.** The Rules page covers volleyball only, while the site runs two sports. It is also hidden from the menu (`rulesVisible: false`) though listed in the sitemap. → Add futsal rules, and turn the page on before registration.

## Content and copy issues

- 🟡 ⚠️ **"Silhoutte"** (U19 boys champions) appears in several places. If this is not the team's own spelling, it should be "Silhouette". Check against Instagram.
- 🟡 **Season numbers look like a mistake to newcomers.** Volleyball Cup goes Season 1, then Season 4, with Super Cup Season 2 and All Stars Cup Season 1 between. 💡 Add one line to the Past seasons page explaining that the count runs across all volleyball events, if that is the reason.
- 🟡 **Abbreviations nobody outside knows:** OVC, OVASC, OVSC and OFC appear on partner cards and in the FAQ. → Write "Volleyball Cup, Season 4" as the event cards do.
- 🟡 **FAQ on event changes is shorter than the policy.** The FAQ only promises a refund if an event cannot be rescheduled. The policy also lets teams withdraw within 7 days of a date or venue change. The 50% refund answer does match. → Add one sentence, and link the policy once it is shown during registration.
- 🟡 **Photo consent.** The FAQ says "participating or attending" means consent. The Media Consent only covers players. → Decide whether spectators are covered; if so, a notice at the venue is safer than a sentence in the FAQ.
- 🟡 **ID wording.** The Rules page says "scanned copy"; the account plan says ID photo. → Use "a clear photo".
- 🟢 **"more than 60 spectators"** undersells a national stadium event. 💡 Drop it, or give a stronger figure if there is one.
- 🟢 **"Team 01"** as the futsal runner-up looks like a placeholder. Confirm it is the real team name.
- 🟢 **Rules voice** is stiffer than the rest of the site ("Failure to provide valid identification will result in…"). 💡 Rewrite in the plain voice of the Register page.

## UX and structure issues

- 🟡 **Player stories page has no stories.** The heading above the form says "Real words, real people" but quotes are hidden until the owner confirms they are real. → Publish real ones, or change the heading to "Share your experience".
- 🟡 **Story form opens the visitor's email app,** which fails on many phones with no mail app set up. 💡 Save to the database once accounts launch.
- 🟢 **Partner block repeats** word for word on Home, Past seasons and About. 💡 Keep it on Home and About.
- 🟢 **"Season 5 is next"** has no date. 💡 Add a month when known, even a rough one.

## Conversion issues

- 🟡 **The Season 5 section's only action is following Instagram.** 💡 When accounts launch, add "Create your player account" so interest is captured on the site.
- 🟢 **Sponsors have no route in.** Partners are shown but there is no "Partner with us" link. 💡 Add one line with the email on About.
- 🟢 **Web address and Gmail.** `vercel.app` and a Gmail address look less official to sponsors and parents. 💡 A domain costs about $10–15 a year.

## Technical, SEO and AI search

- 🟡 **Bangla cannot be found on Google.** The language is switched by script on one address, so search engines only see English. 💡 Give Bangla its own addresses with hreflang tags. This is a medium-sized job; best after the manual translation.
- 🟡 **No structured data** on any page. 💡 Add `SportsOrganization` on Home and `SportsEvent` for each past and coming tournament. This is the single best step for Google and AI answers.
- 🟡 **Homepage title is only "Obsidian Cup".** → "Obsidian Cup | Volleyball and futsal tournaments in Bangladesh".
- 🟢 **Title order differs:** "Rules | Obsidian Cup" on most pages, "Obsidian Cup | Terms of Use" on account and legal pages.
- 🟢 **About description is short** (61 characters). 💡 Aim for 120–155.
- 🟢 **No llms.txt.** 💡 A short file describing the organisation helps AI tools.
- 🟢 **Account and legal pages have no canonical link or sharing card.** Add at launch, along with legal pages in the sitemap.

## Passed checks

No script errors, broken local files or sideways scroll in any of the 68 page views. Every image has alt text. Skip link, one main region, heading order and no text under 12px all pass. The page language tag changes with the language switch. Reduced-motion rules exist. Crawlers are allowed in robots.txt.

## Not tested

The crawl ran on a local copy of the repo, so live speed, live security headers, Google Fonts, analytics, the anti-bot check and external links were not tested. Logged-in account screens were not re-audited.

## Priority action plan

| Priority | Action | Type | Page |
| --- | --- | --- | --- |
| 1 | Confirm the refund and payment rules | Owner decision | Payment policy |
| 2 | Align slot and forfeit rules | Copy | Rules, handbook |
| 3 | Write futsal rules | Owner input + copy | Rules |
| 4 | Check team names (Silhoutte, Team 01) | Owner check | Results |
| 5 | Add structured data and a better homepage title | SEO | Home, event pages |
| 6 | Replace abbreviations and fix FAQ wording | Copy | FAQ, partner cards |
| 7 | Fix or reword Player stories | Copy | Experiences |
| 8 | Bangla pages with their own addresses | Build | Whole site, after translation |
