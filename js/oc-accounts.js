/* ============================================
   OBSIDIAN CUP — Player accounts: shared code
   Used by pages/account.html, pages/admin.html, pages/legal.html.
   Needs js/config.js and the supabase-js library loaded first.
   ============================================ */

// Current version of each legal document players agree to.
// Bump a version here (and in docs/legal + scripts/split_legal.py output)
// to make every player agree again.
const OC_LEGAL = {
  terms: '1.2',
  privacy: '1.4',
  media: '1.0',
  dob_declaration: '1.2',
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
// Older positions some players saved before futsal replaced football: still shown on their card.
const OC_OLD_POSITIONS = {
  football: ['midfielder', 'forward'],
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
    errCaptchaLoad: "The security check did not load. Turn off any ad blocker for this page, check your connection, then reload the page.",
    errRateLimit: 'Too many attempts. Please wait a few minutes and try again.',
    errEmailNotAllowed: 'We could not make an account with this email address. Use your everyday email (temporary inboxes are not accepted), or write to us if this keeps happening.',
    errExists: "An account with this email already exists. Log in instead, or use \"Forgot password?\" if you cannot remember your password.",
    // consent
    consentLabel: 'Before you start',
    consentTitle: 'Your agreement',
    consentIntro: 'Please read and agree to these. Each one is saved with today\'s date as your signature.',
    agreeTerms: 'I have read and agree to the {terms}.',
    agreePrivacy: 'I have read the {privacy} and agree to my data being collected, used and stored as it describes, including storage outside Bangladesh.',
    agreeDob: "I will enter my real date of birth, exactly as it appears on my ID. I understand it is checked against my ID at tournaments.",
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
    checkSports: "Sports profile: height, level, and your playing hand or stronger foot",
    laterTitle: 'Before your first tournament',
    laterIntro: 'Nothing to do yet. When you or your captain register a team for an event, we will ask for these, and you can finish them in a few minutes:',
    laterAgreement: 'Event agreement and media consent for that event',
    laterAgreementWhy: 'The rules, safety and photo terms for that specific tournament.',
    laterGuardian: 'Parent or guardian consent',
    laterGuardianWhy: "Needed because you are under 18. We email your parent or guardian a private link; they fill it in themselves. Ask them to check their spam folder too.",
    laterId: 'A photo of your ID',
    laterIdWhy: 'To confirm your age for the category. It is private and deleted 30 days after the event.',
    laterTeam: 'Join a team',
    laterTeamWhy: 'Your captain shares the team link, or you create a team yourself and share its link.',
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
    sportsIntro: "Why we ask: we are building a player profile for every Obsidian Cup athlete, with statistics and records that grow with every season you play, so your progress and achievements are kept in one place. These details also help us balance teams and categories. Everything here is optional and stays private unless you turn on \"Show my stats\". You can clear any of it at any time.",
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
    level: "Highest level you have played",
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
    dobConfirmFirst: "Save {date} as your date of birth? It must match your ID exactly.",
    dobConfirmChange: "Change your date of birth to {date}? It must match your ID exactly.",
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
    // Player card: photo and gate QR (010)
    photoAdd: "Add a photo",
    photoChange: "Change photo",
    photoRemove: "Remove photo",
    photoHint: "A clear photo of your face helps organisers recognise you at check-in. Only you and Obsidian Cup organisers can see it. We crop it to a square and make it small before saving.",
    photoSaving: "Saving your photo…",
    photoSaved: "Photo saved.",
    photoRemoved: "Photo removed.",
    photoRemoveConfirm: "Remove your profile photo?",
    photoNotImage: "Choose a photo (JPG, PNG, WebP or HEIC from your phone).",
    photoError: "Could not save the photo. Check your connection and try again.",
    gateTitle: "Show this at the gate",
    gateHint: "Organisers scan this code to check you in. It only works for logged-in organisers, so a screenshot is fine to keep on your phone.",
    gateQrLabel: "QR code for checking in player {code}",
    qrBig: "Make it bigger",
    qrSmall: "Make it smaller",
    qrNew: "Get a new QR code",
    qrNewConfirm: "Make a new QR code? Your old one (and any screenshot of it) will stop working.",
    qrNewDone: "Done. Use this new QR code from now on.",
    qrNeedsCode: "Add your full name to get your player code and your gate QR code.",
    // Gate check page (010)
    checkLabel: "Organiser",
    checkTitle: "Gate check",
    checkNoCode: "This link has no player code in it. Scan the QR on the player's card again.",
    checkLoginFirst: "Only organisers can check player cards. Log in on the organiser page with two-step login, then scan the QR again.",
    checkLoginBtn: "Go to the organiser page",
    checkNotFound: "No player has this QR code. The player may have made a new one: ask them to open their account and show the current code.",
    checkLegalName: "Name on ID: {name}",
    checkAge: "Age {n}",
    checkIdOk: "ID checked and verified",
    checkIdNo: "ID not verified yet: check their ID now",
    checkGuardianOk: "Under 18: parent or guardian has consented",
    checkGuardianNo: "Under 18: no parent or guardian consent yet",
    checkTeams: "Teams in upcoming events",
    checkNoTeam: "Not in a team for an upcoming event.",
    checkPending: "waiting for captain",
    checkCompare: "Compare the photo and name with the player's ID before letting them in.",
    // Sports choice, live card, organiser tools (011)
    sportsPickLabel: "Before you start",
    sportsPickTitle: "Which sports do you play?",
    sportsPickIntro: "Choose one or both. You can add the other one later from your profile.",
    sportsContinue: "Continue",
    sportsPickNeed: "Choose at least one sport.",
    secMySports: "Sports you play",
    sportsAdd: "Add {sport}",
    errSportsRequired: "Keep at least one sport.",
    levelAmateur: "Amateur",
    levelSetByUs: "Locked. Only organisers can change it now. Email us if it needs changing.",
    levelNotSet: "Not set yet",
    shirtChest: "{size} · chest {in} in ({cm} cm)",
    shirtHint: "Bangladeshi jersey sizes: measure around the widest part of your chest.",
    cardLive: "Live card",
    cardLiveHint: "Show this screen if an organiser asks. The logo moves and the clock ticks, so a screenshot will not pass.",
    cardDob: "Date of birth",
    cardIdOk: "ID verified",
    cardIdNo: "ID not verified yet",
    cardNow: "Current tournament",
    cardNoTournament: "No current tournament. Join a team to play in the next one.",
    cardWaiting: "waiting for captain",
    cardTodayColour: "Today's colour: {colour}",
    checklistAllDone: "All done. Your profile is ready.",
    checklistOk: "OK",
    pos_midfielder: "Midfielder",
    pos_forward: "Forward",
    errDetail: "Reason: {reason}",
    colour_ice: "Ice blue",
    colour_mint: "Mint",
    colour_amber: "Amber",
    colour_coral: "Coral",
    colour_violet: "Violet",
    colour_rose: "Rose",
    colour_lime: "Lime",
    adminLevel: "Level",
    adminTodayColour: "Today's live-card colour: {colour}",
    adminLookup: "Look up",
    adminPhotoFail: "This player has a photo, but it could not be loaded. Reload the page and try again.",
    adminLookupTitle: "Player look-up",
    adminClose: "Close",
    legalKicker: "Terms and policies",
    // Live switch, level chosen once, sport groups (012)
    levelChooseOnce: "Choose carefully: you can set this once. After that, only organisers can change it.",
    levelSave: "Save level",
    cardFoot: "Stronger foot",
    adminLiveTitle: "Live player card",
    adminLiveOn: "On",
    adminLiveOff: "Off",
    adminLiveOnWhat: "Players see the moving logo, today's colour and the clock on their card. Turn it off after the event.",
    adminLiveOffWhat: "Player cards are plain. Turn this on for event days, when you check players at the gate.",
    adminLiveTurnOn: "Turn on",
    adminLiveTurnOff: "Turn off",
    legalOnThisPage: "On this page",
    // delete account
    deleteTitle: "Delete account",
    deleteIntro: "Your account is deleted 14 days after you ask. Log in during those 14 days and it stays.",
    deleteOpen: "Delete my account",
    deleteGone: "Deleted: your profile, photo, contact details, emergency contact and sports details. Your player code is retired and never given to anyone else.",
    deleteKept: "Kept: past results and team lists, and the records of what you agreed to, as the Privacy Notice explains.",
    deleteTeams: "If you are on a team in an event that is still open for registration, you leave it.",
    deleteConfirmLabel: "Type DELETE to confirm",
    deleteConfirmBtn: "Delete account",
    deleteDlgTitle: "Delete the account of {name} ({code})?",
    deleteDlgWhen: "It is deleted 14 days after you confirm. Log in during those 14 days to keep it.",
    levelNeed: "Choose your level first.",
    codeNeedOk: "Type 3 or 4 numbers that are free first.",
    deleteBusy: "Deleting…",
    deleteErrWord: "Type DELETE in capital letters.",
    deleteErrLogin: "For your safety, log out and log in again, then delete your account within 15 minutes.",
    deleteErrCaptain: "You are the captain of a team in an event that has not finished. Hand the captaincy to another player or withdraw the team first.",
    deleteErrDeadline: "You are on a team after its registration deadline. Ask the organisers to remove you first: obsidiancup.official@gmail.com.",
    deleteDone: "Your account will be deleted on {date}. We sent you an email; check your spam folder too. Log in before then if you want to keep it.",
    deleteCancelled: "Welcome back. You logged in, so your account will not be deleted.",
  },
  bn: {
    // Translated by the organiser, Nov 2026. Same keys as above.
    loading: "লোড হচ্ছে…",
    signOut: "লগ আউট",
    saving: "সংরক্ষণ হচ্ছে…",
    saved: "সব পরিবর্তন সংরক্ষিত হয়েছে",
    saveFailed: "সংরক্ষণ করা যায়নি। আপনার ইন্টারনেট সংযোগ পরীক্ষা করুন; আমরা আবার চেষ্টা করব।",
    notConfigured: "খেলোয়াড়দের অ্যাকাউন্ট সুবিধা এখনো চালু করা হয়নি।",
    genericError: "কিছু একটা সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।",
    authLabel: "খেলোয়াড়ের অ্যাকাউন্ট",
    authTitleLogin: "লগ ইন",
    authTitleSignup: "আপনার অ্যাকাউন্ট তৈরি করুন",
    authIntro: "প্রতিটি Obsidian Cup আসরের জন্য একটি অ্যাকাউন্টই যথেষ্ট। আপনার তথ্য সংরক্ষিত থাকবে, তাই সেগুলো একবারই পূরণ করতে হবে।",
    tabLogin: "লগ ইন",
    tabSignup: "অ্যাকাউন্ট তৈরি করুন",
    email: "ইমেইল",
    emailOrCode: "ইমেইল অথবা খেলোয়াড় কোড",
    errEmailOrCode: "আপনার ইমেইল অথবা OC-UF023-এর মতো খেলোয়াড় কোড লিখুন।",
    errLoginCode: "খেলোয়াড় কোড অথবা পাসওয়ার্ড সঠিক নয়। দুটোই পরীক্ষা করে আবার চেষ্টা করুন।",
    password: "পাসওয়ার্ড",
    passwordHint: "কমপক্ষে ৮টি অক্ষর।",
    passwordAgain: "পাসওয়ার্ডটি আবার লিখুন",
    errPasswordMatch: "দুটি পাসওয়ার্ড মিলছে না।",
    show: "দেখান",
    hide: "লুকান",
    newPassword: "নতুন পাসওয়ার্ড",
    btnLogin: "লগ ইন",
    btnSignup: "অ্যাকাউন্ট তৈরি করুন",
    btnGoogle: "Google দিয়ে চালিয়ে যান",
    or: "অথবা",
    forgot: "পাসওয়ার্ড ভুলে গেছেন?",
    btnSendReset: "রিসেট লিংক পাঠান",
    backToLogin: "লগ ইন-এ ফিরে যান",
    resetIntro: "আপনি যে ইমেইল দিয়ে নিবন্ধন করেছেন সেটি লিখুন। আমরা নতুন পাসওয়ার্ড সেট করার জন্য একটি লিংক পাঠাব।",
    resetSent: "এই ইমেইল ঠিকানায় কোনো অ্যাকাউন্ট থাকলে, রিসেট লিংক পাঠানো হয়েছে। আপনার ইনবক্স ও স্প্যাম ফোল্ডার দেখুন।",
    setNewTitle: "নতুন পাসওয়ার্ড সেট করুন",
    btnSetPassword: "নতুন পাসওয়ার্ড সংরক্ষণ করুন",
    passwordUpdated: "পাসওয়ার্ড হালনাগাদ হয়েছে। আপনি লগ ইন করেছেন।",
    checkEmailTitle: "আপনার ইমেইল দেখুন",
    checkEmailBody: "আমরা {email}-এ একটি নিশ্চিতকরণ লিংক পাঠিয়েছি। আপনার অ্যাকাউন্ট তৈরি সম্পন্ন করতে এই ডিভাইস অথবা অন্য যেকোনো ডিভাইসে লিংকটি খুলুন। এতে কয়েক মিনিট লাগতে পারে; স্প্যাম ফোল্ডারও দেখুন।",
    errEmail: "একটি সঠিক ইমেইল ঠিকানা লিখুন।",
    errPassword: "কমপক্ষে ৮টি অক্ষর ব্যবহার করুন।",
    errLogin: "ইমেইল অথবা পাসওয়ার্ড সঠিক নয়, অথবা ইমেইলটি এখনো নিশ্চিত করা হয়নি। নতুন হলে, আগে 'অ্যাকাউন্ট তৈরি করুন' ট্যাব ব্যবহার করুন।",
    emailConfirmed: "আপনার ইমেইল নিশ্চিত করা হয়েছে। চালিয়ে যেতে লগ ইন করুন।",
    linkExpired: "এই লিংকের মেয়াদ শেষ হয়েছে অথবা এটি আগেই ব্যবহার করা হয়েছে। আপনার ইমেইল নিশ্চিত করা থাকলে লগ ইন করুন, অথবা নতুন লিংক পেতে আবার অ্যাকাউন্ট তৈরি করুন।",
    errCaptcha: "অনুগ্রহ করে বোতামের ওপরের যাচাইকরণটি সম্পন্ন করুন (এটি প্রমাণ করে যে আপনি রোবট নন), তারপর আবার চেষ্টা করুন।",
    errRateLimit: "অনেকবার চেষ্টা করা হয়েছে। অনুগ্রহ করে কয়েক মিনিট অপেক্ষা করে আবার চেষ্টা করুন।",
    errExists: "এই ইমেইল দিয়ে ইতিমধ্যে একটি অ্যাকাউন্ট রয়েছে। লগ ইন করার চেষ্টা করুন।",
    consentLabel: "শুরু করার আগে",
    consentTitle: "আপনার সম্মতি",
    consentIntro: "অনুগ্রহ করে নিচের বিষয়গুলো পড়ে সম্মতি দিন। প্রতিটি সম্মতি আপনার স্বাক্ষর হিসেবে আজকের তারিখসহ সংরক্ষিত হবে।",
    agreeTerms: "আমি {terms} পড়েছি এবং এতে সম্মতি দিচ্ছি।",
    agreePrivacy: "আমি {privacy} পড়েছি এবং এতে বর্ণিত পদ্ধতিতে আমার তথ্য সংগ্রহ, ব্যবহার ও সংরক্ষণে সম্মতি দিচ্ছি; এর মধ্যে বাংলাদেশের বাইরে তথ্য সংরক্ষণও অন্তর্ভুক্ত।",
    agreeDob: "আমি আমার পরিচয়পত্রে থাকা জন্মতারিখ অনুযায়ী সঠিক জন্মতারিখ লিখব। আমি বুঝতে পারছি, টুর্নামেন্টে এটি আমার পরিচয়পত্রের সঙ্গে মিলিয়ে দেখা হবে এবং প্রথমবার দেওয়ার পর সর্বোচ্চ ২ বার পরিবর্তন করা যাবে।",
    termsLink: "ব্যবহারের শর্তাবলি",
    privacyLink: "গোপনীয়তা বিজ্ঞপ্তি",
    btnAgree: "সম্মতি দিয়ে এগিয়ে যান",
    consentNeedAll: "এগিয়ে যেতে অনুগ্রহ করে তিনটি ঘরেই টিক দিন।",
    welcome: "স্বাগতম, {name}",
    welcomeNoName: "স্বাগতম",
    codeLabel: "আপনার খেলোয়াড় কোড",
    codePending: "আপনার খেলোয়াড় কোড পেতে নিচে আপনার পুরো নাম যোগ করুন।",
    copy: "কপি করুন",
    copied: "কপি হয়েছে",
    codeLoginTip: "আপনি ইমেইলের পরিবর্তে এই কোড দিয়ে লগ ইন করতে পারবেন।",
    codeChange: "অন্য কোড বেছে নিন",
    codeChangesLeft: "নিচের একটি বেছে নিন অথবা নিজের নম্বর লিখুন। কোড সবসময় OC- এবং আপনার নামের আদ্যক্ষর দিয়ে শুরু হবে। আপনি আরও {n} বার পরিবর্তন করতে পারবেন।",
    codeNoChangesLeft: "আপনি ইতিমধ্যে আপনার কোড দুবার পরিবর্তন করেছেন। নতুন কোডের প্রয়োজন হলে obsidiancup.official@gmail.com-এ ইমেইল করুন।",
    codeOwn: "অথবা নিজের নম্বর লিখুন (৩ বা ৪ অঙ্ক)",
    codeChecking: "যাচাই করা হচ্ছে…",
    codeOk: "{code} ব্যবহার করা যাবে",
    codeCurrent: "এটিই এখন আপনার কোড।",
    codeTaken: "{code} ইতিমধ্যে নেওয়া হয়েছে। অন্য নম্বর চেষ্টা করুন।",
    codeFormat: "৩ বা ৪টি অঙ্ক ব্যবহার করুন।",
    codeSave: "এই কোডটি ব্যবহার করুন",
    codeConfirm: "আপনার খেলোয়াড় কোড {code}-এ পরিবর্তন করবেন? আপনার পুরোনো কোডটি আর কাজ করবে না, এবং এরপর আপনি আরও {n} বার পরিবর্তন করতে পারবেন।",
    codeSaved: "হয়ে গেছে। আপনার খেলোয়াড় কোড এখন {code}।",
    cancel: "বাতিল",
    checklistTitle: "আপনার প্রোফাইল",
    cardEmpty: "নিচে আপনার খেলাধুলার প্রোফাইল পূরণ করুন; আপনার খেলোয়াড় কার্ড নিজে থেকেই তৈরি হবে।",
    cardHeight: "উচ্চতা",
    cardReach: "স্ট্যান্ডিং রিচ",
    cardJump: "লাফ",
    cardHand: "খেলার ধরন",
    cardLevel: "পর্যায়",
    cardSince: "খেলা শুরু",
    cardJersey: "জার্সি নম্বর",
    cardPrivate: "এই কার্ডটি শুধু আপনি ও আয়োজকেরা দেখতে পারবেন। পরে আপনার পাবলিক খেলোয়াড় পেজে এগুলো দেখাতে 'আমার পরিসংখ্যান দেখান' চালু করুন।",
    checkSports: "খেলাধুলার প্রোফাইল: উচ্চতা, পর্যায়, আর খেলার হাত বা শক্তিশালী পা",
    laterTitle: "আপনার প্রথম টুর্নামেন্টের আগে",
    laterIntro: "এখনই কিছু করার নেই। আপনি অথবা আপনার অধিনায়ক কোনো ইভেন্টে দলের নিবন্ধন করলে আমরা নিচের তথ্যগুলো চাইব। কয়েক মিনিটেই সেগুলো পূরণ করতে পারবেন:",
    laterAgreement: "ওই ইভেন্টের সম্মতি ও মিডিয়া ব্যবহারের অনুমতি",
    laterAgreementWhy: "সেই নির্দিষ্ট টুর্নামেন্টের নিয়ম, নিরাপত্তা এবং ছবি ব্যবহারের শর্তাবলি।",
    laterGuardian: "অভিভাবকের সম্মতি",
    laterGuardianWhy: "আপনার বয়স ১৮ বছরের কম হওয়ায় এটি প্রয়োজন। আমরা আপনার অভিভাবককে একটি ব্যক্তিগত লিংক পাঠাব; তিনি নিজেই সেটি পূরণ করবেন।",
    laterId: "আপনার পরিচয়পত্রের ছবি",
    laterIdWhy: "বিভাগ অনুযায়ী আপনার বয়স নিশ্চিত করার জন্য এটি প্রয়োজন। এটি গোপন রাখা হবে এবং ইভেন্টের ৩০ দিন পর মুছে ফেলা হবে।",
    laterTeam: "একটি দলে যোগ দিন",
    laterTeamWhy: "আপনার অধিনায়ক একটি যোগদানের কোড দেবেন, অথবা আমাদের কাছ থেকে অধিনায়ক কোড নিয়ে আপনি একটি দল তৈরি করতে পারবেন।",
    checkConsent: "শর্তাবলি ও গোপনীয়তা বিজ্ঞপ্তিতে সম্মতি দিয়েছেন",
    checkBasics: "মৌলিক তথ্য: নাম, জন্মতারিখ, লিঙ্গ",
    checkContact: "যোগাযোগ ও জরুরি যোগাযোগের তথ্য",
    checkGuardian: "অভিভাবকের সম্মতি (টুর্নামেন্টের আগে প্রয়োজন)",
    checkId: "পরিচয়পত্রের ছবি (টুর্নামেন্টে নিবন্ধনের সময় চাওয়া হবে)",
    soon: "শিগগিরই আসছে",
    done: "সম্পন্ন",
    todo: "বাকি আছে",
    progress: "{done} / {total} সম্পন্ন",
    profileTitle: "আপনার প্রোফাইল",
    autosaveNote: "আপনি টাইপ করার সঙ্গে সঙ্গে সবকিছু স্বয়ংক্রিয়ভাবে সংরক্ষিত হয়।",
    secBasics: "মৌলিক তথ্য",
    secContact: "যোগাযোগ",
    secPositions: "আপনি যে পজিশনগুলোতে খেলেন",
    secEmergency: "জরুরি যোগাযোগ",
    secPrefs: "পছন্দসমূহ",
    secSports: "খেলাধুলার প্রোফাইল",
    heightCm: "উচ্চতা (সেমি)",
    weightKg: "ওজন (কেজি, ঐচ্ছিক)",
    weightHint: "এটি কখনোই জনসমক্ষে দেখানো হবে না। শুধু আপনি ও আয়োজকেরা দেখতে পারবেন।",
    reachCm: "দাঁড়ানো অবস্থায় হাতের নাগাল (সেমি)",
    reachHint: "দেয়ালের পাশে সোজা হয়ে দাঁড়ান, পা মেঝেতে সমান রাখুন, এক হাত যতটা সম্ভব ওপরে তুলুন এবং আঙুলের ডগা পর্যন্ত মাপুন।",
    jumpCm: "ভার্টিক্যাল জাম্প (সেমি)",
    jumpHint: "দাঁড়ানো অবস্থায় হাতের নাগালের তুলনায় লাফ দিয়ে আপনি কতটা বেশি উঁচুতে স্পর্শ করতে পারেন।",
    hand: "খেলার হাত",
    foot: "শক্তিশালী পা",
    sideRight: "ডান",
    sideLeft: "বাম",
    sideBoth: "উভয়ই",
    level: "আপনি সর্বোচ্চ যে পর্যায়ে খেলেছেন",
    levelNew: "একেবারে নতুন",
    levelSchool: "স্কুল বা কলেজ দল",
    levelClub: "ক্লাব দল",
    levelLeague: "লিগ বা ডিভিশন",
    levelNational: "জাতীয় বা বয়সভিত্তিক জাতীয় দল",
    since: "যে বছর খেলা শুরু করেছেন",
    jersey: "পছন্দের জার্সি নম্বর",
    jerseyHint: "০ থেকে ৯৯। চূড়ান্ত নম্বর আপনার দল নির্ধারণ করবে।",
    shirt: "জার্সির মাপ",
    bio: "আপনার সম্পর্কে (সংক্ষেপে)",
    bioHint: "আপনার খেলোয়াড় পেজের জন্য সর্বোচ্চ ২৮০ অক্ষর। উদাহরণস্বরূপ, আপনি কোথায় অনুশীলন করেন অথবা আপনার সবচেয়ে গর্বের ম্যাচের কথা লিখতে পারেন।",
    showStats: "প্লেয়ার পেজ চালু হলে আমার পাবলিক খেলোয়াড় পেজে আমার পরিসংখ্যান দেখান (উচ্চতা, রিচ, লাফ, খেলার হাত ও পা, পর্যায় এবং খেলা শুরুর বছর)। ওজন কখনোই দেখানো হবে না।",
    errHeight: "সেন্টিমিটারে আপনার উচ্চতা লিখুন; ১০০ থেকে ২৫০-এর মধ্যে হতে হবে।",
    errWeight: "২৫ থেকে ২০০ কেজির মধ্যে ওজন লিখুন, অথবা ঘরটি ফাঁকা রাখুন।",
    errReach: "দাঁড়ানো অবস্থায় হাতের নাগাল ১২০ থেকে ৩৫০ সেমির মধ্যে লিখুন।",
    errJump: "৫ থেকে ১৫০ সেমির মধ্যে লাফের উচ্চতা লিখুন।",
    errSince: "১৯৮০ থেকে চলতি বছরের মধ্যে একটি বছর লিখুন।",
    errJersey: "০ থেকে ৯৯-এর মধ্যে একটি নম্বর ব্যবহার করুন।",
    legalName: "পূর্ণ নাম (পরিচয়পত্র অনুযায়ী)",
    displayName: "জনসমক্ষে যে নাম দেখাতে চান",
    displayNameHint: "দলের তালিকা ও আপনার খেলোয়াড় পেজে এই নাম দেখানো হবে। ফাঁকা রাখলে আপনার পূর্ণ নাম ব্যবহার করা হবে।",
    dob: "জন্মতারিখ",
    dobHint: "আপনার পরিচয়পত্রের সঙ্গে হুবহু মিলতে হবে। টুর্নামেন্টে পরিচয়পত্র দেখে আপনার বয়স যাচাই করা হবে।",
    dobChangesLeft: "আপনি আরও {n} বার পরিবর্তন করতে পারবেন।",
    dobNoChangesLeft: "আপনি এটি আর পরিবর্তন করতে পারবেন না। ভুল থাকলে obsidiancup.official@gmail.com-এ ইমেইল করুন।",
    dobConfirmFirst: "{date} কি আপনার জন্মতারিখ হিসেবে সংরক্ষণ করবেন? এটি অবশ্যই আপনার পরিচয়পত্রের সঙ্গে মিলতে হবে। এরপর আপনি এটি মাত্র ২ বার পরিবর্তন করতে পারবেন।",
    dobConfirmChange: "জন্মতারিখ {date}-এ পরিবর্তন করবেন? এরপর আপনি আরও {n} বার পরিবর্তন করতে পারবেন।",
    gender: "লিঙ্গ বিভাগ",
    genderMale: "পুরুষ",
    genderFemale: "নারী",
    genderOther: "অন্যান্য",
    choose: "বেছে নিন…",
    phone: "ফোন নম্বর",
    phoneHint: "প্রথমে দেশ বেছে নিন, তারপর নম্বর লিখুন। + দিয়ে শুরু হওয়া নম্বরও পেস্ট করতে পারবেন।",
    schoolClub: "স্কুল, কলেজ বা ক্লাব",
    instagram: "ইনস্টাগ্রাম হ্যান্ডেল (ঐচ্ছিক)",
    positionsHint: "আপনি যতগুলো পজিশনে খেলেন, সবগুলো বেছে নিতে পারেন। প্রতিটি ইভেন্টে আপনার ভূমিকা আপনার দল নির্ধারণ করবে।",
    emergencyName: "যোগাযোগের ব্যক্তির নাম",
    emergencyRel: "আপনার সঙ্গে সম্পর্ক",
    emergencyPhone: "যোগাযোগের ফোন নম্বর",
    language: "ইমেইলের ভাষা",
    mediaFeature: "প্রচারমূলক পোস্টে, যেমন খেলোয়াড় পরিচিতি ও পোস্টারে, আমাকে আলাদাভাবে তুলে ধরুন। আপনি যেকোনো সময় এই পছন্দ পরিবর্তন করতে পারবেন।",
    mediaFeatureLink: "মিডিয়া ব্যবহারের সম্মতি",
    under13: "আপনার বয়স ১৩ বছরের কম। আরও তথ্য যোগ করতে বা অংশ নিতে হলে অভিভাবকের সম্মতি প্রয়োজন। অভিভাবকের সম্মতির সুবিধা শিগগিরই এখানে চালু হবে।",
    under18: "আপনার বয়স ১৮ বছরের কম। আপনার অ্যাকাউন্ট স্বাভাবিকভাবেই কাজ করবে, তবে টুর্নামেন্টের জন্য কোনো দলে যোগ দেওয়ার আগে অভিভাবকের সম্মতি প্রয়োজন।",
    lockedNote: "আপনার নাম ও জন্মতারিখ যাচাই করে লক করা হয়েছে। পরিবর্তনের জন্য obsidiancup.official@gmail.com-এ ইমেইল করুন।",
    errPhone: "নির্বাচিত দেশের জন্য এই ফোন নম্বরটি সঠিক বলে মনে হচ্ছে না।",
    errInstagram: "শুধু ইংরেজি অক্ষর, সংখ্যা, ডট এবং আন্ডারস্কোর ব্যবহার করা যাবে।",
    errDob: "একটি সঠিক জন্মতারিখ লিখুন।",
    errUnder13Save: "এটি যোগ করার আগে অভিভাবকের সম্মতি প্রয়োজন।",
    errLocked: "যাচাইয়ের পর আপনার নাম ও জন্মতারিখ লক করা হয়েছে।",
    errDobLimit: "আপনি ইতিমধ্যে আপনার জন্মতারিখ দুবার পরিবর্তন করেছেন। পরিবর্তনের জন্য obsidiancup.official@gmail.com-এ ইমেইল করুন।",
    sport_volleyball: "ভলিবল",
    sport_football: "ফুটসাল",
    pos_outside_hitter: "আউটসাইড হিটার",
    pos_setter: "সেটার",
    pos_middle_blocker: "মিডল ব্লকার",
    pos_opposite: "অপোজিট",
    pos_libero: "লিবেরো",
    pos_goalkeeper: "গোলরক্ষক",
    pos_defender: "ডিফেন্ডার",
    pos_winger: "উইঙ্গার",
    pos_pivot: "পিভট",
    legalNoTranslation: "এই নথিটি এখনো বাংলায় পাওয়া যাচ্ছে না, তাই এটি ইংরেজিতে দেখানো হচ্ছে।",
    legalNotFound: "নথিটি পাওয়া যায়নি।",
    legalVersion: "সংস্করণ {version}",
    adminLabel: "আয়োজক",
    adminTitle: "খেলোয়াড়রা",
    adminNoAccess: "এই পেজটি শুধু Obsidian Cup-এর আয়োজকদের জন্য।",
    adminLoginFirst: "প্রথমে আয়োজক অ্যাকাউন্ট দিয়ে লগ ইন করুন।",
    adminSearch: "নাম, কোড, ইমেইল অথবা ফোন নম্বর দিয়ে খুঁজুন",
    adminExport: "CSV ডাউনলোড করুন",
    adminCount: "{n} জন খেলোয়াড়",
    adminVerify: "যাচাই করুন",
    adminUnverify: "বাতিল করুন",
    adminVerified: "যাচাইকৃত",
    colCode: "কোড",
    colName: "নাম",
    colEmail: "ইমেইল",
    colAge: "বয়স",
    colGender: "লিঙ্গ",
    colPhone: "ফোন",
    colJoined: "যোগদানের তারিখ",
    colStatus: "পরিচয়পত্র যাচাই",
    adminEmpty: "এখনো কোনো খেলোয়াড় নেই।",
    adminBackup: "সম্পূর্ণ ব্যাকআপ ডাউনলোড করুন",
    adminBackupNote: "ব্যাকআপ সংরক্ষিত হয়েছে। এটি শুধু আয়োজকদের Google Drive-এ রাখুন; এতে খেলোয়াড়দের ব্যক্তিগত তথ্য রয়েছে।",
    mfaSetupTitle: "দুই-ধাপের লগ ইন সেট আপ করুন",
    mfaSetupIntro: "এই পেজে প্রত্যেক খেলোয়াড়ের ব্যক্তিগত তথ্য দেখা যায়, তাই পাসওয়ার্ডের পর আরও একটি ধাপ প্রয়োজন। একটি অথেনটিকেটর অ্যাপ (Google Authenticator অথবা Microsoft Authenticator) ইনস্টল করুন, এই কোডটি স্ক্যান করুন, তারপর অ্যাপে দেখানো ৬ সংখ্যার কোড লিখুন। নিচের কী-টি নিরাপদ কোথাও (যেমন আপনার পাসওয়ার্ড ম্যানেজারে) সংরক্ষণ করুন, যাতে ফোন হারিয়ে ফেললেও এটি ব্যবহার করতে পারেন।",
    mfaCheckTitle: "দুই-ধাপের লগ ইন",
    mfaCheckIntro: "আপনার অথেনটিকেটর অ্যাপ খুলুন এবং Obsidian Cup-এর জন্য দেখানো ৬ সংখ্যার কোডটি লিখুন।",
    mfaSecretLabel: "স্ক্যান করতে পারছেন না? এর বদলে এই কী-টি অ্যাপে লিখুন:",
    mfaCodeLabel: "অ্যাপ থেকে পাওয়া ৬ সংখ্যার কোড",
    mfaVerify: "চালিয়ে যান",
    mfaWrong: "কোডটি কাজ করেনি। প্রতি ৩০ সেকেন্ডে কোড পরিবর্তিত হয়; সর্বশেষ কোডটি দিয়ে আবার চেষ্টা করুন।",
  },
};

// The organiser's newer full-site Bangla (js/lang-site.js) wins over older entries above.
if (typeof OC_SITE_BN_ACCT !== 'undefined') Object.assign(OC_TEXT.bn, OC_SITE_BN_ACCT);

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

// Busy buttons stay clickable (never greyed out): a second click while busy does nothing.
// A panel that stays beside the page while it scrolls ("sticky"). When the
// panel is taller than the screen it would stay cut off until the very end of
// the page; instead let it scroll up until its last line shows, then hold.
function ocStickyFit(el, top) {
  if (!el || !window.ResizeObserver) return;
  const fit = () => {
    const room = window.innerHeight - top - 16;
    el.style.top = (el.offsetHeight > room ? window.innerHeight - el.offsetHeight - 16 : top) + 'px';
  };
  new ResizeObserver(fit).observe(el);
  window.addEventListener('resize', fit);
  fit();
}

function ocBusy(btn, on) {
  if (!btn) return;
  if (on) { btn.setAttribute('aria-busy', 'true'); btn.dataset.busy = '1'; }
  else { btn.removeAttribute('aria-busy'); delete btn.dataset.busy; }
}
function ocIsBusy(btn) { return !!(btn && btn.dataset.busy); }

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
  if (/sports_required/.test(m)) return t('errSportsRequired');
  // Unknown problem: say so, and show the real reason in small words so it can be reported.
  const reason = (err && (err.message || err.code)) ? String(err.message || err.code).slice(0, 160) : '';
  return reason ? t('genericError') + ' ' + t('errDetail', { reason }) : t('genericError');
}

// A position's name; never shows a raw key like "pos_midfielder".
function ocPositionName(key) {
  const k = 'pos_' + key;
  const v = t(k);
  return v !== k ? v : key.replace(/_/g, ' ').replace(/^./, c => c.toUpperCase());
}

// Live player card: one colour per day (Bangladesh date), the same for every
// player and the organiser page, so gate staff know what today's card looks like.
const OC_CARD_COLOURS = [
  ['ice', '#9fd8e6'], ['mint', '#8fe0b0'], ['amber', '#f2c46b'], ['coral', '#f29a86'],
  ['violet', '#b9a6f2'], ['rose', '#f2a6c9'], ['lime', '#cde67a'],
];
function ocDhakaDate(d) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d || new Date());
}
function ocCardColour(d) {
  const day = ocDhakaDate(d);
  let h = 7;
  for (const ch of day + 'obsidian') h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const [key, hex] = OC_CARD_COLOURS[h % OC_CARD_COLOURS.length];
  return { key, hex, name: t('colour_' + key) };
}
