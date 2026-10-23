# On my way and Dave’s message board

These features are staged on `2026HardwareTesting`. They require a merge to
`main` and a successful Cloudflare deployment. No Raspberry Pi update is needed.

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

## One-time Cloudflare configuration before enabling editing

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
```

Use Node 24 or another supported version with `node:sqlite`. After deployment,
confirm on a phone: inbound → arrived, cancel inbound, PIN login (including the
leading zero), preset editing/save, public display, clear, and lock.
