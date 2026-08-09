# Care Log — Claude Project Setup

Copy/paste guide for setting this up as a Project in claude.ai. Claude can't create the Project
itself — this is what to do once you open "New Project."

## 1. Files to upload as Project knowledge

- `care-log-prototype.jsx` — current working build
- `security-review-log.md`
- `ai-usage-log.md`
- `decisions-log.md`
- `verified-facts-log.md`
- `time-log.md`
- `dependabot.yml` and `security-scan.yml` (CI config, not yet in a real repo)

## 2. Suggested custom instructions (paste into the Project's instructions field)

```
This project is "Care Log" — a local-first, privacy-first, open-source multi-symptom and
medication tracker. Standing rules for all work on this project:

STORAGE & SECURITY
- Local-only by default. Data never leaves the device unless the user opts into paid cloud sync
  (end-to-end encrypted) or an explicit backup export.
- Local DB encrypted at rest, key derived from a user passcode. No password reset — this is a
  deliberate zero-knowledge tradeoff, not an oversight.
- Never hand-roll cryptography. Established libraries/APIs only.
- Flag anything security-sensitive (crypto, auth, token generation, storage access, the
  physician-share flow, logging config, dependency choices) by adding a row to
  security-review-log.md as it comes up — don't wait to be asked.
- Cloud data is retained indefinitely unless the user explicitly requests deletion. A lapsed
  subscription cuts off future sync, not existing data. Deletion requests must actually purge
  backups/logs too, not just the primary record.

MONETIZATION & ETHICS
- No dark patterns, ever: no fake urgency, confirmshaming, notification harassment, disguised
  paywalls, or guilt/fear-based copy. Cancellation as easy as signup.
- No pop-ups or modals, ever — no interrupting in-progress tasks, no app-open upsells. Limits and
  upgrade prompts surface inline/passively.
- No selling or monetizing user data, in any form. No sponsorship, including "sponsor-reviewed"
  content. Both are settled exclusions, not open questions.
- When usability and growth/revenue conflict, usability wins by default. Any exception is a
  deliberate, discussed choice.
- Physician-share recipients never pay, log in, or create an account.

UI
- No animations or transitions anywhere.
- Optimize for fastest possible load — avoid heavy dependencies where a lightweight approach works.
- Fewest taps possible is a standing tie-breaker for UI decisions.
- Large type, WCAG 2.1 AA floor, full screen reader support, no color-only indicators, large touch
  targets, respect reduced-motion. "Clarity is kindness."
- Illness templates and tracker selection are NEVER filtered by any demographic field.

CONTENT & SOURCING
- Claude never writes final prose meant to read as the user's voice (marketing copy, the origin
  story, emails). Outlines, brainstorming, and feedback are fine — the user does the actual writing.
- All medical, accessibility, and security claims get verified against multiple current,
  authoritative sources before use (CDC/AAP/Harvard Health-tier for medical; W3C for
  accessibility; OWASP/NIST for security). Log checks in verified-facts-log.md. Flag disagreement
  between sources rather than silently picking one.
- Ethnicity-based clinical range adjustments require individual, current, well-sourced
  justification — never applied broadly by default.

LOGGING PRACTICE
- Add a row to ai-usage-log.md for any substantive work (code, design, brainstorming).
- Add a row to decisions-log.md for any new structural/product decision, or to its "Open
  questions" section for anything flagged but not yet settled.
```

## 3. Note on the time log

`time-log.md` only captures conversation-session time, not real-world work time — it says so
explicitly in the file. Worth deciding separately whether you want a real time-tracking tool
alongside this, since that's genuinely outside what a conversation log can reliably measure.
