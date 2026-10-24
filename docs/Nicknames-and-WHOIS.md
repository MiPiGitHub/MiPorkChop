# Optional nicknames and Who’s buzzin’?

The main page includes an optional nickname (up to 40 characters), Save nickname, and Forget me. Saving does not check anyone in or extend attendance. Forget me removes the name while leaving current attendance anonymous.

Names are associated with the existing secure browser identity and retained for up to one year after saving. They survive checkout, attendance expiry, and garage closure. A different browser, cleared cookies, or browser privacy cleanup may require re-entry. No accounts or verified identities are involved.

`/WHOIS` (also `/whois`) displays two columns: At the GarageMahal and On the way. The main page links to it as “Who’s buzzin’?” Names are public to anyone with the garage link while attendance is active. The form explains that visibility before saving. Names render as text.

Unnamed visits and Dave’s manual additions appear as unnamed buddies. Duplicate nicknames remain separate visits; names never merge identities. Arrival conversion also works with the existing QR route.

Lists refresh every 15 seconds, hide expired entries locally, and disappear when the garage closes or its heartbeat becomes stale. Network failures show attendance as unconfirmed. No attendance history is added. Expired profiles are removed on subsequent attendance requests.

Icons and Dave’s manual naming controls are deferred.

Release status: nickname/WHOIS shipped in PR #12, followed by the first-time prompt and automatic host in PR #13. Both were confirmed live. For future updates, merge the testing branch into main and verify the Cloudflare deployment. The Durable Object creates the profiles table automatically. No extra secret or Pi update is required.

Validation: run the attendance, qr-action, coming-motd, manual-counts, and nicknames-whois test files under tests with Node 24.


## First-time prompt and automatic host

The first tap on “I’m here” or “On my way” asks for an optional nickname with Save & continue, Skip, and Cancel. Save or Skip is remembered against the browser identity for up to one year. Existing saved nicknames suppress the prompt. Cancel does not submit attendance or remember a choice. Failed attendance actions do not save a new nickname or Skip choice. The optional nickname settings remain available later; Forget me removes the nickname and keeps the choice to stay unnamed.

The check-in QR continues to perform its direct action without a prompt, as originally designed. A later main-page arrival tap can ask for a nickname if the browser has not made a choice.

A fresh OPEN heartbeat automatically includes one host named PorkChop in WHOIS and in checked-in totals. It is derived from garage state, not a browser visit, and never expires while fresh open heartbeats continue. Closing or stale status removes it. MOTD shows the separate host contribution. Dave should not check himself in or add himself manually; there is no reliable identity link between his browser and the automatic host.

Guest check-ins, six-hour expiry, fifteen-minute inbound expiry, and manual additions continue normally. A nickname does not prove identity or merge visitors. Character aliases remain isolated on the experimental branch.

Additional validation: node tests/prompt-host.test.mjs covers the prompt against the real attendance API and the automatic host lifecycle. On October 23, 2026, Matt reported: “Function tested and working well,” following deployment of the prompt and automatic host. This records user functional acceptance; it does not claim exhaustive testing on every browser or device.
