# Team registration: what-if audit

2 Nov 2026. A stress test of the agreed plan (teams, parent consent, delete account) against the database as it is today and against how established platforms work. Nothing here is built yet.

Labels: **Must** = fix before registration opens. **Should** = worth it for Season 5. **Later** = after Season 5.

## 1. Things that clash with what is already built

| # | Problem | Why it matters | Fix | Label |
| --- | --- | --- | --- | --- |
| 1 | The site may break Vercel's free plan rules. Its guidelines treat "any method of requesting or processing payment from visitors" as commercial use, and the free plan is non-commercial only | Vercel can pause a site, possibly during registration | Move to a host that allows it, or pay for Vercel Pro ($20 a month). The plan notes list Cloudflare Pages as free for commercial use; confirm before moving | Must |
| 2 | One player can be on only one team per event | In Season 4, Fearless Flyers played both U19 and boys open age. If U19 and open age are one event, those players are blocked | Change the rule to one team per category, or make each category its own event | Must |
| 3 | A team takes a slot as soon as it is created | Fake teams could fill a category, against the rule that only paid teams hold a slot | Count only teams with a checked payment | Must |
| 4 | Roster changes lock when a team is submitted, not at the deadline | Does not match the agreed rule | Lock at the deadline | Must |
| 5 | Eligibility is checked only when joining | A player can join, then change date of birth or gender | Recheck at submit and at the deadline; freeze date of birth and gender while on a team | Must |
| 6 | Automatic emails only go to confirmed player accounts, for safety | Parents have no accounts, so their email would never send | Add a narrow exception for the parent template, with a limit per player | Must |
| 7 | Emails go out every 15 minutes, sometimes later | A parent or player may wait and think it failed | Say "this can take up to 30 minutes" on screen, and test sending faster | Should |
| 8 | No tables yet for payments, waitlist, vice-captain, coach, bans or late fee | Needed by the plan | Build them | Must |
| 9 | "Slots are given in order of verified payment" depends on when the organiser taps approve | Unfair: a team that paid first can lose to one checked first | Use the time the transaction ID was entered; checking only confirms it | Must |
| 10 | Waitlisted teams pay, then get refunded if no slot opens | Extra work and refund costs for everyone. Luma charges waitlisted guests only once approved | Waitlisted teams pay only when offered a slot, with 24 hours to pay | Must |

## 2. ID and age

- **Must: school IDs often have no date of birth, and birth certificates have no photo.** Many under-18s have no national ID, so the new rule could shut out younger players. Suggested rule: one ID showing both, or a birth certificate plus a photo ID such as a school card, together.
- **Must: lock gender along with name and date of birth once verified.** Gender decides who can enter girls' categories. Only name and date of birth lock today.
- **Should: rejection reasons.** Blurry, cut off, name differs, not accepted. The player sees the reason and re-uploads, and the captain sees only "ID needs fixing".
- **Should: name mismatch.** Nicknames and spelling differ from ID, so checks compare with the legal name.
- **Should: protest window.** A captain can report a suspected over-age player until a set time, with the organiser checking ID. ID photos are deleted 30 days after the event, so this fits.
- **Must: photo check at the gate.** Someone else could play under a name. The gate list shows the profile photo.
- **Must: age date.** Each category sets a fixed "age counted on" date, so a postponed event does not change who is eligible.
- **Later: expired student IDs.** Decide whether "verified once" lasts for ever or needs refreshing yearly.

## 3. Parent consent

- **Must: the consent page needs Bangla before launch.** A parent cannot give informed consent to English they cannot read. Parent email, consent page and summary come first in the translation.
- **Must: do not show the child's date of birth on the page.** A mistyped email would reveal it to a stranger. Show first name only, and ask the parent to enter the child's birth year as an extra check.
- **Must: "This is not my child" button.** It stops further emails and flags the account. Also a clear "I do not agree".
- **Must: guardian who is not a parent.** Relationship choice includes legal guardian, for orphaned children or a relative with custody.
- **Must: under-18 captain box.** A minor cannot be bound by the captain declaration or payment policy, so the parent ticks an extra box allowing it, and accepts those rules.
- **Must: turning 18.** Parent consent ends at 18, so on next login the player agrees for themselves.
- **Must: withdrawal.** If a parent withdraws, the player is marked not cleared and the captain sees it. Withdrawal after the deadline goes to the organiser.
- **Should: status like the FA system.** "Waiting for parent", resend, "Consent received", and who approved a paper form with the time.
- **Should: wrong email.** Player can correct it while waiting; a limited number of sends; the link stops working once replaced.
- **Should: parent copy.** A copy of what they agreed to, by email.
- **Should: consent asked too late.** Reminders start as soon as a minor joins a team, with extra reminders in the last week.
- **Should: fake parent phone.** Reject the player's own number and any number used by another unrelated account.

## 4. Creating a team and joining

- **Must: who sees the team link page.** Only team name, event and captain's first name, and only after logging in.
- **Must: captain with an unfinished profile.** They finish it first; the site brings them back to the team afterwards.
- **Must: new player from the link.** After sign-up, email confirmation and profile, they return to the same join screen, even on another device.
- **Must: wrong category.** Captain can change category until submitting, if every player still fits; otherwise the site names who does not.
- **Must: squad minimum while liberos are marked.** The site counts 6 players besides liberos, and at most 2 liberos, and shows this live.
- **Must: futsal differs.** No libero, different squad size. All limits come from the category, so the owner needs to set futsal numbers.
- **Must: team link closes on submit.** Captain can reopen before the deadline. This stops strangers joining a finished team.
- **Should: rude or copied team names.** Blocked word list and organiser rename.
- **Should: duplicate jersey numbers.** Blocked already. Add a "number missing" tick before submitting.
- **Should: a player joins the wrong team.** They leave and rejoin before the deadline.
- **Should: coach details.** Must be an adult; captain confirms the coach agreed to share name and phone; coach follows the code of conduct. One coach on the gate list per team, with an optional manager.
- **Later: player search by captain.** Keep it off; it would expose players.

## 5. Leaving, removing and last-minute problems

- **Must: last-minute removal.** A captain could remove someone just before the deadline. The player gets an email, the action is logged, and organisers can restore them within 24 hours after the deadline.
- **Must: hacked captain account.** Every roster change is logged and reversible by organisers.
- **Must: forced captain change.** Handing over needs the new captain to accept. Organisers can do it if the captain disappears.
- **Must: captain under 18 hands to another under-18.** That player needs the captain box from their parent.
- **Should: last player leaves after payment.** Team falls below minimum: the captain is warned, and has until the deadline to refill.
- **Should: after-deadline requests.** One form on the team page goes to an organiser list. Replacements have the same checks as new players.
- **Should: replacements after the deadline.** Owner sets a rule: for example, only for injury, up to a set number, until a set time before the first match.

## 6. Payment

- **Must: exact instructions.** Amount, number, and team reference shown on one screen, with a copy button.
- **Must: wrong transaction ID, wrong amount, part payment.** Organiser rejects with a reason; the captain has 24 hours to fix it.
- **Must: fake screenshots.** Only the organiser's own bKash app counts. Never accept screenshots as proof.
- **Must: two teams, last slot.** Time of entering a real transaction ID decides; the later team moves to the waitlist and is refunded.
- **Must: reused ID.** Unique check, already planned, must be a database rule.
- **Must: payment after a 48-hour release.** Slot may be gone; the team goes on the waitlist or is refunded.
- **Must: mass refund tracker.** If an event is cancelled: a list of teams, number, amount, refunded yes or no, and a CSV.
- **Must: late fee.** The policy mentions a late fee; decide if it exists and when.
- **Should: receipt email.** Team, amount, transaction ID, date.
- **Should: money record.** All fees and refunds per event in a CSV.
- **Should: bank-style matching.** Paste or upload a bKash statement to tick off many payments at once. To be confirmed that the bKash app gives a usable statement.
- **Later: bKash gateway.** Payment confirms itself, but it needs a merchant arrangement with bKash. The public page does not say who qualifies, so this needs asking.

## 7. Dates, delays and changes

- **Must: Bangladesh time everywhere.** All deadlines are stored and shown in Dhaka time, whatever the device.
- **Must: never submitted.** At the deadline, unsubmitted teams are closed, with an email, and data is kept.
- **Must: extension for one team.** Organiser can give one team extra time, logged.
- **Must: postponed event.** Consents, IDs and teams stay; the 7-day withdrawal window starts; everyone gets one email.
- **Must: event full before the deadline.** The site says "waitlist" before anyone creates a team.
- **Should: team check-in.** Like start.gg and Battlefy: 24 to 48 hours before, one captain taps "We are coming". No-shows can be replaced by the waitlist, a rule to agree.
- **Should: hartal or disaster day.** A one-button announcement to all teams and a site banner.

## 8. Match day

- **Must: no internet at the venue.** Export gate lists the night before, as a PDF on a phone and printed.
- **Must: gate staff access.** A limited role seeing only name, photo, team, and cleared or not, not phones or emergency details.
- **Must: injury.** Organisers can reach emergency contact details quickly and offline. Printed sheets are collected and destroyed.
- **Must: under-18 with no consent at the gate.** One rule, written in the handbook: not cleared, does not play.
- **Should: player phone dead.** Gate list and ID are enough. The player card is a convenience.
- **Should: first-aid log.** Record incidents per event, with time and action taken.

## 9. Accounts and deletion

- **Must: no email of their own.** One account per email, so siblings cannot share one. Say this at sign-up.
- **Must: lost email and password.** Organiser recovery with ID, logged.
- **Must: banned players.** No bans exist. Add a ban with event count and reason, and keep it after deletion, or deleting would clear it.
- **Must: delete during a dispute or unpaid refund.** Pause deletion until it is settled.
- **Must: deleted within 14 days and logging back in.** Cancels deletion, with a clear message.
- **Must: under-18 deletion.** Parent gets a notice, and data held for the parent is deleted too.
- **Should: scheduled clean-up.** ID photos, medical notes and inactive accounts deleted by a daily job, not by hand.
- **Should: suspicious login alert.** Email on a password or email change, as banks do.

## 10. Organiser risks

- **Must: only one organiser can run it.** If Uriana is ill or offline during the deadline rush, nothing is checked. Add one or two limited helper roles, each with two-step login: payments, ID checks, gate.
- **Must: authenticator phone lost on deadline day.** Keep recovery steps ready, and a second admin.
- **Must: log every organiser action.** Who approved what and when.
- **Must: backup before each deadline.** Weekly, plus before deadlines and before the event.
- **Must: dry run with 2 or 3 friendly teams,** including an under-18 with a real parent and a test refund.
- **Must: promise only what can be kept.** "Confirmed within 3 days" must fit the people available. For a late rush, consider a promise of 24 hours in the final week.
- **Should: data breach plan.** One page: who to tell, what to switch off, how to reset.
- **Should: safeguarding contact.** A named adult for private concerns, shown in the handbook and consent page. An adult captain with minors on a team makes this more important.

## 11. Worth adding

| Idea | Seen at | Label |
| --- | --- | --- |
| Team progress bar: "9 of 12 ready" | Common in sign-up tools | Should |
| One-tap Remind per player | Team apps | Should |
| Waitlist position shown to the team | Battlefy shows a queue with a cutoff line | Should |
| Waitlisted teams pay only when accepted | Luma | Must |
| Consent status with resend and offline option | The FA's Whole Game System | Must |
| Team check-in before the event | start.gg, Battlefy | Should |
| Shareable "Team confirmed" card for Instagram | Own idea; free marketing | Should |
| Event page with fee, deadline, slots left and countdown | Standard for ticketing sites | Must |
| Public list of confirmed teams | Common at tournaments | Should |
| Reuse last team | Own idea | Should |
| Post-event feedback form, one question | Standard for events | Later |
| Add match to calendar | Standard for ticketing sites | Later |

## Sources

- [Vercel fair use guidelines](https://vercel.com/docs/limits/fair-use-guidelines)
- [FA Whole Game System: how players give consent](https://thefa.com/-/media/cfa/lincolnshirefa/files/leagues-and-clubs/player-reg/how-players-give-consent-to-play.ashx?la=en)
- [Battlefy tournament waitlist](https://help.battlefy.com/en/articles/14454010-how-does-the-tournament-waitlist-work)
- [start.gg online event check-in](https://help.start.gg/en/articles/13766335-online-event-check-in)
- [Luma waitlist](https://help.luma.com/p/waitlist.md)
- [bKash payment gateway terms](https://www.bkash.com/page/tokenized_checkout)
