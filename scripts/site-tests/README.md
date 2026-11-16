# Site tests

Browser tests that run against a local copy of the site. They never touch the
real database: `fake-supabase.js` stands in for it.

```
python3 -m http.server 8765            # in the repo folder, leave running
mkdir -p /tmp/oc-shots/shots2
node scripts/site-tests/full-audit.js /tmp/oc-shots       # every page, EN and BN, 4 widths, every link
node scripts/site-tests/account-flows.js /tmp/oc-shots    # log in, sign up, reset, agreement, sports, profile
node scripts/site-tests/more-checks.js /tmp/oc-shots      # accounts switched on, reduced motion, keyboard, menu
```

They need Playwright (`npm i -g playwright`, or set `NODE_PATH` to where it is).
`full-audit.js` prints nothing but the link count when all is well. The two
"broken [null]" lines for account and admin are hidden photo placeholders.

Other tests: `supabase/tests/rls_test.mjs` (database rules),
`scripts/email/sender_test.mjs` (emails and scheduled account deletion),
`python3 scripts/build_host_files.py --check` (host files match vercel.json).

`motion-checks.js`: the "showy" motion mode (`?motion=showy`) on every public
page in both languages at 375 and 1280: nothing stays hidden, no sideways
scroll, calm mode untouched, off under reduced motion, falls back if the
script is missing. Run it like the others, with the site on localhost:8765.
