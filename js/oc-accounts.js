/* ============================================
   OBSIDIAN CUP — Player accounts: shared code
   Used by pages/account.html, pages/admin.html, pages/legal.html.
   Needs js/config.js and the supabase-js library loaded first.
   ============================================ */

// Current version of each legal document players agree to.
// Bump a version here (and in docs/legal + scripts/split_legal.py output)
// to make every player agree again.
const OC_LEGAL = {
  terms: '1.0',
  privacy: '1.0',
  media: '1.0',
  dob_declaration: '1.1',
  media_feature: '1.0',
};
const OC_SIGNUP_REQUIRED = ['terms', 'privacy', 'dob_declaration'];

// Positions players can pick per sport. Add a sport here and it appears
// on every profile; event rules (squad size, libero limits) live with events.
const OC_SPORTS = {
  volleyball: ['outside_hitter', 'setter', 'middle_blocker', 'opposite', 'libero'],
  football: ['goalkeeper', 'defender', 'midfielder', 'forward'],
};

// ---- Words on the account pages ------------------------------------
// English is complete. Add the Bangla for each key under `bn`; anything
// missing falls back to English automatically.
const OC_TEXT = {
  en: {
    // general
    loading: 'Loading…',
    signOut: 'Log out',
    saving: 'Saving…',
    saved: 'All changes saved',
    saveFailed: 'Could not save. Check your connection; we will try again.',
    notConfigured: 'Player accounts are not switched on yet.',
    genericError: 'Something went wrong. Please try again.',
    // auth
    authLabel: 'Player account',
    authTitleLogin: 'Log in',
    authTitleSignup: 'Create your account',
    authIntro: 'One account for every Obsidian Cup season. Your details are saved, so you only fill them in once.',
    tabLogin: 'Log in',
    tabSignup: 'Create account',
    email: 'Email',
    password: 'Password',
    passwordHint: 'At least 8 characters.',
    passwordAgain: 'Type the password again',
    errPasswordMatch: 'The two passwords do not match.',
    show: 'Show',
    hide: 'Hide',
    newPassword: 'New password',
    btnLogin: 'Log in',
    btnSignup: 'Create account',
    btnGoogle: 'Continue with Google',
    or: 'or',
    forgot: 'Forgot your password?',
    btnSendReset: 'Send reset link',
    backToLogin: 'Back to log in',
    resetIntro: 'Enter the email you signed up with and we will send a link to set a new password.',
    resetSent: 'If an account exists for that email, a reset link is on its way. Check your inbox and spam folder.',
    setNewTitle: 'Set a new password',
    btnSetPassword: 'Save new password',
    passwordUpdated: 'Password updated. You are logged in.',
    checkEmailTitle: 'Check your email',
    checkEmailBody: 'We sent a confirmation link to {email}. Open it on this or any device to finish creating your account. It can take a few minutes; check your spam folder too.',
    errEmail: 'Enter a valid email address.',
    errPassword: 'Use at least 8 characters.',
    errLogin: 'Email or password is not right, or the email is not confirmed yet. New here? Use the Create account tab first.',
    emailConfirmed: 'Your email is confirmed. Log in to continue.',
    linkExpired: 'This link has expired or was already used. Log in if your email is confirmed, or create your account again to get a new link.',
    errRateLimit: 'Too many attempts. Please wait a few minutes and try again.',
    errExists: 'An account with this email already exists. Try logging in.',
    // consent
    consentLabel: 'Before you start',
    consentTitle: 'Your agreement',
    consentIntro: 'Please read and agree to these. Each one is saved with today\'s date as your signature.',
    agreeTerms: 'I have read and agree to the {terms}.',
    agreePrivacy: 'I have read the {privacy} and agree to my data being collected, used and stored as it describes, including storage outside Bangladesh.',
    agreeDob: 'I will enter my real date of birth, exactly as it appears on my ID. I understand it is checked against my ID at tournaments and can be changed at most 2 times after I first enter it.',
    termsLink: 'Terms of Use',
    privacyLink: 'Privacy Notice',
    btnAgree: 'Agree and continue',
    consentNeedAll: 'Please tick all three boxes to continue.',
    // dashboard
    welcome: 'Welcome, {name}',
    welcomeNoName: 'Welcome',
    codeLabel: 'Your player code',
    codePending: 'Add your full name below to get your player code.',
    copy: 'Copy',
    copied: 'Copied',
    checklistTitle: 'Your checklist',
    checkConsent: 'Agreed to the terms and privacy notice',
    checkBasics: 'Basic details: name, date of birth, gender',
    checkContact: 'Contact and emergency details',
    checkGuardian: 'Parent or guardian consent (needed before a tournament)',
    checkId: 'ID photo (asked when you register for a tournament)',
    soon: 'Coming soon',
    done: 'Done',
    todo: 'To do',
    progress: '{done} of {total} done',
    // profile
    profileTitle: 'Your profile',
    autosaveNote: 'Everything saves automatically as you type.',
    secBasics: 'Basic details',
    secContact: 'Contact',
    secPositions: 'Positions you play',
    secEmergency: 'Emergency contact',
    secPrefs: 'Preferences',
    legalName: 'Full name (as on your ID)',
    displayName: 'Name to show publicly',
    displayNameHint: 'Shown on team lists and your player page. Leave empty to use your full name.',
    dob: 'Date of birth',
    dobHint: 'Must match your ID exactly. Your age is checked against your ID at tournaments.',
    dobChangesLeft: 'You can change it {n} more time(s).',
    dobNoChangesLeft: 'You cannot change it again. Email obsidiancup.official@gmail.com if it is wrong.',
    dobConfirmFirst: 'Save {date} as your date of birth? It must match your ID. After this you can change it only 2 times.',
    dobConfirmChange: 'Change your date of birth to {date}? You can change it {n} more time(s) after this.',
    gender: 'Gender category',
    genderMale: 'Male',
    genderFemale: 'Female',
    genderOther: 'Other',
    choose: 'Choose…',
    phone: 'Phone number',
    phoneHint: 'Choose the country, then type the number. You can also paste a number starting with +.',
    schoolClub: 'School, college or club',
    instagram: 'Instagram handle (optional)',
    positionsHint: 'Pick as many as you like. Your team chooses your role for each event.',
    emergencyName: 'Contact name',
    emergencyRel: 'Relationship to you',
    emergencyPhone: 'Contact phone',
    language: 'Language for emails',
    mediaFeature: 'Feature me individually in promotional posts, such as player spotlights and posters. You can change this any time.',
    mediaFeatureLink: 'Media Consent',
    under13: 'You are under 13. A parent or guardian must give consent before you can add more details or take part. Guardian consent will be available here soon.',
    under18: 'You are under 18. Your account works as normal, but a parent or guardian must give consent before you can join a team for a tournament.',
    lockedNote: 'Your name and date of birth are verified and locked. Email obsidiancup.official@gmail.com to change them.',
    errPhone: 'This does not look like a valid phone number for the chosen country.',
    errInstagram: 'Letters, numbers, dots and underscores only.',
    errDob: 'Enter a real date of birth.',
    errUnder13Save: 'A parent or guardian must give consent before you can add this.',
    errLocked: 'Your name and date of birth are locked after verification.',
    errDobLimit: 'You have already changed your date of birth twice. Email obsidiancup.official@gmail.com to change it.',
    // sports
    sport_volleyball: 'Volleyball',
    sport_football: 'Football',
    pos_outside_hitter: 'Outside hitter',
    pos_setter: 'Setter',
    pos_middle_blocker: 'Middle blocker',
    pos_opposite: 'Opposite',
    pos_libero: 'Libero',
    pos_goalkeeper: 'Goalkeeper',
    pos_defender: 'Defender',
    pos_midfielder: 'Midfielder',
    pos_forward: 'Forward',
    // legal page
    legalNoTranslation: 'This document is not available in Bangla yet, so it is shown in English.',
    legalNotFound: 'Document not found.',
    legalVersion: 'Version {version}',
    // admin
    adminLabel: 'Organiser',
    adminTitle: 'Players',
    adminNoAccess: 'This page is only for Obsidian Cup organisers.',
    adminLoginFirst: 'Log in with the organiser account first.',
    adminSearch: 'Search name, code, email or phone',
    adminExport: 'Download CSV',
    adminCount: '{n} players',
    adminVerify: 'Verify',
    adminUnverify: 'Undo',
    adminVerified: 'Verified',
    colCode: 'Code',
    colName: 'Name',
    colEmail: 'Email',
    colAge: 'Age',
    colGender: 'Gender',
    colPhone: 'Phone',
    colJoined: 'Joined',
    colStatus: 'ID check',
    adminEmpty: 'No players yet.',
  },
  bn: {
    // Bangla translations go here, using the same keys as above.
  },
};

function ocLang() {
  try { return localStorage.getItem('oc_lang') === 'bn' ? 'bn' : 'en'; } catch (e) { return 'en'; }
}

function t(key, vars) {
  const lang = ocLang();
  let s = (OC_TEXT[lang] && OC_TEXT[lang][key]) || OC_TEXT.en[key] || key;
  if (vars) for (const k in vars) s = s.split('{' + k + '}').join(vars[k]);
  return s;
}

// Fill every element marked data-t="key" (text) or data-t-placeholder="key".
function ocApplyText(root) {
  (root || document).querySelectorAll('[data-t]').forEach(el => { el.textContent = t(el.dataset.t); });
  (root || document).querySelectorAll('[data-t-placeholder]').forEach(el => { el.placeholder = t(el.dataset.tPlaceholder); });
}

// Re-apply account texts whenever the site's language toggle is used.
(function hookLanguageToggle() {
  const wrap = () => {
    if (typeof window.setLanguage !== 'function' || window.setLanguage.__oc) return;
    const original = window.setLanguage;
    window.setLanguage = function (lang) {
      original(lang);
      ocApplyText();
      document.dispatchEvent(new CustomEvent('oc:language', { detail: lang }));
    };
    window.setLanguage.__oc = true;
  };
  document.addEventListener('DOMContentLoaded', wrap);
})();

let OC_DB = null;
function ocClient() {
  if (OC_DB) return OC_DB;
  if (!window.supabase || !SITE_CONFIG.supabaseUrl || !SITE_CONFIG.supabasePublishableKey) return null;
  OC_DB = window.supabase.createClient(SITE_CONFIG.supabaseUrl, SITE_CONFIG.supabasePublishableKey, {
    // 'implicit' lets a confirmation or reset link work on any device or browser,
    // not only the one where the account was created.
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'implicit' },
  });
  return OC_DB;
}

function ocAge(dob) {
  if (!dob) return null;
  const b = new Date(dob + 'T00:00:00');
  const n = new Date();
  let a = n.getFullYear() - b.getFullYear();
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--;
  return a;
}

function ocEscape(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Turn a database error into a message a player understands.
function ocErrorMessage(err) {
  const m = (err && (err.message || err.error_description || '')) + ' ' + ((err && err.hint) || '');
  if (/guardian_required_under_13/.test(m)) return t('errUnder13Save');
  if (/locked_after_verification/.test(m)) return t('errLocked');
  if (/dob_change_limit/.test(m)) return t('errDobLimit');
  if (/phone/.test(m) && /check/.test(m)) return t('errPhone');
  if (/instagram/.test(m) && /check/.test(m)) return t('errInstagram');
  if (/date_of_birth/.test(m) && /check/.test(m)) return t('errDob');
  if (/rate limit|too many/i.test(m)) return t('errRateLimit');
  return t('genericError');
}
