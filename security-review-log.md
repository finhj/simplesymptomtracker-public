# Care Log — Security Review Log

Running list of items that need human (ideally professional) security review before launch.
Updated as we build. Nothing in this log should be treated as reviewed just because it's listed —
"Status" tracks whether a human has actually looked at it yet.

Flag levels:
- 🔴 Critical — auth, crypto, token generation, anything guarding access to health data
- 🟡 Important — storage access, data validation, dependency choices
- ⚪ Worth a look — lower-risk but still touches user data

---

## Log

| # | Date/session | Item | Why it matters | Level | Status |
|---|---|---|---|---|---|
| 1 | 2026-08-08 | Local DB encryption-at-rest implementation (key storage in Keychain/Keystore) | Wrong implementation = data readable straight off a lost/stolen device despite "encrypted" label | 🔴 | Not yet built |
| 2 | 2026-08-08 | Cloud sync E2E encryption scheme | If done wrong, "end-to-end encrypted" becomes a false claim — server could read data | 🔴 | Not yet built |
| 3 | 2026-08-08 | Physician-share token generation (randomness source, length, expiry enforcement) | Predictable or long-lived tokens = unauthorized access to a patient's health data via a guessed/leaked link | 🔴 | Not yet built |
| 4 | 2026-08-08 | App-level biometric/passcode lock implementation | Bypassable lock = local encryption is moot if the app itself doesn't gate viewing | 🟡 | Not yet built |
| 5 | 2026-08-08 | Dependency selection for crypto libraries (must be established, not custom) | Hand-rolled or obscure crypto libraries are a classic source of exploitable bugs | 🔴 | Not yet decided |
| 6 | 2026-08-08 | CI security tooling setup (SAST + dependency scanning) | Determines whether future bugs get caught automatically or only by luck | 🟡 | Not yet built |
| 7 | 2026-08-08 | Logging/crash-report configuration | Easy to accidentally log sensitive fields (temps, med names, notes) without noticing | 🟡 | Not yet built |

---

## Automated coverage (in place)

- **Dependabot** (`.github/dependabot.yml`) — weekly scan of dependencies against known CVEs, opens PRs automatically. Patch/minor bumps grouped to reduce noise; major bumps get their own PR since those warrant a look regardless.
- **Scheduled CI scan** (`.github/workflows/security-scan.yml`) — runs weekly (plus every push/PR): CodeQL static analysis (results in the repo's Security tab), Semgrep static analysis, and `npm audit`, combined into one downloadable summary artifact each run.
- What this does well: catches known-CVE dependencies and common code-level vulnerability *patterns* (injection, weak randomness, unsafe deserialization, etc.), continuously, without anyone remembering to run it.
- What this does **not** do: judge whether a new vulnerability class applies to this specific architecture, review whether the crypto/auth *design* (not just the code) is sound, or catch anything novel that doesn't match a known pattern. That's the human layer below.

## Human review cadence (plan — not yet started, no code exists yet)

| Trigger | Who | What |
|---|---|---|
| Any 🔴 item added to this log | A human with security background, before that feature ships | Line-by-line review of that specific code, not a general pass |
| Weekly | You (or whoever owns the repo) | 15-minute skim of the CI summary artifact — triage bot findings as real/noise, not a deep review |
| Quarterly, once there's real code | A security-literate contractor (paid, even a few hours) | Broader pass across the whole codebase, not just what's changed — catches drift and design issues bots can't see |
| Before public launch | A real third-party security audit (already agreed) | Full audit, non-negotiable given health data + physician sharing |
| Every major version after launch | Same as quarterly, timed to the release | Re-review anything that changed in auth/crypto/storage since the last pass |

This table is the thing to actually revisit and firm up (who the quarterly contractor is, what "major version" means here) once there's a repo and a real timeline — recorded now so it doesn't get lost as a good intention.


- This log is a *tracking* mechanism, not a substitute for the planned third-party security audit before public launch.
- Every 🔴 item should have a named human reviewer and a review date before it ships to real users, not just before "launch."
- Add new rows as work happens — don't wait until something is finished to flag it; flag it when it's first touched.
