# MOTD offline backup switch

## Dave's controls

Unlock `/MOTD` with the existing PIN.  If the MiPi has never reported, or its last valid heartbeat is over 7½ minutes old, a red guarded switch appears.

1. Lift the red cover.  This alone does not change garage status.
2. Flip ON to open the garage.
3. Flip OFF to close.  The cover automatically lowers.

Reloading while manually open shows the uncovered ON switch so Dave can close it.  The manual state persists until changed or a valid MiPi report returns.  It has no automatic timeout.  Closing clears attendance and manual counts.  Manual opening enables normal check-ins, WHOIS, MOTD display, and automatic PorkChop presence.

When the MiPi reports again, its physical switch wins, whether OPEN or CLOSED.  The control disappears at the next MOTD poll (5 seconds); the server immediately rejects manual writes while the device is fresh.  Returning device reports discard the old manual setting permanently, so it cannot reappear during the next outage.

A web request failure is not evidence that the MiPi is offline.  If status cannot be confirmed, the control is hidden.  PIN session expiry also hides it.  Failed writes require a fresh status read; the UI does not assume success.

## Implementation and deployment

The existing Attendance Durable Object serializes device updates and authenticated manual changes.  The `garage` table remains the physical heartbeat record.  New `manual_garage` and `garage_clock` tables are created automatically without changing existing table layouts or Wrangler bindings.

GET/PUT `/api/motd/garage` uses existing PIN session, HTTPS, same-origin write protection, and request limits.  PUT accepts explicit OPEN/CLOSED state, never an ambiguous toggle.  Public status, attendance, roster, and headcounts share effective-state resolution.  KV remains a device-write mirror; public status now reads the Durable Object to avoid stale KV overriding device/manual precedence.  Status includes `source`, `deviceAvailable`, and `confirmedAt`; `lastSeen` continues to mean the physical device heartbeat.

Manual state freshness in the viewer uses the last successful server confirmation, not a fabricated physical heartbeat.  No Pi software update or new secret is required.  Deploy the Worker module set together; do not update only worker.js.  Older clients already open may need a reload to understand manual-source freshness.

For rollback, deploy the previous Worker version.  Extra tables are harmless to the old code; old code resumes hardware-only behavior.  If re-enabling this feature after rollback, check the saved manual state before allowing device-free operation.

## Validation

Run all `tests/*.test.mjs` with Node 24 and the Python unit tests.  The fallback test covers authentication, origin checks, missing/stale devices, the exact 450-second boundary, check-in and roster behavior, manual close, returning OPEN and CLOSED devices, and override invalidation.

## Production acceptance — October 23, 2026 (America/Chicago)

Deployed through [PR #15](https://github.com/MiPiGitHub/MiPorkChop/pull/15), merge commit `2f532dc152cf345847e426bca19ddc9c2a2c2e43`.  Matt confirmed both manual ON/OFF actions work and the backup control disappears when the MiPi returns online.  This records user-confirmed production function testing, in addition to the automated checks above.  No Pi software update was needed.
