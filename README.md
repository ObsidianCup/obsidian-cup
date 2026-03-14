# Obsidian Cup — Official Website

**Live site:** [obsidiancup.vercel.app](https://obsidiancup.vercel.app)

Bangladesh's premier underground volleyball tournament brand. Home of OVC (Obsidian Volleyball Cup) and OVASC (Obsidian Volleyball All Stars Cup).

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Markup | HTML5 (semantic) | Clean, accessible structure with proper ARIA roles |
| Styling | CSS3 with custom properties | No framework overhead, full design control, easy theming via CSS variables |
| Behaviour | Vanilla JavaScript (ES6+) | No dependencies, fast load, full DOM control |
| Hosting | Vercel | Free tier, auto-deploys on GitHub push, global CDN |
| Version Control | GitHub | CI/CD pipeline — every commit auto-deploys |
| Forms | Fillout.so | Multi-step forms with conditional logic, file uploads, autosave |
| Analytics | Google Analytics 4 | Real-time visitor tracking |

---

## Design Decisions

**Why no framework (React, Vue, etc)?**
The site is content-driven and mostly static. A JavaScript framework would add significant bundle size with no real benefit. Vanilla JS delivers sub-second load times on mobile connections in Bangladesh.

**Why Cormorant Garamond + DM Sans?**
The tournament brand is built on a dark, editorial aesthetic — premium but not corporate. Cormorant Garamond brings a legacy, almost stone-carved quality to headings. DM Sans keeps body text clean and highly readable at small sizes on mobile.

**Why CSS custom properties over a preprocessor?**
CSS variables are native, require no build step, and allow runtime theming. The bilingual toggle (EN/BN) and any future dark/light switching can be handled purely in JS by swapping variable values — no Sass or Less needed.

**Why Vercel over Netlify or GitHub Pages?**
Vercel's edge network performs better in South Asia than Netlify's free tier. Zero-config deployment and instant preview URLs make iteration fast.

---

## Project Structure

```
obsidian-cup/
├── index.html              # Homepage
├── 404.html                # Custom error page
├── assets/
│   ├── logo-mark.png       # Circular badge logo
│   ├── logo-wordmark.png   # Wordmark logo
│   ├── partner-smc.png     # SMC Fruity partner logo
│   ├── partner-olyve.png   # OLYVE partner logo
│   ├── favicon.ico         # Browser tab icon
│   └── apple-touch-icon.png
├── css/
│   └── style.css           # All styles, organised by component
├── js/
│   ├── config.js           # Season control panel (no-code edits)
│   ├── lang.js             # EN/BN bilingual translations
│   ├── components.js       # Navbar + footer injection
│   └── main.js             # Animations, interactions, entrance sequences
└── pages/
    ├── tournaments.html
    ├── about.html
    ├── register.html
    ├── faq.html
    ├── fixtures.html
    └── rules.html
```

---

## Season Management

All season-specific content is controlled from one file: `js/config.js`

```js
registrationOpen: true,      // shows Register in nav and opens forms
tournamentActive: true,      // shows Fixtures in nav
currentSeasonName: "OVSC",   // updates season label site-wide
currentSeasonDates: "3rd and 4th April 2026",
```

No other file needs to be touched to open or close a season.

---

## Features

- Cinematic hero entrance animation with curtain lift sequence
- Bilingual support: English and Bengali, user preference saved to localStorage
- Countdown timer to registration deadline
- Impact numbers section showing tournament scale
- Semantic HTML5 with ARIA roles and labels
- Keyboard navigable with visible focus states
- Touch-friendly — all interactive elements minimum 44×44px
- Lazy loading on all non-critical images
- Google Analytics 4 integrated
- Open Graph meta tags for WhatsApp and Facebook sharing
- Custom 404 page
- Auto-deploying CI/CD via GitHub + Vercel

---

## Built by

Uriana — founder of Obsidian Cup, Dhaka, Bangladesh. 2026.
