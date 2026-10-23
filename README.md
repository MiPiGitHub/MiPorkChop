# MiPorkChop — GarageMahal Buzzin' Tracker

**Baseline branch:** `main` · **Hardware testing branch:** `2026HardwareTesting` · **Updated:** October 23, 2026 · **Status:** Software and service are working, as confirmed by Matt. Final enclosure assembly and mounting remain.

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
- **src/porkchop.py:** Reads GPIO, drives LED, reports changes and sends a heartbeat approximately every 150 seconds.
- **src/worker.js:** Runs at Cloudflare, accepts authenticated device writes, stores state in KV, and serves the public viewer and status API.
- **src/viewer.html:** Readable source for the public UI; a copy is embedded in `worker.js` for direct Cloudflare dashboard deployment. **If the viewer changes, update both copies.**

## Definitive state mapping

| Physical GPIO17 switch contacts | GarageMahal state sent to API | Local green LED | Public viewer |
|---|---|---|---|
| CLOSED (grounded; `Button.is_pressed`) | `OPEN` | ON | 🟢 BOYS R BUZZIN' |
| OPEN (internal pull-up) | `CLOSED` | OFF | 🔴 BOYS AIN'T BUZZIN' |
| No fresh heartbeat for over 450 seconds | `UNKNOWN` (computed by Worker) | Not remotely verifiable | ⚪ SERVICE UNAVAILABLE |

API state values are **uppercase and case-sensitive**. They represent **GarageMahal availability**, not electrical contact position.

## Cloudflare configuration and URLs

**Preferred public URL:** `https://porkchop.mipi.support/` (Cloudflare DNS and Worker custom domain; user-confirmed working).

**Direct Worker fallback:** `https://miporkchop-api.mipigithub.workers.dev/` (use for troubleshooting if custom DNS or routing fails).

- `GET /`: public mobile-friendly viewer; fetches status every 15 seconds and updates elapsed time locally.
- `GET /health`: Worker readiness response.
- `GET /api/public-status`: public, read-only JSON status; stale data returns `UNKNOWN` with `lastSeen`.
- `GET /api/status`: authenticated read with `VIEWER_API_TOKEN` (retained for administrative use).
- `POST /api/status`: authenticated device update with `DEVICE_API_TOKEN`; JSON body `{"state":"OPEN"}` or `{"state":"CLOSED"}`.

Cloudflare requires KV binding `STATUS_KV` and Worker secret `DEVICE_API_TOKEN`; the authenticated GET additionally uses `VIEWER_API_TOKEN`. **Never commit token values to GitHub or embed them in public HTML.** Public viewing is intentional; no login required. KV is eventually consistent.

## Raspberry Pi installation

Prerequisite: standard MiPi image/build already completed, Python 3, `gpiozero`, working GPIO access and outbound HTTPS. The optional add-on is isolated under `/opt/miporkchop`, with root-owned credentials at `/etc/miporkchop.env` and systemd unit at `/etc/systemd/system/porkchop.service`.

After checking out branch `2026HardwareTesting` on the Pi (or `main` for the merged baseline):

```bash
sudo bash MiButcher.sh install
sudo systemctl status porkchop
# Only after wiring, configuration, and safety checks:
sudo systemctl enable --now porkchop
sudo journalctl -u porkchop -f
```

MiButcher commands: `install`, `update`, `token-update`, `uninstall`. Install prompts for Worker URL and device token if not already configured, then leaves service disabled and stopped. Update requires stopping an active service first. Uninstall preserves credentials.

For installation, service start/stop, automatic startup, and fetching updates from `main`, see [Pi Installation and Operations](docs/Pi-Installation-and-Operations.md).

## Current status and next steps

Matt confirmed the software is working, including the public viewer, QR check-in/check-out, On my way, and Dave's PIN-protected message board.

The remaining deployment steps are:

- [ ] Install the switch and LED (with its current-limiting resistor) in the project box.
- [ ] Mount the completed kit in the GarageMahal.

Additional feature ideas are optional future enhancements, not requirements for completing this deployment.

October 22, 2026 decision: heartbeat every 150 seconds (approximately 576 KV writes/day), stale status after 450 seconds (7.5 minutes). Switch changes are reported immediately. Cloudflare GitHub Builds is connected to `main`; deployments are triggered by commits to `main`. Check Cloudflare Deployments for the active version.
