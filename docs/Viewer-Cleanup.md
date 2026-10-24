# Viewer cleanup

Work branch: `feature/viewer-cleanup`. This branch starts from the current tested application plus the pending documentation updates on `2026HardwareTesting`. Character aliases are not included.

## Preserved production version

`backup/viewer-before-cleanup-2026-10-23` preserves production commit `9a30bbb30f2a165afe933673c5284a63d3c3951b` before the layout changes. It includes the nickname prompt and automatic PorkChop host.

If this design is rejected before release, keep main as-is and discard or revise the feature branch. If it has been released, revert the layout change through a reviewed pull request, or restore only the viewer and its embedded Worker HTML from the backup. Do not reset main to the old branch after unrelated updates; that would also remove those later changes. Keep `src/viewer.html` and its embedded copy in `src/worker.js` synchronized.

## Layout

- Compact status indicator and headline; no repeated OPEN/CLOSED sentence.
- Short open/closed-since time; older dates include month/day to avoid ambiguity.
- Dave’s message directly beneath status, followed by a single attendance row, WHOIS link, and primary I’m here / secondary On my way buttons.
- Nickname settings, home-screen instructions, attendance explanation, and full status diagnostics grouped under collapsed Options & info.
- Closed state shows the rotating invitation; unavailable state hides attendance and messages and prominently shows the last confirmed update.
- Network failures retain the last confirmed timestamp for explanation while marking status unavailable and hiding actions.
- The original pork chop artwork remains, with a shorter card and reduced mobile top spacing. Focus outlines, touch targets, native disclosures, and the nickname dialog are retained.

No attendance rules, Pi code, secrets, or database schema changes are required.

## Validation

All seven Node behavior suites pass, including `tests/viewer-cleanup.test.mjs`, plus balanced HTML and unique-ID checks. The original six suites continue to cover attendance, QR actions, MOTD, manual counts, nicknames, first-use prompt, and host behavior.

Visual browser review is pending: the local preview URL was blocked by the browser’s URL policy. Review the staged layout on phone and desktop before approving production release, including long MOTD text, expanded options, and the nickname dialog.
