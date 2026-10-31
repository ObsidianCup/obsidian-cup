# Login email templates

Supabase → Authentication → Emails → Templates. Custom templates need the
custom SMTP sender (Gmail) to be set first on free projects. Paste the whole
file into the message box; set the subject as below.

| Template | Subject | Body file |
| --- | --- | --- |
| Confirm sign up | Confirm your Obsidian Cup account | `confirm-signup.html` |
| Reset password | Reset your Obsidian Cup password | `reset-password.html` |
| Change email address | Confirm your new Obsidian Cup email | `change-email-address.html` |
| Password changed (Security, turn on) | Your Obsidian Cup password was changed | `password-changed.html` |
| Email address changed (Security, turn on) | Your Obsidian Cup email was changed | `email-address-changed.html` |

Not used (leave as they are): Invite user, Magic link or OTP, Reauthentication,
phone, sign-in method and MFA notifications.

When the new logo is ready, replace the `<img src=...logo-mark.png>` line in
every file and paste them again.
