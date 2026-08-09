# Care Log — Decisions Log

A running record of structural and product decisions, so future work builds on what's already
been decided rather than re-deriving it. "Open questions" are things flagged but not yet settled.

---

## Decided

| Area | Decision |
|---|---|
| Storage | Local-only by default; local DB encrypted at rest, key derived from a user passcode (PBKDF2 + AES-GCM), never stored in plaintext |
| Free tier | 3 active symptom trackers, 15 distinct medications, on-device text report, manual encrypted backup/export — all free, no account required |
| Paid tier | Managed cloud sync (E2E encrypted) and physician sharing — the only two paid features |
| Physician sharing | Recipient never pays, logs in, or creates an account — access via unauthenticated, expiring, revocable token |
| Cloud data retention | Never auto-deleted; only removed on explicit user request, and that deletion must reach backups/logs too, not just the primary record |
| Backup/export | Manual-trigger only, encrypted with the same passcode as the app, via OS file picker/share sheet |
| Marketing/monetization | No dark patterns, no pop-ups ever, no data selling, no sponsorship (including "sponsor-reviewed" content); usability wins over growth/revenue by default |
| Distribution | PWA-based core + thin native wrappers (Tauri/Capacitor); billing must be channel-specific (Apple IAP, Play Billing, direct web for F-Droid/GrapheneOS/Sailfish) |
| Enterprise | InstitutionalLicense model for health systems and individual practices — same mechanism, self-serve for small practices vs. sales-assisted for large systems; needs a periodic online validity check with ~30-day offline grace period |
| Physician trial codes | Reusable per-physician code, 14-day free trial, no account or payment info required to redeem |
| Templates | Never filtered by demographics — full illness-template list always shown regardless of age/sex/gender |
| Demographics | Age (required) and ethnic background (optional) collected at setup; name/sex/gender (all optional) deferred until report export/share |
| Range tailoring | Age-based tailoring is safe to build (well-supported pediatric/adult thresholds); ethnicity-based tailoring requires individual clinical justification, not a blanket feature |
| Units | Canonical storage in one internal unit per category, converted at display/input boundaries; separate toggles for metric/imperial and glucose (mg/dL vs mmol/L); blood pressure always mmHg, no toggle |
| UI | No animations/transitions anywhere; optimize for fastest load; fewest taps by default; large type, WCAG 2.1 AA floor, full screen reader support, no color-only indicators |
| First-run UX | Nothing but a single "Track a symptom" button until any data exists |
| Writing boundary | Claude never writes final prose meant to read as the user's voice (marketing copy, origin story, etc.) — outlines and brainstorming only |
| Fact-checking | All medical/accessibility/security claims verified against multiple current, authoritative sources — disagreements flagged, not silently resolved |
| Standalone build | `care-log-standalone.html` is generated from `care-log-prototype.jsx` via a scripted transformation (imports stripped, `window.storage` → real `localStorage`-backed `LocalStore`, lucide-react → inline SVG icons), regenerated after every source change rather than hand-edited separately, specifically to prevent the two files drifting apart |
| PWA dependencies | CDN dependencies (React, ReactDOM, Babel Standalone) must be version-pinned to a major version (e.g. `@7`, `@18`), never left unpinned — an unpinned Babel silently jumped to a breaking major version (v8's JSX runtime default change) and caused a fully blank page with no error |
| Service worker caching | Network-first with cache fallback, not cache-first — cache-first was silently serving stale content and required two reloads to show any update, a bad fit for an actively-developed app; cache name gets bumped on every meaningful change to force a clean slate |
| Chart time domain | All tracker charts and medication markers share one synchronized timeline (not independently computed per chart), adjustable via pinch/drag gesture or 24h/3d/7d/All preset buttons, clamped to the real logged data range with a minimum zoom span |
| Medication chart display | No on-chart text labels for medications (repeated overlap/cutoff/hard-to-read problems with diagonal text) — markers are diamonds in a dedicated row below the plot, full detail lives in a tap-to-expand "Medications in view" list scoped to the chart's current visible range |
| Temperature value labels | Bounded, not all-or-nothing: label every point when ≤8 are visible, otherwise always show exactly "Now" and "Peak" (never fully unlabeled, never cluttered) at any zoom level |
| Data editing | Both symptom entries and medications are fully editable (value/name/dose and timestamp) and deletable after logging, not just deletable |
| Logging discipline | Claude adds a row to `ai-usage-log.md` and `decisions-log.md` immediately within the same turn as any substantive change, not deferred to a later "catch-up" — see note at the bottom of this file |

## Open questions (not yet decided)

- Multi-profile entitlement: is a second profile free or paid?
- Passcode recovery policy: pure zero-knowledge (no recovery possible) vs. some form of user-held recovery code
- Report format: plain text (built) vs. PDF (originally specced for free tier) — which is the real target?
- Household/caregiver permissions: what exactly can a "caregiver" role do vs. "owner"?
- Illness template medical review process: who signs off on template content before shipping?
- Open-source PR review policy for security-sensitive code paths
- Cross-channel patch strategy (F-Droid review lag vs. instant web deploys)
- Support/refund/cancellation channel, given there's no account/login system

## Logging discipline (added after a gap where both logs fell behind)

Both `ai-usage-log.md` and `decisions-log.md` fell about 30 messages behind actual work during
one long build/debug session — the standing rule existed but wasn't being followed in practice
during rapid back-to-back edits. Fix going forward:

- **Log immediately, same turn, before presenting files** — not "I'll log this later," which is
  exactly what caused the gap. If a change is worth telling the user about, it's worth one line here.
- **Keep entries short** — a single row, not a paragraph. Low friction is what makes it sustainable
  across many small edits in a row, rather than something that only happens at natural checkpoints.
- **Bug fixes and root-cause diagnoses get logged too**, not just new features — several of the
  most important entries in this project (the Babel 8 issue, the service worker caching strategy)
  were debugging work, not feature work, and are exactly the kind of thing worth a durable record.
