# Optional nicknames and Who’s buzzin’?

The main page includes an optional nickname (up to 40 characters), Save nickname, and Forget me. Saving does not check anyone in or extend attendance. Forget me removes the name while leaving current attendance anonymous.

Names are associated with the existing secure browser identity and retained for up to one year after saving. They survive checkout, attendance expiry, and garage closure. A different browser, cleared cookies, or browser privacy cleanup may require re-entry. No accounts or verified identities are involved.

`/WHOIS` (also `/whois`) displays two columns: At the GarageMahal and On the way. The main page links to it as “Who’s buzzin’?” Names are public to anyone with the garage link while attendance is active. The form explains that visibility before saving. Names render as text.

Unnamed visits and Dave’s manual additions appear as unnamed buddies. Duplicate nicknames remain separate visits; names never merge identities. Arrival conversion also works with the existing QR route.

Lists refresh every 15 seconds, hide expired entries locally, and disappear when the garage closes or its heartbeat becomes stale. Network failures show attendance as unconfirmed. No attendance history is added. Expired profiles are removed on subsequent attendance requests.

Icons and Dave’s manual naming controls are deferred.

Deployment: merge the testing branch into main and let Cloudflare deploy. The Durable Object creates the profiles table automatically. No extra secret or Pi update is required.

Validation: run the attendance, qr-action, coming-motd, manual-counts, and nicknames-whois test files under tests with Node 24.
