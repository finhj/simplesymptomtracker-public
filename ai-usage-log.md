# Care Log — AI Usage Log

An open record of what Claude was used for on this project, and what it wasn't. Kept for
transparency, since this is an open-source health app — anyone should be able to see exactly
where AI was involved.

**Standing boundary:** Claude does not write final prose intended to read as the user's own voice
(marketing copy, the "why I built this" story, emails, etc.). Outlines and brainstorming are fine —
the actual writing is the user's.

---

## Log

| Date | Item | Type | Notes |
|---|---|---|---|
| 2026-08-08 | Product feature brainstorm | Brainstorm | Multi-symptom tracker concept, monetization ideas |
| 2026-08-08 | Data model design | Design | TypeScript interface sketches: Profile, Household, TrackerDefinition, IllnessTemplate, Entry, MedicationCatalogItem/Entry, Episode, StorageConfig, Entitlement, PhysicianShare, AuditEvent |
| 2026-08-08 | Security plan | Design | Local encryption approach, E2E cloud sync approach, token generation requirements, human-review cadence |
| 2026-08-08 | CI security tooling | Code (config) | `.github/dependabot.yml`, `.github/workflows/security-scan.yml` — drafted, not yet added to a real repo |
| 2026-08-08 | Data model extensions | Design | InstitutionalLicense/ProviderCode (enterprise licensing), UnitPreferences (international units) |
| 2026-08-08 | Core prototype | Code | `care-log-prototype.jsx` — passcode-derived AES-GCM local encryption, lock screen, template-driven tracker picker, medication log, on-device text report |
| 2026-08-08 | Earlier fever-tracker artifacts | Code | `fever-tracker.jsx` (with medication overlay), `storage-diagnostic.jsx` — predate the Care Log rename, same underlying build |
| 2026-08-08 | Marketing plan structure | Outline | Channel/positioning outline only — no final copy drafted, per standing boundary |
| 2026-08-08 | Demographics/units/backup decisions | Design | Profile demographic fields, unit conversion approach, backup/export design, cloud retention policy |
| 2026-08-08 | Care Log prototype build-out | Code | `care-log-prototype.jsx`: units, demographics setup step, encrypted backup/restore, fixed a silent-hang bug in profile setup, fixed sparkline y-axis (no labels → labeled) |
| 2026-08-08 | GitHub repo setup support | Support | Walked through GitHub Pages setup, `.github` folder path handling, pasted YAML content directly for phone copy-paste limitations |
| 2026-08-08 | Standalone build | Code | `care-log-standalone.html` — ported from the prototype: `window.storage` → `LocalStore` (real `localStorage`), lucide-react → inline SVG icons, no-build CDN script tags |
| 2026-08-08 | PWA scaffolding | Code | `manifest.json`, `sw.js`, three generated app icons (`icon-192.png`, `icon-512.png`, `icon-maskable-512.png`), install/offline wiring in the HTML head |
| 2026-08-08 | Sparkline y-scale fix | Code | Added visible min/max/fever-line labels to the chart; passed real `scaleMax` per tracker instead of assuming 5 |
| 2026-08-08 | Setup-profile bug fix | Code | `handleSaveProfile` was an unawaited async IIFE with no error handling — silently hung with no error message on failure; rewrote as a proper async function |
| 2026-08-08 | Medication same-time grouping | Code | Added `groupMedsByDisplayTime` — meds logged at the same minute now render as one comma-separated line instead of duplicate timestamps, applied to the report and the medication list |
| 2026-08-08 | Medication chart overlay (v1, later reworked) | Code | Ported diagonal medication labels from the earlier fever-tracker.jsx design into the new lightweight Sparkline |
| 2026-08-08 | Shared chart time domain | Code | All tracker charts + medication markers now plot on one synchronized timeline instead of each computing its own window |
| 2026-08-08 | Root cause: Babel 8 breaking change | Debug/Code | Diagnosed a blank standalone page via user-pasted raw CDN responses — unpinned `@babel/standalone` silently resolved to Babel 8, whose default JSX runtime changed to "automatic" and fails with no bundler; pinned to `@babel/standalone@7` in both the HTML and `sw.js`, bumped cache name |
| 2026-08-08 | Custom-time logging | Code | "Log for a different time" toggle added to tracker quick-log and the medication form — defaults to now, optional datetime override |
| 2026-08-08 | Editable/deletable history | Code | Full edit (value + timestamp) and delete for symptom entries via a per-tracker History list; medications got the same treatment (name, dose, timestamp editable, not just delete) |
| 2026-08-08 | Medication chart legibility iterations | Code | Several rounds: larger font, gentler angle, halo-behind-text technique, `overflow: visible` fix for edge-clipping, ultimately removed on-chart text entirely in favor of bullets + a tap-to-expand "Medications in view" list, after repeated overlap/cutoff/hard-to-read reports |
| 2026-08-08 | Pinch-zoom / pan + range presets | Code | Touch-gesture pinch/drag directly on any chart, plus 24h/3d/7d/All preset buttons — both update one shared domain so every chart stays in sync; clamped to the real data range with a minimum zoom span |
| 2026-08-08 | X-axis date/time labels | Code | Each chart now shows its visible start/end date (or date+time when the span is under 2 days) |
| 2026-08-08 | Temperature value labels | Code | Bounded label logic: label every point when there's room (≤8 points), otherwise always show just "Now" and "Peak" — never fully silent, never cluttered, at any zoom level |
| 2026-08-08 | Root cause: service worker caching strategy | Debug/Code | Diagnosed why updates weren't appearing — `sw.js` used cache-first (served stale content immediately, updated cache silently in background, needing two reloads to see a change); rewrote as network-first with cache fallback, bumped cache name again |
| 2026-08-08 | Medication marker redesign | Code | Moved medication markers out of the plot's value range into their own row below it; changed shape from filled circle to diamond for clearer visual distinction from real data points |
| 2026-08-08 | Log catch-up + process fix | Process | Caught up `ai-usage-log.md` and `decisions-log.md` after a gap; added an explicit per-turn logging rule (see below) so this doesn't recur |
| 2026-08-08 | Health concern grouping | Code | New `concerns` entity (many-to-many with trackers via `concernIds`) — trackers can belong to multiple concerns at once (e.g. a cough tagged to both "Cold/Flu" and "Allergies"). Concern selection added to the template-add flow; dashboard gets an "All / By health concern" toggle, with concern sections and an "Other" section for untagged trackers |

---

## What Claude has NOT done on this project

- Written any final marketing copy, the origin-story page, or any other user-facing prose
- Made unilateral security-sensitive decisions without flagging them (see `security-review-log.md`)
- Chosen cryptographic primitives without explaining the choice for review

Add a row here any time Claude does substantive work on this project — code, design docs, or
structural outlines — so this stays a complete record rather than a partial one.
