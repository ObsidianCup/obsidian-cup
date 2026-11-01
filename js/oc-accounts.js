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
  privacy: '1.1',
  media: '1.0',
  dob_declaration: '1.1',
  media_feature: '1.0',
};
const OC_SIGNUP_REQUIRED = ['terms', 'privacy', 'dob_declaration'];

// Positions players can pick per sport. Add a sport here and it appears
// on every profile; event rules (squad size, libero limits) live with events.
const OC_SPORTS = {
  volleyball: ['outside_hitter', 'setter', 'middle_blocker', 'opposite', 'libero'],
  // Shown as "Futsal". The id stays 'football' because the database (009) stores that value.
  football: ['goalkeeper', 'defender', 'winger', 'pivot'],
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
    emailOrCode: 'Email or player code',
    errEmailOrCode: 'Enter your email, or your player code like OC-UF023.',
    errLoginCode: 'Player code or password is not right. Check both and try again.',
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
    errCaptcha: 'Please complete the check above the button (it proves you are not a robot), then try again.',
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
    codeLoginTip: 'You can log in with this code instead of your email.',
    codeChange: 'Choose a different code',
    codeChangesLeft: 'Pick one below, or type your own numbers. Codes always start with OC- and your initials. You can change it {n} more time(s).',
    codeNoChangesLeft: 'You have already changed your code twice. Email obsidiancup.official@gmail.com if you need a new one.',
    codeOwn: 'Or type your own numbers (3 or 4 digits)',
    codeChecking: 'Checking…',
    codeOk: '{code} is available',
    codeCurrent: 'This is your code now.',
    codeTaken: '{code} is taken. Try other numbers.',
    codeFormat: 'Use 3 or 4 digits.',
    codeSave: 'Use this code',
    codeConfirm: 'Change your player code to {code}? Your old code stops working, and you can change it {n} more time(s) after this.',
    codeSaved: 'Done. Your player code is now {code}.',
    cancel: 'Cancel',
    checklistTitle: 'Your profile',
    cardEmpty: 'Fill in your sports profile below and your player card builds itself.',
    cardHeight: 'Height',
    cardReach: 'Reach',
    cardJump: 'Jump',
    cardHand: 'Plays',
    cardLevel: 'Level',
    cardSince: 'Playing since',
    cardJersey: 'Jersey',
    cardPrivate: 'Only you and organisers see this card. Turn on "Show my stats" to put these on your public player page later.',
    checkSports: 'Sports profile: height, playing hand, level',
    laterTitle: 'Before your first tournament',
    laterIntro: 'Nothing to do yet. When you or your captain register a team for an event, we will ask for these, and you can finish them in a few minutes:',
    laterAgreement: 'Event agreement and media consent for that event',
    laterAgreementWhy: 'The rules, safety and photo terms for that specific tournament.',
    laterGuardian: 'Parent or guardian consent',
    laterGuardianWhy: 'Needed because you are under 18. We send your parent or guardian a private link; they fill it in themselves.',
    laterId: 'A photo of your ID',
    laterIdWhy: 'To confirm your age for the category. It is private and deleted 30 days after the event.',
    laterTeam: 'Join a team',
    laterTeamWhy: 'Your captain shares a join code, or you create a team with a captain code from us.',
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
    secSports: 'Sports profile',
    sportsIntro: 'All optional. These build your player card and help us balance teams and categories. You can clear them any time.',
    heightCm: 'Height (cm)',
    weightKg: 'Weight (kg, optional)',
    weightHint: 'Never shown publicly. Only you and organisers can see it.',
    reachCm: 'Standing reach (cm)',
    reachHint: 'Stand flat-footed next to a wall, reach up with one arm, and measure to your fingertips.',
    jumpCm: 'Vertical jump (cm)',
    jumpHint: 'How much higher you can touch when you jump, compared with your standing reach.',
    hand: 'Playing hand',
    foot: 'Stronger foot',
    sideRight: 'Right',
    sideLeft: 'Left',
    sideBoth: 'Both',
    level: 'Highest level you have played',
    levelNew: 'Just starting',
    levelSchool: 'School or college team',
    levelClub: 'Club team',
    levelLeague: 'League or division',
    levelNational: 'National or age-group national',
    since: 'Year you started playing',
    jersey: 'Preferred jersey number',
    jerseyHint: '0 to 99. Your team decides the final number.',
    shirt: 'Shirt size',
    bio: 'About you (short)',
    bioHint: 'Up to 280 characters, for your player page. For example where you train or your proudest match.',
    showStats: 'Show my stats on my public player page when player pages launch (height, reach, jump, playing hand and foot, level, year started). Weight is never shown.',
    errHeight: 'Enter your height in centimetres, between 100 and 250.',
    errWeight: 'Enter a weight between 25 and 200 kg, or leave it empty.',
    errReach: 'Enter a standing reach between 120 and 350 cm.',
    errJump: 'Enter a jump between 5 and 150 cm.',
    errSince: 'Enter a year between 1980 and this year.',
    errJersey: 'Use a number from 0 to 99.',
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
    sport_football: 'Futsal',
    pos_outside_hitter: 'Outside hitter',
    pos_setter: 'Setter',
    pos_middle_blocker: 'Middle blocker',
    pos_opposite: 'Opposite',
    pos_libero: 'Libero',
    pos_goalkeeper: 'Goalkeeper',
    pos_defender: 'Defender',
    pos_winger: 'Winger',
    pos_pivot: 'Pivot',
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
    adminBackup: 'Download full backup',
    adminBackupNote: 'Backup saved. Keep it in the organiser Google Drive only; it contains private player data.',
    mfaSetupTitle: 'Set up two-step login',
    mfaSetupIntro: 'This page shows every player\'s private details, so it needs a second step after your password. Install an authenticator app (Google Authenticator or Microsoft Authenticator), scan this code with it, then type the 6-digit code it shows. Save the key below somewhere safe (for example your password manager) in case you lose your phone.',
    mfaCheckTitle: 'Two-step login',
    mfaCheckIntro: 'Open your authenticator app and type the 6-digit code for Obsidian Cup.',
    mfaSecretLabel: 'Can\'t scan? Type this key into the app instead:',
    mfaCodeLabel: '6-digit code from the app',
    mfaVerify: 'Continue',
    mfaWrong: 'That code did not work. Codes change every 30 seconds; try the newest one.',
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
