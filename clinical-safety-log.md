# Care Log — Clinical Safety Log

Tracks user-safety design decisions — how the app handles moments where someone's data
suggests they may be at risk (self-harm ideation, crisis-level answers, etc.). This is
distinct from `security-review-log.md`, which covers technical security (encryption, auth).
This log covers *human* safety: what the app does, says, and shows in a moment that matters.

Nothing with an open status here ships in a release that includes the feature it blocks.

Status values:
- 🟢 **Resolved** — decision made and documented
- 🟡 **Open — blocks related feature** — must be resolved before the specific feature ships
- 🔵 **Open — not yet blocking** — worth deciding, nothing currently depends on it

---

## Log

| Date flagged | Item | Status | Notes |
|---|---|---|---|
| 2026-08-09 | Handling a concerning answer to a safety-critical questionnaire item (e.g. PHQ-9 item 9, self-harm ideation) | 🟢 Resolved | User's explicit decision: Care Log is symptom-tracking software, not a crisis service, and must never claim or attempt to be one. A concerning answer is logged exactly like any other data point — no detection, no reactive response, no interruption, no forced resource screen. This applies to every current and future questionnaire instrument |
| 2026-08-09 | Always-present emergency resources link | 🟡 In progress — entry point built, content pending | Bumped up from "distant future": a red-styled, always-present "Emergency Resources" link now sits in the header across every screen (first-run, template picker, dashboard), not just one placement. Tapping it opens an inline panel (no pop-up) that's honest about being a placeholder, plus a restated "not a crisis service" disclaimer. Styled with text label + color, not color alone, per the accessibility standard. Real resource content (psychosis/self-harm/suicide/dehydration/poison, likely different resources per category) deliberately not filled in yet — user wants to populate that separately |

---

## Notes

- The `isSafetyCritical` flag on a questionnaire question still exists in the data model, but
  its only purpose now is documentation/attribution (noting which questions ask about
  sensitive topics) — it does NOT trigger any special app behavior. No detection, no branching
  logic, no different treatment of the response.
- This is exactly the kind of decision that shouldn't drift into being decided by default
  (e.g. quietly building a reactive version because it seemed helpful) — it needs to be
  a deliberate, discussed choice, consistent with how other rule-exceptions are handled
  in this project.
