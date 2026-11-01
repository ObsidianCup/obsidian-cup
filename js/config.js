/* ============================================
   OBSIDIAN CUP — Site Configuration
   ============================================
   Edit this file to control the site.
   No coding knowledge needed!
   ============================================ */

const SITE_CONFIG = {

  // ---- SEASON TOGGLES ----
  tournamentActive: false,
  registrationOpen: false,
  rulesVisible: false,

  // ---- CURRENT SEASON INFO ----
  currentSeasonName: "Obsidian Volleyball Cup Season 4",
  currentSeasonDates: "Completed in 2026",
  currentVenue: "Dhaka, Bangladesh",
  announcementText: "Girls-only OFC Season 1 and OVC Season 4 are complete. Thank you to everyone who showed up.",

  // ---- PLAYER STORIES ----
  // The three "Anonymous Player" quotes on the Player stories page stay hidden
  // until the organiser confirms they are real players' words.
  showPlayerQuotes: false,

  // ---- REGISTRATION FORMS ----
  formInterschool: "https://obsidiancup.fillout.com/ovscinterboys",
  formBoysOpenAge: "https://obsidiancup.fillout.com/ovscboys",
  formGirlsOpenAge: "https://obsidiancup.fillout.com/ovscgirls",

  // ---- CONTACT ----
  // Two Instagram accounts since Nov 2026. instagramUrl is the volleyball one
  // (used by the volleyball fixtures and registration pages).
  instagramUrl: "https://www.instagram.com/obsidian.volleyball/",
  instagramVolleyballUrl: "https://www.instagram.com/obsidian.volleyball/",
  instagramFutsalUrl: "https://www.instagram.com/obsidian.futsal/",
  facebookUrl: "https://www.facebook.com/share/1Cb8jWH5Gy/",
  contactEmail: "obsidiancup.official@gmail.com",

  // ---- PLAYER ACCOUNTS ----
  // accountsEnabled: true shows "Log in" in the menu and the Privacy/Terms
  // links in the footer. Keep false until accounts are tested and launched.
  accountsEnabled: false,
  // googleLogin: true shows "Continue with Google" (after Google is set up in Supabase).
  googleLogin: true,
  // Cloudflare Turnstile anti-bot check on sign-up, log in and password reset.
  // The SITE key is public and safe here; the SECRET key goes only into
  // Supabase (Authentication → Attack Protection). Empty = check switched off.
  turnstileSiteKey: "0x4AAAAAAFvpOwrq1WUxJns0",
  // Public connection details. These are safe to publish: the database's
  // security rules decide what each visitor can see. NEVER put the secret
  // or service_role key here.
  supabaseUrl: "https://mpxcoipozjnqkjwtondm.supabase.co",
  supabasePublishableKey: "sb_publishable_c7sEaeZLAQ_aZI0zhfjQ6w_Z-D6Z5wV",

};
