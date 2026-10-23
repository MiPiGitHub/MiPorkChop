# MiPorkChop — Raspberry Pi Installation and Operations
Updated: October 23, 2026

This guide covers the optional MiPorkChop application on a Raspberry Pi with the existing MiPi build. Use `main` for installation and updates. Enhancements remain on `2026HardwareTesting` until deliberately merged.

The Pi reads the physical switch and reports to Cloudflare. MiButcher installs and updates the Pi application. The Cloudflare Worker serves the website and manages attendance.

## 1. Before installation

Have the following ready:

- Raspberry Pi 4B with the completed MiPi image/build, Internet access, terminal access and sudo.
- Git and Python 3; GPIO Zero and a working GPIO backend for the installed OS.
- Cloudflare already deployed with its status storage, attendance binding and device API secret.
- The value of Cloudflare's `DEVICE_API_TOKEN` available privately.
- GPIO17 and GPIO27 free for MiPorkChop.

Run these checks on the Pi:

```bash
git --version
/usr/bin/python3 -c "import gpiozero; print('GPIO Zero is ready')"
```

If either command fails, install the missing dependency using the package procedure for your Pi image before continuing. MiButcher checks GPIO Zero but does not install it.

With Pi power disconnected, wire the switch between GPIO17 (physical pin 11) and GND (physical pin 9). For the indicator, wire GPIO27 (physical pin 13) through a 330-ohm resistor to the LED anode; connect the LED cathode to GND (physical pin 14). See [the wiring guide](hardware/wiring.md).

The LED circuit can remain disconnected during initial testing. Never connect an LED without its resistor or apply external voltage to the switch input.

## 2. Download main

Run as the normal Pi login user, not root:

```bash
cd "$HOME"
git clone --branch main https://github.com/MiPiGitHub/MiPorkChop.git MiPorkChop
cd "$HOME/MiPorkChop"
git branch --show-current
git log -1 --oneline
```

Expected branch: `main`. If this directory already exists, use the update procedure below instead of cloning over it. If access requires authentication, use your configured GitHub credentials; the Cloudflare device token is not a GitHub credential.

This guide assumes the checkout is `$HOME/MiPorkChop`. Substitute your actual checkout path if different. A downloaded ZIP is not a Git checkout and cannot use `git pull`; create a separate Git checkout for future updates.

## 3. Install MiPorkChop

From the repository directory:

```bash
bash -n MiButcher.sh
/usr/bin/python3 -m py_compile src/porkchop.py
sudo bash MiButcher.sh install
```

At the installer prompts, enter:

| Prompt | Value |
|---|---|
| Cloudflare Worker HTTPS base URL | `https://porkchop.mipi.support` |
| Device API token | The existing Cloudflare `DEVICE_API_TOKEN` value |

Enter the base URL without `/api/status`. The token is entered invisibly. Do not put it in GitHub, chat or screenshots.

The installer creates the `miporkchop` service account and adds it to the `gpio` group if that group exists. It installs:

| Item | Location |
|---|---|
| Running Python application | `/opt/miporkchop/porkchop.py` |
| Root-only URL/token configuration | `/etc/miporkchop.env` |
| systemd service definition | `/etc/systemd/system/porkchop.service` |
| Writable runtime directory, created at service start | `/run/miporkchop` |

On a fresh installation, the service is not started and autostart is disabled. Use `update` for an existing installation: rerunning `install` disables autostart and does not explicitly stop an already-running service.

Existing configuration is preserved. MiButcher does not install the Cloudflare Worker on the Pi.

## 4. Start and verify

With the switch contacts open (wires separated):

```bash
sudo systemctl start porkchop
systemctl is-active porkchop
sudo systemctl status porkchop --no-pager -l
sudo journalctl -u porkchop -n 30 --no-pager
```

Expected: `active` and a log entry such as `Reported GarageMahal state CLOSED`.

Open https://porkchop.mipi.support/ using HTTPS.

| Switch contacts | Reported state | Viewer |
|---|---|---|
| Open / separated | CLOSED | Red — BOYS AIN'T BUZZIN' |
| Closed / connected | OPEN | Green — BOYS R BUZZIN' |

The Pi reports changes and sends a heartbeat about every 150 seconds. The viewer polls every 15 seconds; allow additional time for network/storage propagation.

## 5. Service command reference

| Task | Command |
|---|---|
| Start now | `sudo systemctl start porkchop` |
| Stop now | `sudo systemctl stop porkchop` |
| Restart now | `sudo systemctl restart porkchop` |
| Show detailed status | `sudo systemctl status porkchop --no-pager -l` |
| Check running state | `systemctl is-active porkchop` |
| Enable startup at boot | `sudo systemctl enable porkchop` |
| Enable startup and start now | `sudo systemctl enable --now porkchop` |
| Disable startup at boot | `sudo systemctl disable porkchop` |
| Disable startup and stop now | `sudo systemctl disable --now porkchop` |
| Check startup setting | `systemctl is-enabled porkchop` |
| Recent logs | `sudo journalctl -u porkchop -n 50 --no-pager` |
| Follow live logs | `sudo journalctl -u porkchop -f` |

Press Ctrl+C to stop following logs; that does not stop MiPorkChop.

`start` and `stop` affect the current session. `enable` and `disable` affect future boots unless combined with `--now`. A stopped service may therefore start again after reboot if still enabled. A disabled service may still be running.

## 6. Enable autostart and test reboot

After the first tests pass:

```bash
sudo systemctl enable porkchop
systemctl is-enabled porkchop
```

Expected: `enabled`.

When ready to interrupt the Pi and any other services it runs:

```bash
sudo reboot
```

Reconnect after boot and check:

```bash
systemctl is-enabled porkchop
systemctl is-active porkchop
sudo journalctl -u porkchop -b -n 30 --no-pager
```

Expected: `enabled`, `active`, and a successful state report. Confirm the website matches the actual switch.

## 7. Fetch and install changes from main

Git downloads source files into the checkout. MiButcher copies those files into the installed application. A Git pull alone does not update `/opt/miporkchop`, and merging GitHub changes does not automatically update the Pi.

Run the following blocks in order. Stop if any command fails; do not continue into installation after a Git error.

### A. Inspect and fetch while the service is still running

```bash
cd "$HOME/MiPorkChop"
git status --short
git branch --show-current
git fetch origin
```

`git status --short` should show no changes. If it lists local edits or untracked files, preserve/review them before switching branches or updating. Do not discard them with a hard reset.

### B. Select main and update the checkout

If local `main` already exists:

```bash
git switch main
git pull --ff-only origin main
git log -1 --oneline
```

If the checkout was created with `--single-branch` on the hardware-testing branch and has no local `main`, use this sequence instead:

```bash
git fetch origin refs/heads/main:refs/remotes/origin/main
git switch --create main --track origin/main
git pull --ff-only origin main
git log -1 --oneline
```

If Git reports divergent history or refuses a fast-forward, stop and review the local changes. Do not force the update.

These commands retrieve the latest commits on `main`, not necessarily a tagged GitHub Release. Testing-branch features are not included until merged.

### C. Preflight, stop, and install

```bash
bash -n MiButcher.sh
/usr/bin/python3 -m py_compile src/porkchop.py
/usr/bin/python3 -c "import gpiozero"
systemctl is-enabled porkchop
sudo systemctl stop porkchop
sudo bash MiButcher.sh update
```

MiButcher refuses to update while the service is active. It preserves the URL and device token, copies the Python application and service file, and reloads systemd. It does not start the service or change its autostart setting.

If the update fails, leave the service stopped, record the error and resolve it before proceeding. The installer has no automatic rollback.

### D. Start and confirm

```bash
sudo systemctl start porkchop
systemctl is-active porkchop
systemctl is-enabled porkchop
sudo journalctl -u porkchop --since "2 minutes ago" --no-pager -n 30
```

Confirm successful reports and the correct website state. If startup should be enabled but is not:

```bash
sudo systemctl enable porkchop
```

Local edits made directly to `/opt/miporkchop/porkchop.py` are overwritten by an update. Carry intended fixes into GitHub first. Existing systemd drop-ins under `/etc/systemd/system/porkchop.service.d/` remain in effect; inspect them with `sudo systemctl cat porkchop` if behavior differs from the repository service.

## 8. Which changes need a Pi update?

| Change | Action |
|---|---|
| `src/porkchop.py` or `systemd/porkchop.service` | Fetch main, run MiButcher update, start and verify |
| `MiButcher.sh` | Fetch main to obtain the new installer; run its relevant command when needed |
| Cloudflare Worker, viewer, attendance or QR pages | Merge approved changes to main, confirm Cloudflare deployment is Ready, then refresh the browser |
| Documentation or printable QR images | Fetch/download when needed; no Pi service restart |

Cloudflare GitHub Builds is connected to `main`. A successful merge starts a cloud deployment; it does not prove that deployment has finished. The Pi currently has no scheduled automatic updater.

## 9. Troubleshooting and checks

### Service fails or keeps restarting

```bash
sudo systemctl stop porkchop
sudo journalctl -u porkchop -b -n 60 --no-pager
sudo systemctl cat porkchop
id miporkchop
```

Current main includes `RuntimeDirectory=miporkchop` and `WorkingDirectory=/run/miporkchop`, fixing the GPIO notification-pipe permission issue observed during hardware testing. Do not make the application directory world-writable.

Current main also sends `User-Agent: MiPorkChop/0.3`, which resolved the observed Python HTTP 403 failure. A general delivery error does not by itself mean the device token is wrong.

### Verify cloud reachability

```bash
curl -fsS https://porkchop.mipi.support/health
```

This checks that the Worker responds; it does not validate the saved device token or prove the Pi is reporting.

### Replace the saved device token

From the checkout:

```bash
sudo bash MiButcher.sh token-update
```

This changes the local token only; it does not change Cloudflare's secret. MiButcher does not validate the replacement before saving it. If the service was running, it restarts it. Verify successful reporting afterward. Do not display `/etc/miporkchop.env` when sharing a screen.

### Test stale status

Stop the service and wait until more than 7 minutes 30 seconds have elapsed since the last confirmed heartbeat, plus viewer refresh time. Expect SERVICE UNAVAILABLE. The attendance button should be hidden. Restart the service and confirm recovery.

## 10. Recorded hardware-test status

Based on the October 22–23 session:

- Switch transitions in both directions and periodic heartbeat reporting passed.
- Stale status changed to SERVICE UNAVAILABLE.
- Check-in worked independently on laptop, iPad and phone using HTTPS.
- Closing the GarageMahal cleared attendance and hid the check-in button.
- Autostart was enabled and `is-enabled` returned `enabled`; a subsequent boot still needs verification.
- Specifically hiding the attendance button during unavailable status still needs explicit visual confirmation.
- LED and resistor installation/testing remain pending.
- QR actions have local software tests; physical phone scanning against the deployed routes awaits merge/deployment.

This guide supersedes the older installation/test-status notes in root `INSTALL.txt` for these operations.
