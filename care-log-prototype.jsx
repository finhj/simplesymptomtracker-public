import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Plus, Lock, Search, X, ChevronLeft, Check, Trash2, FileText, Copy } from "lucide-react";

const STORAGE_KEY = "care-log-vault-v1";
const PBKDF2_ITERATIONS = 300000;
const MAX_TRACKERS = 3;
const MAX_MEDICATIONS = 15;

// Canonical storage is always Celsius; display converts at the edges.
// Verified against CDC / Harvard Health / Cleveland Clinic / AAP-aligned study — see verified-facts-log.md
const FEVER_C = 38.0;        // 100.4°F
const LOW_GRADE_C = 37.5;    // 99.5°F — corrected from an earlier unverified 99°F

function cToF(c) { return (c * 9) / 5 + 32; }
function fToC(f) { return ((f - 32) * 5) / 9; }
function displayTemp(celsius, system) {
  return system === "imperial" ? cToF(celsius) : celsius;
}
function toCelsius(value, system) {
  return system === "imperial" ? fToC(value) : value;
}
function tempUnitLabel(system) { return system === "imperial" ? "°F" : "°C"; }

const ink = "#232320";
const inkSoft = "#7A7362";
const paper = "#F7F4EE";
const paperDark = "#EFEAE0";
const card = "#FFFDF9";
const border = "#DDD6C7";
const teal = "#2F6F68";
const tealSoft = "#DCEAE7";
const amber = "#D98B3F";
const amberSoft = "#F5E3CB";
const red = "#C1443C";
const redSoft = "#F3DBD8";
const blue = "#4F6C8C";

// ---------- Templates (static, ships in the app, no network dependency) ----------
const TEMPLATES = [
  {
    id: "cold-flu",
    label: "Cold / Flu",
    searchTerms: ["cough", "runny nose", "sore throat", "flu", "cold", "congestion"],
    description: "Temperature, cough, sore throat, congestion",
    trackers: [
      { name: "Temperature", type: "temperature", unit: "°F" },
      { name: "Cough", type: "scale", scaleMax: 5 },
      { name: "Sore throat", type: "scale", scaleMax: 5 },
      { name: "Congestion", type: "scale", scaleMax: 5 },
    ],
  },
  {
    id: "stomach-bug",
    label: "Stomach bug",
    searchTerms: ["vomit", "throw up", "nausea", "diarrhea", "stomach"],
    description: "Nausea, vomiting, diarrhea, appetite",
    trackers: [
      { name: "Nausea", type: "scale", scaleMax: 5 },
      { name: "Vomiting", type: "boolean" },
      { name: "Diarrhea", type: "boolean" },
      { name: "Appetite", type: "scale", scaleMax: 5 },
    ],
  },
  {
    id: "migraine",
    label: "Migraine",
    searchTerms: ["headache", "migraine", "light sensitivity", "aura"],
    description: "Headache severity, light sensitivity, nausea",
    trackers: [
      { name: "Headache", type: "scale", scaleMax: 5 },
      { name: "Light sensitivity", type: "boolean" },
      { name: "Nausea", type: "scale", scaleMax: 5 },
    ],
  },
  {
    id: "allergic-reaction",
    label: "Allergic reaction",
    searchTerms: ["rash", "hives", "itchy", "swelling", "allergy"],
    description: "Rash/hives, swelling, itchiness",
    trackers: [
      { name: "Rash / hives", type: "boolean" },
      { name: "Swelling", type: "scale", scaleMax: 5 },
      { name: "Itchiness", type: "scale", scaleMax: 5 },
    ],
  },
  {
    id: "ear-infection",
    label: "Ear infection",
    searchTerms: ["ear pain", "earache", "ear infection"],
    description: "Ear pain, temperature, fussiness",
    trackers: [
      { name: "Ear pain", type: "scale", scaleMax: 5 },
      { name: "Temperature", type: "temperature", unit: "°F" },
      { name: "Fussiness", type: "scale", scaleMax: 5 },
    ],
  },
  {
    id: "post-procedure",
    label: "Recovering from a procedure",
    searchTerms: ["surgery", "recovery", "incision", "pain", "procedure"],
    description: "Pain level, incision site, temperature",
    trackers: [
      { name: "Pain", type: "scale", scaleMax: 5 },
      { name: "Incision looks okay", type: "boolean" },
      { name: "Temperature", type: "temperature", unit: "°F" },
    ],
  },
];

// ---------- Crypto helpers ----------
function bufToB64(buf) {
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}
function b64ToBuf(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}
async function deriveKey(passcode, saltB64, iterations) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(passcode), { name: "PBKDF2" }, false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: b64ToBuf(saltB64), iterations, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}
async function encryptJSON(key, obj) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(JSON.stringify(obj)));
  return { iv: bufToB64(iv), ciphertext: bufToB64(ciphertext) };
}
async function decryptJSON(key, ivB64, ciphertextB64) {
  const iv = new Uint8Array(b64ToBuf(ivB64));
  const plainBuf = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, b64ToBuf(ciphertextB64));
  return JSON.parse(new TextDecoder().decode(plainBuf));
}
function uid() {
  return Math.random().toString(36).slice(2, 10);
}
function fmtTime(iso) {
  return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}
function fmtTimeShort(iso) {
  return new Date(iso).toLocaleString(undefined, { hour: "numeric", minute: "2-digit" });
}
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ---------- Lightweight sparkline (no chart library — fast load) ----------
function Sparkline({ points, kind, unitSystem, scaleMax }) {
  const width = 260, height = 56, pad = 6;
  const chartLeft = 34; // reserve space for axis labels
  const plotWidth = width - chartLeft;
  if (!points || points.length === 0) {
    return <div style={{ fontSize: 12, color: inkSoft, padding: "18px 0" }}>No readings yet</div>;
  }
  const display = kind === "temperature" ? points.map((p) => ({ t: p.t, v: displayTemp(p.v, unitSystem) })) : points;
  const minY = kind === "temperature" ? (unitSystem === "imperial" ? 95 : 35) : 0;
  const maxY = kind === "temperature" ? (unitSystem === "imperial" ? 106 : 41) : (scaleMax || 5);
  const feverLine = kind === "temperature" ? displayTemp(FEVER_C, unitSystem) : null;
  const unit = kind === "temperature" ? tempUnitLabel(unitSystem) : "";
  const xs = display.map((p) => p.t);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const scaleX = (t) => (xs.length > 1 ? ((t - minX) / (maxX - minX || 1)) * (plotWidth - pad * 2) + pad + chartLeft : plotWidth / 2 + chartLeft);
  const scaleY = (v) => height - pad - ((v - minY) / (maxY - minY)) * (height - pad * 2);
  const d = display.map((p, i) => `${i === 0 ? "M" : "L"} ${scaleX(p.t).toFixed(1)} ${scaleY(p.v).toFixed(1)}`).join(" ");
  const last = display[display.length - 1];
  const axisLabelStyle = { fontSize: 9, fill: inkSoft, fontFamily: "-apple-system, sans-serif" };
  return (
    <svg width={width} height={height} role="img" aria-label={`Trend chart, scale ${minY} to ${maxY}${unit}, latest value ${last.v.toFixed(1)}${unit}`}>
      {kind === "temperature" && (
        <rect x={chartLeft} y={scaleY(feverLine)} width={plotWidth} height={Math.max(scaleY(maxY) - scaleY(feverLine), 0)} fill={redSoft} opacity={0.5} />
      )}
      <text x={0} y={scaleY(maxY) + 3} style={axisLabelStyle}>{maxY.toFixed(0)}{unit}</text>
      <text x={0} y={scaleY(minY) - 1} style={axisLabelStyle}>{minY.toFixed(0)}{unit}</text>
      {kind === "temperature" && (
        <text x={0} y={scaleY(feverLine) + 3} style={{ ...axisLabelStyle, fill: red, fontWeight: 700 }}>{feverLine.toFixed(1)}</text>
      )}
      <line x1={chartLeft} y1={pad} x2={chartLeft} y2={height - pad} stroke={border} strokeWidth={1} />
      <path d={d} fill="none" stroke={ink} strokeWidth={1.5} />
      {display.map((p, i) => (
        <circle key={i} cx={scaleX(p.t)} cy={scaleY(p.v)} r={2.5} fill={kind === "temperature" && p.v >= feverLine ? red : teal} />
      ))}
    </svg>
  );
}

export default function CareLog() {
  const [phase, setPhase] = useState("loading"); // loading | setup | locked | ready
  const [errorMsg, setErrorMsg] = useState("");
  const [passcodeInput, setPasscodeInput] = useState("");
  const [passcodeConfirm, setPasscodeConfirm] = useState("");

  const [trackers, setTrackers] = useState([]);
  const [entries, setEntries] = useState([]);
  const [meds, setMeds] = useState([]);
  const [profile, setProfile] = useState({ ageYears: "", ageMonths: "", ethnicity: "", unitSystem: "imperial" });
  const [profileDraft, setProfileDraft] = useState({ ageYears: "", ageMonths: "", ethnicity: "" });

  const [showSettings, setShowSettings] = useState(false);
  const [showBackup, setShowBackup] = useState(false);
  const [restorePasscode, setRestorePasscode] = useState("");
  const [restoreFile, setRestoreFile] = useState(null);
  const [restoreError, setRestoreError] = useState("");
  const [restoreSuccess, setRestoreSuccess] = useState(false);
  const [setupRestoreMode, setSetupRestoreMode] = useState(false);

  const [view, setView] = useState("dashboard"); // dashboard | templatePicker
  const [templateQuery, setTemplateQuery] = useState("");
  const [openTemplateId, setOpenTemplateId] = useState(null);
  const [selectedTrackerNames, setSelectedTrackerNames] = useState([]);

  const [draftValues, setDraftValues] = useState({});
  const [medName, setMedName] = useState("");
  const [medDose, setMedDose] = useState("");
  const [showReport, setShowReport] = useState(false);
  const [reportCopied, setReportCopied] = useState(false);

  const [saveError, setSaveError] = useState(false);

  const cryptoKeyRef = useRef(null);
  const saltRef = useRef(null);
  const skippedInitialPersist = useRef(false);
  const loadedRef = useRef(false);

  // ---------- Initial load ----------
  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get(STORAGE_KEY, false);
        if (res && res.value) {
          const vault = JSON.parse(res.value);
          saltRef.current = vault.saltB64;
          setPhase("locked-waiting"); // vault exists, needs passcode; render locked screen below
          setPhase("locked");
        } else {
          setPhase("setup");
        }
      } catch (e) {
        setPhase("setup");
      }
    })();
  }, []);

  // ---------- Persist (encrypt + save) ----------
  const persist = useCallback(async (nextTrackers, nextEntries, nextMeds, nextProfile) => {
    if (!cryptoKeyRef.current) return;
    const payload = { trackers: nextTrackers, entries: nextEntries, meds: nextMeds, profile: nextProfile };
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const { iv, ciphertext } = await encryptJSON(cryptoKeyRef.current, payload);
        const vault = { saltB64: saltRef.current, iterations: PBKDF2_ITERATIONS, iv, ciphertext };
        const result = await window.storage.set(STORAGE_KEY, JSON.stringify(vault), false);
        if (result) {
          setSaveError(false);
          return;
        }
      } catch (e) {
        console.error("care-log: persist failed", { attempt: attempt + 1, error: e });
      }
      if (attempt < 2) await sleep(400 * (attempt + 1));
    }
    setSaveError(true);
  }, []);

  useEffect(() => {
    if (phase !== "ready") return;
    if (!skippedInitialPersist.current) {
      skippedInitialPersist.current = true;
      return;
    }
    persist(trackers, entries, meds, profile);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackers, entries, meds, profile]);

  // ---------- Setup (first run — create passcode) ----------
  async function handleCreatePasscode() {
    setErrorMsg("");
    if (passcodeInput.length < 4) {
      setErrorMsg("Use at least 4 characters.");
      return;
    }
    if (passcodeInput !== passcodeConfirm) {
      setErrorMsg("Passcodes don't match.");
      return;
    }
    const saltBytes = crypto.getRandomValues(new Uint8Array(16));
    const saltB64 = bufToB64(saltBytes.buffer);
    saltRef.current = saltB64;
    const key = await deriveKey(passcodeInput, saltB64, PBKDF2_ITERATIONS);
    cryptoKeyRef.current = key;
    setPasscodeInput("");
    setPasscodeConfirm("");
    setPhase("setup-profile"); // don't persist yet — collect the (mostly optional) profile first
  }

  async function handleSaveProfile() {
    setErrorMsg("");
    const ageYears = profileDraft.ageYears === "" ? null : parseInt(profileDraft.ageYears, 10);
    const ageMonths = profileDraft.ageMonths === "" ? null : parseInt(profileDraft.ageMonths, 10);
    if ((ageYears === null || isNaN(ageYears)) && (ageMonths === null || isNaN(ageMonths))) {
      setErrorMsg("Age is required — years, or months for an infant.");
      return;
    }
    const nextProfile = {
      ageYears: ageYears || 0,
      ageMonths: ageMonths || 0,
      ethnicity: profileDraft.ethnicity.trim(),
      unitSystem: "imperial",
    };
    if (!cryptoKeyRef.current || !saltRef.current) {
      setErrorMsg("Something went wrong setting up encryption — please go back and re-create your passcode.");
      return;
    }
    try {
      const { iv, ciphertext } = await encryptJSON(cryptoKeyRef.current, { trackers: [], entries: [], meds: [], profile: nextProfile });
      const vault = { saltB64: saltRef.current, iterations: PBKDF2_ITERATIONS, iv, ciphertext };
      const result = await window.storage.set(STORAGE_KEY, JSON.stringify(vault), false);
      if (!result) throw new Error("storage.set returned no result");
      setProfile(nextProfile);
      skippedInitialPersist.current = true;
      setPhase("ready");
    } catch (e) {
      console.error("care-log: failed to save profile", e);
      setErrorMsg("Couldn't save — check your connection and try Continue again.");
    }
  }

  // ---------- Lock screen (unlock) ----------
  async function handleUnlock() {
    setErrorMsg("");
    try {
      const res = await window.storage.get(STORAGE_KEY, false);
      const vault = JSON.parse(res.value);
      const key = await deriveKey(passcodeInput, vault.saltB64, vault.iterations);
      const data = await decryptJSON(key, vault.iv, vault.ciphertext);
      cryptoKeyRef.current = key;
      saltRef.current = vault.saltB64;
      setTrackers(data.trackers || []);
      setEntries(data.entries || []);
      setMeds(data.meds || []);
      setProfile(data.profile || { ageYears: "", ageMonths: "", ethnicity: "", unitSystem: "imperial" });
      skippedInitialPersist.current = true;
      setPasscodeInput("");
      setPhase("ready");
    } catch (e) {
      setErrorMsg("Incorrect passcode. Try again.");
    }
  }

  // ---------- Backup export / restore ----------
  async function handleExportBackup() {
    if (!cryptoKeyRef.current) return;
    const payload = { trackers, entries, meds, profile };
    const { iv, ciphertext } = await encryptJSON(cryptoKeyRef.current, payload);
    const backup = { formatVersion: 1, saltB64: saltRef.current, iterations: PBKDF2_ITERATIONS, iv, ciphertext, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(backup)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `care-log-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function handleRestoreFromFile(file, passcode, isFirstRun) {
    setRestoreError("");
    setRestoreSuccess(false);
    try {
      const text = await file.text();
      const backup = JSON.parse(text);
      const key = await deriveKey(passcode, backup.saltB64, backup.iterations);
      // A successful decrypt IS the integrity check — AES-GCM's auth tag makes a
      // tampered or corrupted file fail here rather than silently restoring bad data.
      const data = await decryptJSON(key, backup.iv, backup.ciphertext);
      cryptoKeyRef.current = key;
      saltRef.current = backup.saltB64;
      setTrackers(data.trackers || []);
      setEntries(data.entries || []);
      setMeds(data.meds || []);
      setProfile(data.profile || { ageYears: "", ageMonths: "", ethnicity: "", unitSystem: "imperial" });
      skippedInitialPersist.current = true;
      setRestoreSuccess(true);
      if (isFirstRun) {
        setPhase("ready");
      } else {
        await persist(data.trackers || [], data.entries || [], data.meds || [], data.profile || profile);
        setShowBackup(false);
      }
    } catch (e) {
      setRestoreError("Couldn't restore — check the file and passcode, or the file may be from a different backup.");
    }
  }

  // ---------- Derived data ----------
  const activeTrackers = useMemo(() => trackers.filter((t) => !t.archived), [trackers]);
  const remainingSlots = MAX_TRACKERS - activeTrackers.length;

  const knownMedNames = useMemo(() => [...new Set(meds.map((m) => m.name.trim().toLowerCase()))], [meds]);
  const medCatalogCount = knownMedNames.length;

  const filteredTemplates = useMemo(() => {
    const q = templateQuery.trim().toLowerCase();
    if (!q) return TEMPLATES;
    return TEMPLATES.filter(
      (t) => t.label.toLowerCase().includes(q) || t.searchTerms.some((s) => s.includes(q))
    );
  }, [templateQuery]);

  function trackerSeries(trackerId) {
    return entries
      .filter((e) => e.values[trackerId] != null && typeof e.values[trackerId] !== "boolean")
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
      .map((e) => ({ t: new Date(e.timestamp).getTime(), v: e.values[trackerId] }));
  }

  function latestEntryFor(trackerId) {
    return [...entries]
      .filter((e) => e.values[trackerId] != null)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
  }

  // ---------- Actions ----------
  function openTemplate(id) {
    const t = TEMPLATES.find((tt) => tt.id === id);
    if (!t) return;
    const preselect = t.trackers.slice(0, Math.max(remainingSlots, 0)).map((tr) => tr.name);
    setSelectedTrackerNames(preselect);
    setOpenTemplateId(id);
  }

  function toggleTrackerSelection(name) {
    setSelectedTrackerNames((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]));
  }

  function addSelectedTrackers() {
    const template = TEMPLATES.find((t) => t.id === openTemplateId);
    if (!template) return;
    const toAdd = template.trackers.filter((tr) => selectedTrackerNames.includes(tr.name));
    if (toAdd.length === 0 || toAdd.length > remainingSlots) return;
    const newTrackers = toAdd.map((tr) => ({
      id: uid(),
      name: tr.name,
      type: tr.type,
      unit: tr.unit,
      scaleMax: tr.scaleMax || 5,
      sourceTemplateId: template.id,
      archived: false,
    }));
    setTrackers((prev) => [...prev, ...newTrackers]);
    setOpenTemplateId(null);
    setSelectedTrackerNames([]);
    setTemplateQuery("");
    setView("dashboard");
  }

  function archiveTracker(id) {
    setTrackers((prev) => prev.map((t) => (t.id === id ? { ...t, archived: true } : t)));
  }

  function logValue(trackerId, value, isTemperature) {
    const now = new Date().toISOString();
    const stored = isTemperature ? toCelsius(value, profile.unitSystem) : value;
    setEntries((prev) => [...prev, { id: uid(), timestamp: now, values: { [trackerId]: stored } }]);
    setDraftValues((d) => ({ ...d, [trackerId]: undefined }));
  }

  function addMedication() {
    const name = medName.trim();
    if (!name) return;
    const isNewDistinct = !knownMedNames.includes(name.toLowerCase());
    if (isNewDistinct && medCatalogCount >= MAX_MEDICATIONS) return;
    setMeds((prev) => [...prev, { id: uid(), name, dose: medDose.trim(), timestamp: new Date().toISOString() }]);
    setMedName("");
    setMedDose("");
  }

  function deleteMed(id) {
    setMeds((prev) => prev.filter((m) => m.id !== id));
  }

  const reportText = useMemo(() => {
    const since = new Date(Date.now() - 72 * 3600 * 1000);
    const lines = [`Care Log summary — last 72 hours`, `Generated ${new Date().toLocaleString()}`, ""];
    activeTrackers.forEach((t) => {
      const recent = entries
        .filter((e) => e.values[t.id] != null && new Date(e.timestamp) >= since)
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      lines.push(`${t.name}:`);
      if (recent.length === 0) lines.push("  no readings");
      else recent.forEach((e) => {
        const v = t.type === "temperature" ? displayTemp(e.values[t.id], profile.unitSystem).toFixed(1) : e.values[t.id];
        lines.push(`  ${fmtTime(e.timestamp)} — ${v}${t.type === "temperature" ? tempUnitLabel(profile.unitSystem) : ""}`);
      });
      lines.push("");
    });
    const recentMeds = meds
      .filter((m) => new Date(m.timestamp) >= since)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    lines.push("Medications:");
    if (recentMeds.length === 0) lines.push("  none logged");
    else recentMeds.forEach((m) => lines.push(`  ${fmtTime(m.timestamp)} — ${m.name}${m.dose ? " " + m.dose : ""}`));
    return lines.join("\n");
  }, [activeTrackers, entries, meds]);

  async function copyReport() {
    try {
      await navigator.clipboard.writeText(reportText);
      setReportCopied(true);
      setTimeout(() => setReportCopied(false), 2000);
    } catch (e) {
      // clipboard may be blocked; text is still selectable on screen
    }
  }

  // ---------- Render ----------
  if (phase === "loading") {
    return <div style={{ background: paper, minHeight: "100vh" }} />;
  }

  if (phase === "setup") {
    return (
      <Screen title="Set up your passcode">
        <p style={{ fontSize: 14, color: inkSoft, margin: "0 0 18px" }}>
          This locks the app and encrypts everything you log. There's no account and no password reset —
          if you forget this passcode, your data can't be recovered, by us or anyone else.
        </p>
        {!setupRestoreMode ? (
          <>
            <Field label="Passcode">
              <input type="password" value={passcodeInput} onChange={(e) => setPasscodeInput(e.target.value)} style={inputStyle} autoFocus />
            </Field>
            <Field label="Confirm passcode">
              <input type="password" value={passcodeConfirm} onChange={(e) => setPasscodeConfirm(e.target.value)} style={inputStyle} />
            </Field>
            {errorMsg && <div style={errorStyle}>{errorMsg}</div>}
            <button style={primaryBtn} onClick={handleCreatePasscode}>Create passcode</button>
            <button style={linkBtn} onClick={() => setSetupRestoreMode(true)}>Restore from a backup instead</button>
          </>
        ) : (
          <>
            <Field label="Backup file">
              <input type="file" accept="application/json" onChange={(e) => setRestoreFile(e.target.files[0] || null)} style={inputStyle} />
            </Field>
            <Field label="Backup passcode">
              <input type="password" value={restorePasscode} onChange={(e) => setRestorePasscode(e.target.value)} style={inputStyle} />
            </Field>
            {restoreError && <div style={errorStyle}>{restoreError}</div>}
            <button
              style={{ ...primaryBtn, opacity: !restoreFile || !restorePasscode ? 0.5 : 1 }}
              disabled={!restoreFile || !restorePasscode}
              onClick={() => handleRestoreFromFile(restoreFile, restorePasscode, true)}
            >
              Restore
            </button>
            <button style={linkBtn} onClick={() => setSetupRestoreMode(false)}>Set up a new passcode instead</button>
          </>
        )}
      </Screen>
    );
  }

  if (phase === "setup-profile") {
    return (
      <Screen title="About the person you're tracking">
        <p style={{ fontSize: 14, color: inkSoft, margin: "0 0 18px" }}>
          Only age is required. This helps show age-appropriate ranges — it never limits which
          trackers are available to you.
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          <Field label="Age (years)">
            <input type="number" min="0" value={profileDraft.ageYears} onChange={(e) => setProfileDraft((p) => ({ ...p, ageYears: e.target.value }))} style={inputStyle} autoFocus />
          </Field>
          <Field label="Or months, if an infant">
            <input type="number" min="0" value={profileDraft.ageMonths} onChange={(e) => setProfileDraft((p) => ({ ...p, ageMonths: e.target.value }))} style={inputStyle} />
          </Field>
        </div>
        <Field label="Ethnic background (optional)">
          <input value={profileDraft.ethnicity} onChange={(e) => setProfileDraft((p) => ({ ...p, ethnicity: e.target.value }))} style={inputStyle} placeholder="Prefer not to say — leave blank" />
        </Field>
        {errorMsg && <div style={errorStyle}>{errorMsg}</div>}
        <button style={primaryBtn} onClick={handleSaveProfile}>Continue</button>
      </Screen>
    );
  }

  if (phase === "locked") {
    return (
      <Screen title="Enter your passcode">
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
          <Lock size={28} color={inkSoft} />
        </div>
        <Field label="Passcode">
          <input
            type="password"
            value={passcodeInput}
            onChange={(e) => setPasscodeInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
            style={inputStyle}
            autoFocus
          />
        </Field>
        {errorMsg && <div style={errorStyle}>{errorMsg}</div>}
        <button style={primaryBtn} onClick={handleUnlock}>Unlock</button>
      </Screen>
    );
  }

  // phase === "ready"
  return (
    <div style={{ background: paper, minHeight: "100vh", color: ink }}>
      <GlobalStyle />
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "20px 16px 80px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 18 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, fontFamily: "Georgia, serif" }}>Care Log</h1>
          <div style={{ display: "flex", gap: 4 }}>
            <button style={linkBtnSmall} onClick={() => setShowSettings((s) => !s)}>Units</button>
            <button style={linkBtnSmall} onClick={() => setShowBackup((s) => !s)}>Backup</button>
          </div>
        </div>

        {showSettings && (
          <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 14, padding: 14, marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Units</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                style={{ ...toggleBtn, ...(profile.unitSystem === "imperial" ? toggleBtnActive : {}) }}
                onClick={() => setProfile((p) => ({ ...p, unitSystem: "imperial" }))}
              >
                °F (imperial)
              </button>
              <button
                style={{ ...toggleBtn, ...(profile.unitSystem === "metric" ? toggleBtnActive : {}) }}
                onClick={() => setProfile((p) => ({ ...p, unitSystem: "metric" }))}
              >
                °C (metric)
              </button>
            </div>
          </div>
        )}

        {showBackup && (
          <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 14, padding: 14, marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Back up your data</div>
            <p style={{ fontSize: 12, color: inkSoft, margin: "0 0 10px" }}>
              Saves an encrypted file, protected by your app passcode, that you can store anywhere or use to restore on another device.
            </p>
            <button style={primaryBtnSmall} onClick={handleExportBackup}>Download backup</button>

            <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${paperDark}` }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Restore from a backup</div>
              <p style={{ fontSize: 12, color: red, margin: "0 0 8px" }}>This replaces everything currently in the app with the backup's contents.</p>
              <input type="file" accept="application/json" onChange={(e) => setRestoreFile(e.target.files[0] || null)} style={{ ...inputStyle, marginBottom: 8 }} />
              <input type="password" placeholder="Backup passcode" value={restorePasscode} onChange={(e) => setRestorePasscode(e.target.value)} style={{ ...inputStyle, marginBottom: 8 }} />
              {restoreError && <div style={errorStyle}>{restoreError}</div>}
              {restoreSuccess && <div style={{ ...errorStyle, background: tealSoft, color: teal, borderColor: teal }}>Restored.</div>}
              <button
                style={{ ...primaryBtnSmall, opacity: !restoreFile || !restorePasscode ? 0.5 : 1 }}
                disabled={!restoreFile || !restorePasscode}
                onClick={() => handleRestoreFromFile(restoreFile, restorePasscode, false)}
              >
                Restore this backup
              </button>
            </div>
          </div>
        )}

        {view === "templatePicker" ? (
          <TemplatePicker
            query={templateQuery}
            setQuery={setTemplateQuery}
            templates={filteredTemplates}
            remainingSlots={remainingSlots}
            openTemplateId={openTemplateId}
            openTemplate={openTemplate}
            selectedTrackerNames={selectedTrackerNames}
            toggleTrackerSelection={toggleTrackerSelection}
            addSelectedTrackers={addSelectedTrackers}
            onClose={() => { setView("dashboard"); setOpenTemplateId(null); setTemplateQuery(""); }}
          />
        ) : activeTrackers.length === 0 ? (
          // First-run / zero-active-trackers state: nothing but the one action.
          <div style={{ display: "flex", justifyContent: "center", padding: "20vh 0" }}>
            <button style={bigTrackBtn} onClick={() => setView("templatePicker")}>
              <Plus size={22} style={{ marginRight: 8 }} /> Track a symptom
            </button>
          </div>
        ) : (
          <>
            {activeTrackers.map((t) => (
              <TrackerCard
                key={t.id}
                tracker={t}
                series={trackerSeries(t.id)}
                latest={latestEntryFor(t.id)}
                unitSystem={profile.unitSystem}
                draftValue={draftValues[t.id]}
                onDraftChange={(v) => setDraftValues((d) => ({ ...d, [t.id]: v }))}
                onLog={(v) => logValue(t.id, v, t.type === "temperature")}
                onArchive={() => archiveTracker(t.id)}
              />
            ))}

            <button style={secondaryTrackBtn} onClick={() => setView("templatePicker")}>
              <Plus size={18} style={{ marginRight: 6 }} /> Track a symptom
            </button>

            <MedicationSection
              meds={meds}
              medName={medName}
              setMedName={setMedName}
              medDose={medDose}
              setMedDose={setMedDose}
              onAdd={addMedication}
              onDelete={deleteMed}
              catalogCount={medCatalogCount}
              knownMedNames={knownMedNames}
            />

            <ReportSection
              show={showReport}
              setShow={setShowReport}
              text={reportText}
              onCopy={copyReport}
              copied={reportCopied}
            />
          </>
        )}

        {saveError && (
          <div style={{ ...errorStyle, marginTop: 16 }}>
            Couldn't save changes — your entries are still here in this session, but retry saving before closing the app.
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Subcomponents ----------

function Screen({ title, children }) {
  return (
    <div style={{ background: paper, minHeight: "100vh", color: ink, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <GlobalStyle />
      <div style={{ width: "100%", maxWidth: 380, padding: "0 20px" }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16, fontFamily: "Georgia, serif" }}>{title}</h1>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: inkSoft, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.4 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function TrackerCard({ tracker, series, latest, unitSystem, draftValue, onDraftChange, onLog, onArchive }) {
  const unitLabel = tracker.type === "temperature" ? tempUnitLabel(unitSystem) : null;
  return (
    <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 16, padding: 14, marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ fontSize: 16, fontWeight: 700 }}>{tracker.name}</div>
        <button aria-label={`Archive ${tracker.name}`} onClick={onArchive} style={iconBtn}>
          <Trash2 size={16} color={inkSoft} />
        </button>
      </div>

      <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
        <Sparkline points={series} kind={tracker.type} unitSystem={unitSystem} scaleMax={tracker.scaleMax} />
        <div style={{ flex: 1, minWidth: 140 }}>
          {tracker.type === "temperature" && (
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="number"
                inputMode="decimal"
                step="0.1"
                placeholder={unitSystem === "imperial" ? "98.6" : "37.0"}
                value={draftValue ?? ""}
                onChange={(e) => onDraftChange(e.target.value === "" ? "" : parseFloat(e.target.value))}
                style={{ ...inputStyle, width: 90 }}
              />
              <span style={{ fontSize: 13, color: inkSoft }}>{unitLabel}</span>
              <button style={primaryBtnSmall} onClick={() => draftValue !== undefined && draftValue !== "" && onLog(draftValue)}>
                Log
              </button>
            </div>
          )}
          {tracker.type === "scale" && (
            <div style={{ display: "flex", gap: 6 }}>
              {Array.from({ length: (tracker.scaleMax || 5) + 1 }, (_, n) => n).map((n) => (
                <button key={n} style={scaleBtn} onClick={() => onLog(n)}>{n}</button>
              ))}
            </div>
          )}
          {tracker.type === "boolean" && (
            <div style={{ display: "flex", gap: 8 }}>
              <button style={{ ...scaleBtn, width: "auto", padding: "8px 14px" }} onClick={() => onLog(true)}>Present</button>
              <button style={{ ...scaleBtn, width: "auto", padding: "8px 14px" }} onClick={() => onLog(false)}>Absent</button>
            </div>
          )}
          {latest && (
            <div style={{ fontSize: 12, color: inkSoft, marginTop: 6 }}>
              Last: {typeof latest.values[tracker.id] === "boolean"
                ? (latest.values[tracker.id] ? "Present" : "Absent")
                : tracker.type === "temperature"
                  ? displayTemp(latest.values[tracker.id], unitSystem).toFixed(1)
                  : latest.values[tracker.id]}
              {unitLabel || ""} · {fmtTimeShort(latest.timestamp)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TemplatePicker({ query, setQuery, templates, remainingSlots, openTemplateId, openTemplate, selectedTrackerNames, toggleTrackerSelection, addSelectedTrackers, onClose }) {
  const activeTemplate = templates.find((t) => t.id === openTemplateId) || TEMPLATES.find((t) => t.id === openTemplateId);

  if (openTemplateId && activeTemplate) {
    const overLimit = selectedTrackerNames.length > remainingSlots;
    return (
      <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 16, padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <button aria-label="Back" style={iconBtn} onClick={() => openTemplate(null)}>
            <ChevronLeft size={20} />
          </button>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{activeTemplate.label}</div>
        </div>
        <p style={{ fontSize: 13, color: inkSoft, margin: "4px 0 12px" }}>Choose which to track — up to {remainingSlots} on the free plan.</p>
        {activeTemplate.trackers.map((tr) => {
          const checked = selectedTrackerNames.includes(tr.name);
          return (
            <label key={tr.name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 4px", borderBottom: `1px solid ${paperDark}`, cursor: "pointer" }}>
              <input type="checkbox" checked={checked} onChange={() => toggleTrackerSelection(tr.name)} style={{ width: 20, height: 20, accentColor: teal }} />
              <span style={{ fontSize: 15 }}>{tr.name}</span>
            </label>
          );
        })}
        {overLimit && (
          <div style={{ ...errorStyle, marginTop: 10 }}>
            Free plan: {remainingSlots} tracker{remainingSlots === 1 ? "" : "s"} available — uncheck one to continue.
          </div>
        )}
        {remainingSlots === 0 && (
          <div style={{ ...errorStyle, marginTop: 10 }}>
            You've reached the free plan's 3-tracker limit. Archive an existing tracker to add a new one.
          </div>
        )}
        <button
          style={{ ...primaryBtn, marginTop: 14, opacity: selectedTrackerNames.length === 0 || overLimit || remainingSlots === 0 ? 0.5 : 1 }}
          disabled={selectedTrackerNames.length === 0 || overLimit || remainingSlots === 0}
          onClick={addSelectedTrackers}
        >
          Add {selectedTrackerNames.length || ""} tracker{selectedTrackerNames.length === 1 ? "" : "s"}
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <button aria-label="Close" style={iconBtn} onClick={onClose}>
          <X size={20} />
        </button>
        <div style={{ fontSize: 18, fontWeight: 700 }}>Track a symptom</div>
      </div>
      <div style={{ position: "relative", marginBottom: 14 }}>
        <Search size={16} color={inkSoft} style={{ position: "absolute", left: 12, top: 14 }} />
        <input
          placeholder="Search — cough, rash, headache..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ ...inputStyle, paddingLeft: 34 }}
          autoFocus
        />
      </div>
      {templates.map((t) => (
        <button key={t.id} style={templateRow} onClick={() => openTemplate(t.id)}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>{t.label}</div>
          <div style={{ fontSize: 12, color: inkSoft, marginTop: 2 }}>{t.description}</div>
        </button>
      ))}
      {templates.length === 0 && <div style={{ fontSize: 13, color: inkSoft, padding: "10px 4px" }}>No matches — try a different word.</div>}
    </div>
  );
}

function MedicationSection({ meds, medName, setMedName, medDose, setMedDose, onAdd, onDelete, catalogCount, knownMedNames }) {
  const sorted = [...meds].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 6);
  const isNewDistinct = medName.trim() && !knownMedNames.includes(medName.trim().toLowerCase());
  const atCap = isNewDistinct && catalogCount >= MAX_MEDICATIONS;
  return (
    <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 16, padding: 14, marginTop: 20, marginBottom: 16 }}>
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>Medications</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <input placeholder="Ibuprofen" value={medName} onChange={(e) => setMedName(e.target.value)} style={{ ...inputStyle, flex: 1.4 }} />
        <input placeholder="200 mg" value={medDose} onChange={(e) => setMedDose(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
      </div>
      {atCap && (
        <div style={{ ...errorStyle, marginBottom: 8 }}>Free plan: 15 medications tracked. Delete an unused one to add a new name.</div>
      )}
      <button style={{ ...primaryBtnSmall, opacity: !medName.trim() || atCap ? 0.5 : 1 }} disabled={!medName.trim() || atCap} onClick={onAdd}>
        Add medication
      </button>
      {sorted.length > 0 && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${paperDark}` }}>
          {sorted.map((m) => (
            <div key={m.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
              <div style={{ fontSize: 14 }}>
                {m.name}{m.dose ? ` · ${m.dose}` : ""} <span style={{ color: inkSoft, fontSize: 12 }}>· {fmtTime(m.timestamp)}</span>
              </div>
              <button aria-label="Delete" style={iconBtn} onClick={() => onDelete(m.id)}><Trash2 size={14} color={inkSoft} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ReportSection({ show, setShow, text, onCopy, copied }) {
  return (
    <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 16, padding: 14 }}>
      <button style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: 16, fontWeight: 700, color: ink }} onClick={() => setShow((s) => !s)}>
        <FileText size={18} /> Report (last 72 hours)
      </button>
      {show && (
        <div style={{ marginTop: 12 }}>
          <pre style={{ whiteSpace: "pre-wrap", fontFamily: "monospace", fontSize: 12, background: paper, border: `1px solid ${border}`, borderRadius: 10, padding: 10 }}>
            {text}
          </pre>
          <button style={primaryBtnSmall} onClick={onCopy}>
            <Copy size={14} style={{ marginRight: 6 }} /> {copied ? "Copied" : "Copy report"}
          </button>
        </div>
      )}
    </div>
  );
}

function GlobalStyle() {
  return (
    <style>{`
      * { box-sizing: border-box; }
      body { margin: 0; }
      button, input { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; }
      button:focus-visible, input:focus-visible { outline: 3px solid ${blue}; outline-offset: 2px; }
      button:active { opacity: 0.85; }
      @media (prefers-reduced-motion: no-preference) { /* intentionally no transitions anywhere */ }
    `}</style>
  );
}

// ---------- Shared inline styles (kept static — no animated properties) ----------
const inputStyle = {
  width: "100%", border: `1px solid ${border}`, borderRadius: 10, padding: "12px 12px",
  fontSize: 16, background: paper, color: ink,
};
const primaryBtn = {
  width: "100%", background: ink, color: paper, border: "none", borderRadius: 12,
  padding: "14px 0", fontSize: 16, fontWeight: 700, cursor: "pointer",
};
const primaryBtnSmall = {
  background: ink, color: paper, border: "none", borderRadius: 10,
  padding: "10px 16px", fontSize: 14, fontWeight: 700, cursor: "pointer",
};
const bigTrackBtn = {
  display: "flex", alignItems: "center", justifyContent: "center",
  background: ink, color: paper, border: "none", borderRadius: 16,
  padding: "22px 32px", fontSize: 19, fontWeight: 700, cursor: "pointer",
};
const secondaryTrackBtn = {
  width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
  background: paperDark, color: ink, border: `1px solid ${border}`, borderRadius: 12,
  padding: "14px 0", fontSize: 15, fontWeight: 700, cursor: "pointer", marginBottom: 8,
};
const scaleBtn = {
  width: 38, height: 38, borderRadius: 8, border: `1px solid ${border}`,
  background: paper, color: ink, fontWeight: 700, fontSize: 14, cursor: "pointer",
};
const iconBtn = {
  background: "none", border: "none", cursor: "pointer", padding: 6, display: "flex", alignItems: "center",
};
const linkBtn = {
  width: "100%", background: "none", border: "none", color: blue, fontSize: 13, fontWeight: 600,
  cursor: "pointer", padding: "10px 0", textAlign: "center",
};
const linkBtnSmall = {
  background: "none", border: `1px solid ${border}`, color: inkSoft, fontSize: 12, fontWeight: 600,
  cursor: "pointer", padding: "6px 10px", borderRadius: 8,
};
const toggleBtn = {
  flex: 1, padding: "9px 0", borderRadius: 9, border: `1px solid ${border}`,
  background: paper, color: ink, fontWeight: 700, fontSize: 13, cursor: "pointer",
};
const toggleBtnActive = {
  background: ink, color: paper, borderColor: ink,
};
const templateRow = {
  width: "100%", textAlign: "left", background: card, border: `1px solid ${border}`,
  borderRadius: 12, padding: "12px 14px", marginBottom: 8, cursor: "pointer",
};
const errorStyle = {
  background: redSoft, color: red, border: `1px solid ${red}`, borderRadius: 10,
  padding: "10px 12px", fontSize: 13, marginBottom: 10,
};
