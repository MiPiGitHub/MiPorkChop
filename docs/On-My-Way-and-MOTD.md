# On my way and Dave’s message board

Release source: `main`. These features are deployed; MOTD secret configuration and working editing were confirmed earlier. No Raspberry Pi update is needed for these web features. Verify the active Cloudflare deployment after future releases.

## On my way

- Appears while the GarageMahal has a fresh OPEN status.
- Counts browsers separately from buddies who have arrived.
- Expires 15 minutes after the first tap. Refreshing or repeated requests do not extend it.
- “I’m here” (including the check-in QR page in the same browser) removes that
  browser’s inbound record and starts its normal six-hour check-in.
- “Cancel on my way” removes the inbound record without checking in.
- Checked-in visitors cannot also count as inbound. Closing clears both counts.
- Existing browser-cookie limitations apply: use the same browser on the same device.

## Dave’s editor

Open `https://porkchop.mipi.support/MOTD` (lowercase `/motd` also works).
Enter the four-digit PIN, including any leading zero. Select Football, Soccer,
Darts, Grilling, or Bring Food to fill the text box; edit it or write a message
from scratch, then choose **Save message**. The limit is 280 characters.
**Clear message** removes it. **Lock** ends that browser’s editor session.

The public viewer displays the saved message as plain text only while OPEN.
It refreshes about every 15 seconds. Messages persist across closing/reopening
until Dave edits or clears them; they do not expire at midnight.

## Manual buddy counts and automatic host

MOTD shows Checked in and On the way totals, with editable **Manually added** fields. Each total combines browser attendance and manual additions; Checked in also includes **1 host (PorkChop)** while the garage has a fresh OPEN status.

Enter the number of extra buddies to include, from 0 to 500, and save that category. Zero removes its manual contribution. Editing does not remove browser check-ins. Adjustments require a fresh OPEN status and Dave’s authenticated PIN session.

Manual checked-in counts expire six hours after a changed value is saved; manual inbound counts expire after fifteen minutes. Saving an unchanged value does not renew its expiry. Closing clears both manual counts. Reduce manual additions when a manually counted buddy checks in or arrives, to avoid double counting.

Dave should not check himself in or manually add himself: PorkChop is automatic. The site cannot associate his browser with that host identity. Naming manual additions is a future feature.

For the optional first-time nickname prompt and WHOIS roster, see [Nicknames and WHOIS](Nicknames-and-WHOIS.md).

## One-time Cloudflare configuration (already completed for this deployment)

On the existing `miporkchop-api` Worker, add a **Secret** named `MOTD_PIN` with the
four-digit PIN agreed with Matt. Keep it a string to preserve the leading zero.
Set it under the Worker's Variables and Secrets settings, or use:

```bash
npx wrangler secret put MOTD_PIN
```

Run that from a properly authenticated deployment checkout and enter the PIN at
the private prompt. Do not commit the PIN to `wrangler.jsonc`, HTML, or GitHub.
Secret changes can create a Worker deployment; coordinate this with release.
Until configured, public viewing still works but editing returns “not configured”.

PIN verification occurs inside the existing Attendance Durable Object. Editor
sessions use an eight-hour Secure, HttpOnly, SameSite=Strict cookie. Session
tokens are hashed in storage. Changing the PIN invalidates existing sessions.
Mutations require same-origin requests. Login is limited to five failed attempts
per client in 15 minutes, with a shared ceiling of 100 attempts per window.
Messages are public; only editing is PIN protected. No new Worker or storage
binding is required; additional tables initialize in the existing object.

## Verification

```bash
node scripts/sync-viewer.mjs
node tests/attendance.test.mjs
node tests/qr-action.test.mjs
node tests/coming-motd.test.mjs
node tests/manual-counts.test.mjs
node tests/nicknames-whois.test.mjs
node tests/prompt-host.test.mjs
```

Use Node 24 or another supported version with `node:sqlite`. After deployment,
confirm on a phone: inbound → arrived, cancel inbound, PIN login (including the
leading zero), preset editing/save, public display, clear, and lock.

## Release status and future verification

The initial release, MOTD secret setup, and later manual-count release are complete. Nicknames/WHOIS shipped in PR #12, and the first-time prompt plus automatic PorkChop host shipped in PR #13. The live prompt, API fields, and PorkChop roster entry were checked after deployment. On October 23, 2026, Matt confirmed the latest functionality was tested and working well.

For future changes, use this reusable checklist; it is not a list of outstanding initial setup tasks:

- Run the relevant software checks before merging.
- Merge approved changes into main and verify the live Cloudflare version.
- Check affected flows on a phone: inbound → arrived, nickname Save/Skip, checkout, and current WHOIS lists.
- For editor changes, check PIN login, message save/clear/lock, and manual additions.
- For attendance changes, check expiry, duplicate requests, closure, stale status, and the single automatic host.
- Keep the separate character-alias experiment out of a release unless explicitly approved.

The README remains the deployment task list for enclosure assembly and mounting. This documentation update does not assert those physical steps are complete.
