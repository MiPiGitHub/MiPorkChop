# MiPorkChop — GarageMahal Buzzin' Tracker

**Development branch:** `2026ReSmoked` · **Updated:** October 22, 2026 · **Status:** Cloudflare viewer deployed and manually exercised; Raspberry Pi hardware integration pending.

MiPorkChop is a hobby project that reports whether the GarageMahal is welcoming visitors. It is **not** part of the standard MiPi build. The 2023 Google Forms prototype remains historical; the active implementation uses Cloudflare Workers and KV.

## Architecture

```text
SPST switch (GPIO17) ──► Raspberry Pi: src/porkchop.py ── HTTPS POST /api/status ──► Cloudflare Worker: src/worker.js
                              │                                                        │
                              └──► Green LED (GPIO27)                            STATUS_KV storage
                                                                                       │
                                                           public browser viewer ◄── GET /api/public-status
```

- **MiButcher.sh:** Optional Raspberry Pi installer/maintenance command. Does not run continuously.
- **systemd/porkchop.service:** Linux service definition; runs `/opt/miporkchop/porkchop.py`.
- **src/porkchop.py:** Reads GPIO, drives LED, reports changes and sends a heartbeat approximately every 60 seconds.
- **src/worker.js:** Runs at Cloudflare, accepts authenticated device writes, stores state in KV, and serves the public viewer and status API.
- **src/viewer.html:** Readable source for the public UI; a copy is embedded in `worker.js` for direct Cloudflare dashboard deployment. **If the viewer changes, update both copies.**

## Definitive state mapping

| Physical GPIO17 switch contacts | GarageMahal state sent to API | Local green LED | Public viewer |
|---|---|---|---|
| CLOSED (grounded; `Button.is_pressed`) | `OPEN` | ON | 🟢 BOYS R BUZZIN' |
| OPEN (internal pull-up) | `CLOSED` | OFF | 🔴 BOYS AIN'T BUZZIN' |
| No fresh heartbeat for over 180 seconds | `UNKNOWN` (computed by Worker) | Not remotely verifiable | ⚪ SERVICE UNAVAILABLE |

API state values are **uppercase and case-sensitive**. They represent **GarageMahal availability**, not electrical contact position.

## Cloudflare configuration and URLs

Current deployed Worker base URL: `https://myporkchop-api.mipigithub.workers.dev/`

- `GET /`: public mobile-friendly viewer; fetches status every 15 seconds and updates elapsed time locally.
- `GET /health`: Worker readiness response.
- `GET /api/public-status`: public, read-only JSON status; stale data returns `UNKNOWN` with `lastSeen`.
- `GET /api/status`: authenticated read with `VIEWER_API_TOKEN` (retained for administrative use).
- `POST /api/status`: authenticated device update with `DEVICE_API_TOKEN`; JSON body `{"state":"OPEN"}` or `{"state":"CLOSED"}`.

Cloudflare requires KV binding `STATUS_KV` and Worker secret `DEVICE_API_TOKEN`; the authenticated GET additionally uses `VIEWER_API_TOKEN`. **Never commit token values to GitHub or embed them in public HTML.** Public viewing is intentional; no login required. KV is eventually consistent.

## Raspberry Pi installation (hardware test pending)

Prerequisite: standard MiPi image/build already completed, Python 3, `gpiozero`, working GPIO access and outbound HTTPS. The optional add-on is isolated under `/opt/miporkchop`, with root-owned credentials at `/etc/miporkchop.env` and systemd unit at `/etc/systemd/system/porkchop.service`.

After checking out branch `2026ReSmoked` on the Pi:

```bash
sudo bash MiButcher.sh install
sudo systemctl status porkchop
# Only after wiring, configuration, and safety checks:
sudo systemctl enable --now porkchop
sudo journalctl -u porkchop -f
```

MiButcher commands: `install`, `update`, `token-update`, `uninstall`. Install prompts for Worker URL and device token if not already configured, then leaves service disabled and stopped. Update requires stopping an active service first. Uninstall preserves credentials.

**Current limitations:** MiButcher's token-update does not yet validate a replacement token or roll back on failure. GPIO service-user permissions and Python dependency availability must be verified on the actual Pi. Software tests and deployment pipeline status have not yet been independently confirmed. Do not assume unattended production readiness.

## Test record and next steps

**Manually observed October 22, 2026:** Cloudflare viewer loads; public status endpoint returned `UNKNOWN` / stale heartbeat; authenticated curl posts of `OPEN` displayed green and `CLOSED` displayed red. This confirms the cloud/viewer state convention, **not** the physical GPIO behavior.

**Tomorrow's Pi test:** verify correct physical wiring and LED resistor; install MiButcher; check service account/GPIO permissions; close switch → LED ON / API `OPEN` / green viewer; open switch → LED OFF / API `CLOSED` / red viewer; reboot; terminate service; disconnect network; wait >3 minutes and confirm `UNKNOWN`; verify service logs and token secrecy.

**Future improvements:** validate token before replacement, add installer rollback, run CI checks, consolidate viewer source into a reproducible Cloudflare deployment, consider rate limiting and more robust status freshness handling. No incoming connections or port forwarding to the Raspberry Pi are needed.
