# OBSIDIAN CUP — Website Guide
Carved by Legacy, Crowned in Obsidian

---

## HOW TO PREVIEW YOUR SITE

1. Unzip this folder anywhere on your computer
2. Open the folder
3. Double-click `index.html`
4. Your site opens in your browser — that's it!

To check other pages, just double-click:
- `pages/tournaments.html`
- `pages/about.html`
- `pages/experiences.html`
- `pages/register.html`
- `pages/rules.html`

---

## HOW TO CONTROL THE SITE

Open `js/config.js` in any text editor (Notepad works fine).

You'll see these settings:

```js
tournamentActive: false,   // true = shows Fixtures in nav
registrationOpen: false,   // true = shows registration form
rulesVisible: false,       // true = shows Rules in nav
```

**When a new season starts:**
1. Change `tournamentActive: true` to show Fixtures
2. Change `registrationOpen: true` to open registration
3. Change `rulesVisible: true` to show Rules page
4. Update `currentSeasonName`, `currentSeasonDates`, `currentVenue`
5. Paste your Tally/Fillout form link into `registrationFormUrl`

**When tournament ends:**
Set everything back to `false`.

---

## HOW TO ADD YOUR LOGO

1. Put your logo file (PNG recommended) in the main folder
2. Open `js/components.js`
3. Find: `<div class="nav-logo-mark">O</div>`
4. Replace with: `<img src="your-logo-filename.png" style="height:36px;" alt="Obsidian Cup" />`

---

## HOW TO ADD PARTNER LOGOS

1. Put logo files in the main folder
2. Open `index.html` and `pages/about.html`
3. Find the partner cards and replace `[Logo coming soon]` text with:
   `<img src="smc-logo.png" style="max-height:60px; margin: 1rem auto;" alt="SMC Fruity" />`

---

## HOW TO ADD A NEW TOURNAMENT

Open `js/main.js` and find `const TOURNAMENTS = {`

Copy one of the existing entries and add your new one:

```js
ovc_s2: {
  season: 'OVC — Season 2',
  name: 'Obsidian Volleyball Cup',
  type: 'Interschool',
  date: 'Your dates here',
  venue: 'Venue name',
  venueAddress: 'Full address',
  description: 'About this tournament...',
  results: [
    { category: 'Boys', champion: 'Team name', runner: 'Team name' },
  ]
},
```

Then open `pages/tournaments.html` and copy one of the tournament card blocks and update the details.

---

## HOW TO DEPLOY (PUT IT ONLINE — FREE)

1. Go to vercel.com and create a free account
2. Click "Add New Project"
3. Drag your entire `obsidian-cup` folder into it
4. Click Deploy
5. Your site is live! Vercel gives you a free link like `obsidian-cup.vercel.app`

For a custom domain (like `obsidiancup.com`), buy from Namecheap (~$10/year) and connect in Vercel settings.

---

## FILE STRUCTURE

```
obsidian-cup/
├── index.html          ← Homepage
├── css/
│   └── style.css       ← All styling
├── js/
│   ├── config.js       ← YOUR CONTROL PANEL — edit this!
│   ├── components.js   ← Navbar + footer (auto-injected)
│   └── main.js         ← Animations + interactions
└── pages/
    ├── tournaments.html
    ├── about.html
    ├── experiences.html
    ├── fixtures.html
    ├── register.html
    └── rules.html
```

---

Questions? Ask Claude! Just say "I want to change X on my Obsidian Cup website" and paste the relevant file content.
