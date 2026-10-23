# GarageMahal QR codes

- `check-in.png`: https://porkchop.mipi.support/check-in
- `check-out.png`: https://porkchop.mipi.support/check-out

Print the check-in image at the entrance and the checkout image near the exit.
Keep the white border intact. These URLs become available after this branch is
merged and Cloudflare deploys successfully; no Raspberry Pi update is needed.

Opening either code automatically performs only its named action and displays a
confirmation. The same browser cookie is used by these pages and the main viewer.
Use the same browser for check-in and checkout; private browsing or a different
browser may represent a different visitor. Check-in requires fresh OPEN status.
Repeat scans do not add duplicates or extend the original six-hour expiry.
Checkout remains available while closed or offline (provided Cloudflare is reachable).
The QR landing GET itself does not change attendance; its script uses the existing
origin-checked POST API. HTTP QR links redirect to HTTPS before any action.

Regenerate images with `python scripts/generate_qr.py` (requires qrcode and Pillow).
