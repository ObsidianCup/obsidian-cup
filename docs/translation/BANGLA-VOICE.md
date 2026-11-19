# How the site's Bangla is written (owner's decisions, 18 to 19 Nov 2026)

Use this for every Bangla line on the site. Owner's own words in quotes.

1. **Style: like Prothom Alo sports.** Bangla sentences; everyday English words written in
   Bangla letters (টুর্নামেন্ট, চ্যাম্পিয়ন, রানার্সআপ, ভেন্যু, স্টল পার্টনার). Season = আসর
   (৪র্থ আসর). Team names, brand names (Obsidian Cup, Obsidian Volleyball Cup), partner
   names and @handles stay in English letters. Bangla digits for numbers and dates.
2. **No pronouns.** "make the tense or the POV in a way that doesn't use any pronouns":
   no আপনি, তুমি, আমরা, আমাদের. Use impersonal forms (যাবে, হবে, লাগবে), noun phrases, or a
   plain verb (খুলুন) for buttons.
3. **The idea, not the words.** "It doesn't have to be the same thing everywhere, just the
   right idea." What is classy in English can be cringe in Bangla: "our air we breathe"
   is energising in English but cringe in Bangla; "fragrance partner" is classy, but
   সুগন্ধি পার্টনার sounds cheap ("chapri") → ফ্র্যাগ্রান্স পার্টনার. Drop poetic English
   taglines rather than translating them word for word.
4. **Spoken, not textbook** (from the owner's bangla-spoken-voice skill): এটা not এটি; no
   stiff joining words (অর্থাৎ, এক্ষেত্রে, প্রকৃতপক্ষে, বাস্তবে); short sentences that sound
   natural said aloud; standard spoken Bangla, not dialect (no বানাইলেন). The skill's
   video rules (hooks, camera, one lesson per reel) do not apply to the website.

Tools: `docs/translation/site-text.json` (English + Bangla per line), then
`python3 scripts/build_bn.py`. Find English left on a page in Bangla mode:
`node scripts/site-tests/bn-gaps.js [/page]` (site served on localhost:8765).
Some Bangla also lives in `js/lang.js` (TRANSLATIONS.bn) and `js/oc-accounts.js` (OC_TEXT.bn).

Progress: home page done 19 Nov (sample for the owner). Next: menu and footer, then the
other pages, then the account pages (376 lines).
