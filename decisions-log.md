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

## Open questions (not yet decided)

- Multi-profile entitlement: is a second profile free or paid?
- Passcode recovery policy: pure zero-knowledge (no recovery possible) vs. some form of user-held recovery code
- Report format: plain text (built) vs. PDF (originally specced for free tier) — which is the real target?
- Household/caregiver permissions: what exactly can a "caregiver" role do vs. "owner"?
- Illness template medical review process: who signs off on template content before shipping?
- Open-source PR review policy for security-sensitive code paths
- Cross-channel patch strategy (F-Droid review lag vs. instant web deploys)
- Support/refund/cancellation channel, given there's no account/login system
