# MiPorkChop — Garage Mahal Buzzin' Tracker

> **Project status:** 2026 redesign / experimental hobby project  
> **Development branch:** `2026ReSmoked`  
> **Future full-featured release nickname:** Hog Wild  
> **Design baseline:** October 21, 2026

## What is MiPorkChop?

MiPorkChop is a lighthearted, no-charge Raspberry Pi side project for the **Garage Mahal**, a detached garage where friends and community members gather for television, games, darts, and conversation. The garage's host, David Lee, is nicknamed **Pork Chop** by his brothers. When the garage is open for visitors, the familiar message is **“Boys are buzzin'!”**

The goal is to let invited friends check whether the Garage Mahal is open, without requiring David to send individual status texts every time. It is also a learning lab for Raspberry Pi GPIO, Python, GitHub workflows, cloud APIs, web development, and eventually native mobile apps.

This is **not** a MiPi commercial product, supported service, or paid offering. Keep it inexpensive, approachable, and fun.

## Guiding principles

- **Today's design supersedes the 2023 prototype.** Preserve the old work as history, not as the implementation specification.
- **Start simple:** one physical toggle switch, one local green LED, and a basic open/closed status.
- **Free or nearly free:** reuse existing Raspberry Pi hardware and favor services with suitable free tiers; verify limits before choosing a provider.
- **No inbound home-network access:** the Pi initiates outbound HTTPS requests over David's Wi-Fi; no port forwarding required.
- **Privacy first:** the status reveals activity at a private residence. Avoid public discovery; share access intentionally, with lightweight access control as needed.
- **Reliable status:** distinguish an actual CLOSED state from UNKNOWN when the device has stopped checking in.
- **Learn by building:** use branches, commits, pull requests, and documented design decisions.

## Proposed architecture (not yet implemented)

```text
Garage Mahal                                      Cloud
────────────                                      ─────
Physical SPST toggle switch
        │
        ▼
Raspberry Pi GPIO input (candidate: BCM 17)
        │
        ├──► Green LED on separate GPIO output
        │     (local switch-state indication)
        │
        ▼
Python service: debounce, change detection,
retry, logging, periodic heartbeat
        │
        └──────── outbound HTTPS ──────────────► Status API
                                                    │
                                                    ▼
                                               Persistent state
                                                    │
                                                    ▼
                                              Mobile-friendly web
                                              status dashboard
                                                    │
                                                    └──► Future admin
                                                         override for Dave
```

### Hardware — version 0.1

- Reuse an available Raspberry Pi; the 2023 prototype contemplated a Raspberry Pi 4B (2 GB).
- A maintained **single-pole, single-throw (SPST)** toggle switch connected to a GPIO input and ground, using a properly configured internal pull-up.
- Candidate input: **BCM GPIO 17**, inherited from the 2023 prototype; confirm actual wiring before implementation.
- One **green LED**, driven from a separate GPIO output through an appropriate current-limiting resistor. LED ON means the Pi detects the local switch in the “buzzin'” position; OFF means it does not.
- Never connect mains/garage-light voltage directly to GPIO. Automated light/relay sensing is only a possible later enhancement.
- Define the switch polarity, boot behavior, safe wiring, and power-loss behavior during implementation.

### Software and cloud — version 0.2

- A small Python process reads the GPIO input, handles switch bounce, and sends a status update when the state changes.
- A periodic heartbeat lets the cloud know the Pi is alive even if the switch has not moved.
- Retry transient network failures without losing the latest desired state.
- Use authenticated outbound HTTPS to a lightweight endpoint. **Cloudflare Workers plus a persistent store is a candidate, not a finalized provider decision.**
- Keep credentials out of GitHub; use environment variables or another suitable secret-management mechanism.
- Store at least: physical switch state, effective public state, last state-change time, last successful heartbeat, and source of the effective state.
- A stale heartbeat should cause the dashboard to show **UNKNOWN / status unavailable**, not falsely assert OPEN or CLOSED.

### Web dashboard — version 0.3

A mobile-friendly webpage for invited friends, initially showing:

- **GREEN — Boys are buzzin'!** Garage Mahal open.
- **RED — Not buzzin'.** Garage Mahal closed.
- **UNKNOWN — Status unavailable.** Pi/cloud status too old to trust.

Yellow/amber for **Buzzin' Soon** or **Last Call** is a later enhancement. The first dashboard need not be a downloadable phone app.

The host (David) should eventually have an authenticated administrative view to override the public status. **Keep the physical switch state separate from the effective public status**, so the next Pi heartbeat does not erase an intentional override. Override precedence, expiration, and clearing behavior remain design decisions.

### Future enhancements — version 0.4 / Hog Wild

- Yellow **Closing Soon / Last Call** state; the 2023 concept proposed a 30-minute period after switching off.
- Historical statistics, such as hours since the last buzzin', opening frequency, and session duration.
- Optional, opt-in notifications that respect David's practice of inviting people individually without peer pressure.
- Possible progressive web app (PWA) and eventually a **native smartphone app** as a learning milestone. Evaluate app-store requirements and costs later.
- Optional garage-light or relay-based sensing, only with appropriate electrical isolation.

## Development roadmap

| Milestone | Goal | Status |
| --- | --- | --- |
| 0.1 — The Switch | GPIO toggle, green LED, local Python status/logging | Planned |
| 0.2 — The Cloud | Authenticated outbound updates, persistent state, heartbeat | Planned |
| 0.3 — Garage Mahal Dashboard | Mobile web status, then host admin controls | Planned |
| 0.4 — The Extras | Closing soon, history, optional notifications | Planned |
| 1.0 — Hog Wild | Full-featured native smartphone app | Future aspiration |

## Open decisions

1. Which cloud endpoint/database and hosting option meet the low-cost goal?
2. How will invited friends access the dashboard without making the garage status broadly public?
3. What heartbeat interval and stale-status threshold should we use?
4. How should admin overrides expire or be cleared, especially after a physical switch change?
5. Should the initial OFF transition immediately mean CLOSED, or should a 30-minute Last Call state be introduced later?
6. What specific Raspberry Pi, switch, LED, enclosure, and power supply will be used?

## Legacy project (2023)

The original prototype and its README are preserved in [`Legacy/2023/`](Legacy/2023/). It explored a Raspberry Pi 4B, BCM GPIO 17, Python polling, Google Forms as a status relay, and an HTML/JavaScript indicator with a possible yellow closing-soon state.

That prototype is **historical reference only**. Its Google Forms approach is not the planned live architecture, and the old scripts are not assumed production-ready.

## Repository workflow

Work on `2026ReSmoked` while leaving `main` untouched until the redesign is reviewed. Make small commits, review the differences in a pull request, and merge when ready. Preserve the original code in `Legacy/2023/` rather than deleting it.

---

**MiPorkChop: Is Pork Chop buzzin', or isn't he?**
