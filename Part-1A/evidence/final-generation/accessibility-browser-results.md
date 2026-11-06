# Accessibility and Browser Verification

## Run information

- Date/time (UTC): 2026-11-06 (time not captured)
- Implementation reference: Uncommitted working tree; no commit is available.
- Tester: One automated walkthrough in the integrated browser; not a representative staff participant.
- Application URL: `http://127.0.0.1:5173/#/new`
- Accessibility tool/screen reader: Chromium accessibility snapshot and keyboard input; no screen reader was available.
- WCAG target: 2.2 Level AA

## Browser and viewport matrix

| Browser/device | Version | Viewport CSS px | Create ticket | Queue/filter | Status update | Horizontal overflow | Result/defects |
|---|---|---:|---|---|---|---|---|
| Chromium desktop | 150.0.7871.250 (Electron 43.8.3) | 1,280 × 800 | Not completed | Not completed | Not completed | No | Page rendered; API request did not settle in the integrated browser. |
| Chromium narrow | 150.0.7871.250 (Electron 43.8.3) | 320 × 800 | Not completed | Not completed | Not completed | No | `scrollWidth` and `clientWidth` were both 320. |
| Chromium desktop wide | 150.0.7871.250 (Electron 43.8.3) | 1,920 × 800 | Not completed | Not completed | Not completed | No | `scrollWidth` and `clientWidth` were both 1,920. |
| Safari desktop | Not available | 1,280 × 800 | Not run | Not run | Not run | Not evaluated | Browser unavailable. |
| Safari on iOS | Not available | 320 × 800 | Not run | Not run | Not run | Not evaluated | Device/browser unavailable. |
| Chrome on Android | Not available | 360 × 800 | Not run | Not run | Not run | Not evaluated | Device/browser unavailable. |
| Firefox desktop | Not available | 1,280 × 800 | Not run | Not run | Not run | Not evaluated | Browser unavailable. |
| Edge desktop | Not available | 1,280 × 800 | Not run | Not run | Not run | Not evaluated | Browser unavailable. |

## Keyboard and assistive-technology checks

| Check | Expected result | Observed result | Status |
|---|---|---|---|
| Skip link and landmark navigation | Main content can be reached without pointer use | First Tab focused the “Skip to content” link (`#main-content`). | Partial |
| Focus order and visible focus | Focus is visible and follows the workflow | Only the first keyboard target was checked. | Partial |
| Form labels and validation | Controls have labels; invalid input is announced and actionable | Labels are present in the accessibility snapshot; validation workflow not exercised. | Partial |
| Queue filters and actions | All controls operate by keyboard with understandable names | Not exercised. | Not evaluated |
| Confirmation dialogs | Focus is managed; Escape/cancel does not submit a mutation | Not exercised. | Not evaluated |
| Screen-reader announcements | Loading, errors, and result changes are announced | No screen reader was available. | Not evaluated |
| Text and control contrast | Meets WCAG 2.2 AA contrast criteria | No contrast evaluation was performed. | Not evaluated |

## Representative-staff usability

The success criteria require 10 representative staff. Record each participant's
anonymized identifier, ticket-submission time, ticket-location time, assistance,
and observations. Do not invent participant results.

| Participant | Submit time (<120 s) | Locate time (<60 s) | Assistance/defects |
|---|---:|---:|---|
| P01 | | | |
| P02 | | | |
| P03 | | | |
| P04 | | | |
| P05 | | | |
| P06 | | | |
| P07 | | | |
| P08 | | | |
| P09 | | | |
| P10 | | | |

## Findings and limitations

- WCAG 2.2 AA evaluation: **PENDING**; this partial viewport/keyboard check is not a conformance evaluation.
- Critical/high-impact defects: None observed in the checks that ran; workflows were not fully exercised.
- API limitation: the integrated browser remained on “Loading departments…” and its lookup request did not settle. Shell `curl` requests to both the backend and Vite proxy returned HTTP 200 with an empty catalog. No local lookup records were provisioned.
- Browser/device coverage unavailable: Safari, Firefox, Edge, iOS Safari, and Android Chrome.
- Representative-staff evaluation: **NOT RUN**; 0 of 10 participants were available. Do not treat the automated browser walkthrough as SC-001/SC-002 evidence.
- T057 remains pending until the browser matrix, assistive-technology review, and 10-person usability evaluation are completed.

## Additional Chromium workflow verification

- Date: 2026-11-06 (UTC; exact browser-session time not captured).
- Browser: Chrome 150.0.7871.250 in Electron 43.8.3 on macOS, integrated VS Code browser.
- Tester: One automated walkthrough using accessible role/name locators and keyboard input; not a representative staff participant.
- Test data: Synthetic ticket `TKT-6AED4617BE3457B5BF578238`, titled `[QA] convergence walkthrough 20261106T0840`.
- Catalog: Development departments and staff lookup endpoints returned HTTP 200 through both the backend and Vite proxy.

| Workflow/check | Observed result |
|---|---|
| Ticket intake | Created the synthetic ticket with IT department and High priority; it appeared Open, unassigned, in the Open queue. |
| Combined filters and empty state | Open + High returned two tickets, including the test ticket. Open + Archived returned zero and showed “No matching tickets”; Clear filters restored the three-ticket Open list. |
| Assignment and work status | Assigned the test ticket to active support staff Alex Morgan, started work, and verified In Progress in Assigned. |
| Resolution and closure | Saved a resolution note and resolved the ticket. Canceling close left it Resolved; confirming close changed it to Closed and made the note read-only. |
| Archive confirmation and retention | Canceling archive left it Closed; confirming archive moved it to Archived. The Archived queue contained the ticket and its resolution note remained visible after revisiting the detail route. |
| Responsive viewport sampling | On `/new`, `/open`, `/assigned`, `/archived`, and the test ticket detail route, document width equaled viewport width at 320, 1,280, and 1,920 CSS pixels (15 route/viewport samples; no horizontal page overflow observed). |
| Keyboard/skip link | Initially, activating “Skip to content” changed the application route to Page not found. The link was corrected to focus the main landmark without changing the route; retest confirmed the first Tab reached the skip link, Enter focused `main#main-content`, and the Create a ticket page remained visible. |
| Focus and semantics | The focused form control displayed a solid focus outline. The intake fields had labels, and the page exposed one main landmark and a named Ticket views navigation landmark. |

The skip-link defect was fixed in `src/frontend/src/app/App.tsx`; a regression test was added to `tests/unit/frontend/ticket-intake.test.tsx`. The focused frontend suite passed (16 tests), and the post-fix mandatory harness passed (74 unit tests, 10 API contract tests, 2 MongoDB integration tests, 100% critical branches, and 100/100 performance actions under 2 seconds; p95 13.46 ms). See `../harness-results/harness-20261106T031947Z-66b3c540.json` and `../harness-log.md`.

This is a successful Chromium smoke walkthrough, not the complete required evaluation. Safari, Firefox, Edge, iOS Safari, Android Chrome, a screen reader, a formal WCAG 2.2 AA audit, and the 10-person usability study remain unavailable and pending. SC-001/SC-002 participant timings must not be inferred from this automated run. T057 and T066 remain pending.
