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

---

## What Claude has NOT done on this project

- Written any final marketing copy, the origin-story page, or any other user-facing prose
- Made unilateral security-sensitive decisions without flagging them (see `security-review-log.md`)
- Chosen cryptographic primitives without explaining the choice for review

Add a row here any time Claude does substantive work on this project — code, design docs, or
structural outlines — so this stays a complete record rather than a partial one.
