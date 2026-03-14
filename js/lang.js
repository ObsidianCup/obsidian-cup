/* ============================================
   OBSIDIAN CUP — Language Translations
   EN + BN (Bengali)
   ============================================ */

const TRANSLATIONS = {
  en: {
    // Nav
    navHome: "Home",
    navTournaments: "Tournaments",
    navAbout: "About",
    navFaq: "FAQ",
    navRegister: "Register",

    // Hero
    heroEst: "Est. 2026",
    heroLocation: "Dhaka · Bangladesh",
    heroTitle: "Obsidian Cup",
    heroTagline: "Carved by Legacy · Crowned in Obsidian",
    heroMeta: "Bangladesh · Volleyball · 02 Seasons",

    // Announcement
    announcedLabel: "Now Announced",
    announcedTitle: "Obsidian Volleyball Super Cup",
    announcedSub: "OVC Season 2 × OVASC Season 2 · 3rd and 4th April 2026 · Shaheed Noor Hossain National Volleyball Stadium, Purana Paltan, Dhaka 1000",
    announcedCategories: "Boys Interschool · Boys Open Age · Girls Open Age",
    registerBtn: "Register Your Team →",

    // Paths
    pathsLabel: "Choose your path",
    pathsTitle: "The courts don't forget",
    path1Number: "01",
    path1Title: "Register Your Team",
    path1Desc: "Assemble your squad and step onto the court. Registration is your first step toward the Obsidian throne.",
    path1Link: "Enter the tournament →",
    path2Number: "02",
    path2Title: "Follow the Tournament",
    path2Desc: "Witness the battles, celebrate the champions, and be part of the legacy being carved in obsidian.",
    path2Link: "Explore the seasons →",

    // Champions
    championsLabel: "Hall of legacy",
    championsTitle: "Past Champions",

    // Impact
    impact1Number: "2",
    impact1Label: "Seasons Completed",
    impact2Number: "17",
    impact2Label: "Teams Competed",
    impact3Number: "180+",
    impact3Label: "Players on Court",
    impact4Number: "50+",
    impact4Label: "Spectators",

    // Partners
    partnersLabel: "Those who believed early",
    partnersTitle: "Our Partners",

    // Social
    socialLabel: "Stay in the loop",
    socialTitle: "Follow the Journey",
    socialDesc: "Match updates, fixture announcements, behind the scenes, and more — all on Instagram.",
    openInstagram: "Open Instagram",
    openFacebook: "Open Facebook",

    // Footer
    footerTagline: "Carved by Legacy, Crowned in Obsidian",
  },

  bn: {
    // Nav
    navHome: "হোম",
    navTournaments: "টুর্নামেন্ট",
    navAbout: "আমাদের সম্পর্কে",
    navFaq: "প্রশ্নোত্তর",
    navRegister: "নিবন্ধন",

    // Hero
    heroEst: "প্রতিষ্ঠিত ২০২৬",
    heroLocation: "ঢাকা · বাংলাদেশ",
    heroTitle: "অবসিডিয়ান কাপ",
    heroTagline: "উত্তরাধিকারে খোদাই · অবসিডিয়ানে মুকুট",
    heroMeta: "বাংলাদেশ · ভলিবল · ০২ সিজন",

    // Announcement
    announcedLabel: "এখন ঘোষিত",
    announcedTitle: "অবসিডিয়ান ভলিবল সুপার কাপ",
    announcedSub: "OVC সিজন ২ × OVASC সিজন ২ · ৩রা ও ৪ঠা এপ্রিল ২০২৬ · শহীদ নূর হোসেন জাতীয় ভলিবল স্টেডিয়াম, পুরানা পল্টন, ঢাকা ১০০০",
    announcedCategories: "বয়েজ ইন্টারস্কুল · বয়েজ ওপেন এজ · গার্লস ওপেন এজ",
    registerBtn: "দল নিবন্ধন করুন →",

    // Paths
    pathsLabel: "আপনার পথ বেছে নিন",
    pathsTitle: "কোর্ট কখনো ভুলে না",
    path1Number: "০১",
    path1Title: "দল নিবন্ধন করুন",
    path1Desc: "আপনার দল গঠন করুন এবং কোর্টে পা রাখুন। নিবন্ধন হলো অবসিডিয়ান সিংহাসনের দিকে আপনার প্রথম পদক্ষেপ।",
    path1Link: "টুর্নামেন্টে যোগ দিন →",
    path2Number: "০২",
    path2Title: "টুর্নামেন্ট অনুসরণ করুন",
    path2Desc: "লড়াই প্রত্যক্ষ করুন, চ্যাম্পিয়নদের উদযাপন করুন এবং অবসিডিয়ানে খোদাই হওয়া এই ইতিহাসের অংশ হোন।",
    path2Link: "সিজন অন্বেষণ করুন →",

    // Champions
    championsLabel: "উত্তরাধিকারের হল",
    championsTitle: "সাবেক চ্যাম্পিয়ন",

    // Impact
    impact1Number: "২",
    impact1Label: "সম্পন্ন সিজন",
    impact2Number: "১৭",
    impact2Label: "প্রতিযোগী দল",
    impact3Number: "১৮০+",
    impact3Label: "কোর্টে খেলোয়াড়",
    impact4Number: "৫০+",
    impact4Label: "দর্শক",

    // Partners
    partnersLabel: "যারা আগে বিশ্বাস রেখেছিলেন",
    partnersTitle: "আমাদের অংশীদার",

    // Social
    socialLabel: "সংযুক্ত থাকুন",
    socialTitle: "যাত্রা অনুসরণ করুন",
    socialDesc: "ম্যাচ আপডেট, ফিকচার ঘোষণা, পর্দার পেছনের দৃশ্য এবং আরও অনেক কিছু — ইনস্টাগ্রামে।",
    openInstagram: "ইনস্টাগ্রাম খুলুন",
    openFacebook: "ফেসবুক খুলুন",

    // Footer
    footerTagline: "উত্তরাধিকারে খোদাই, অবসিডিয়ানে মুকুট",
  }
};

function setLanguage(lang) {
  document.querySelectorAll('[data-key]').forEach(el => {
    const key = el.getAttribute('data-key');
    if (TRANSLATIONS[lang] && TRANSLATIONS[lang][key]) {
      el.textContent = TRANSLATIONS[lang][key];
    }
  });
  localStorage.setItem('oc_lang', lang);
  // Update toggle button states
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('lang-btn-active', btn.getAttribute('data-lang') === lang);
  });
  // Update html lang attribute
  document.documentElement.lang = lang === 'bn' ? 'bn' : 'en';
}

function initLanguage() {
  const saved = localStorage.getItem('oc_lang') || 'en';
  setLanguage(saved);
}
