import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceArea, ReferenceLine, ResponsiveContainer, Dot
} from "recharts";
import { Plus, Thermometer, X, Trash2, ChevronDown, ChevronUp, Clock, Settings2, Check } from "lucide-react";

const STORAGE_KEY = "care-log-data-v1";

const PALETTE = {
  paper: "#F7F4EE",
  paperDark: "#EFEAE0",
  card: "#FFFDF9",
  ink: "#232320",
  inkSoft: "#7A7362",
  border: "#DDD6C7",
  teal: "#2F6F68",
  tealSoft: "#DCEAE7",
  amber: "#D98B3F",
  amberSoft: "#F5E3CB",
  red: "#C1443C",
  redSoft: "#F3DBD8",
  blue: "#4F6C8C",
  blueSoft: "#E2E8EE",
};

const DEFAULT_TRACKERS = [
  { id: "temp", name: "Temperature", type: "temperature", unit: "°F" },
];

const TYPE_LABEL = {
  temperature: "Temperature (°F)",
  scale: "Severity (0–5)",
  boolean: "Present / absent",
};

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function fmtTime(iso) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
}

function fmtTimeShort(iso) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { hour: "numeric", minute: "2-digit" });
}

function tempZone(f) {
  if (f == null || isNaN(f)) return null;
  if (f < 99) return "normal";
  if (f < 100.4) return "low";
  return "fever";
}

function zoneColor(zone) {
  if (zone === "fever") return PALETTE.red;
  if (zone === "low") return PALETTE.amber;
  if (zone === "normal") return PALETTE.teal;
  return PALETTE.inkSoft;
}

function toLocalInputValue(iso) {
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 16);
}

export default function CareLog() {
  const [trackers, setTrackers] = useState(DEFAULT_TRACKERS);
  const [entries, setEntries] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const skippedInitialPersist = useRef(false);

  const [draft, setDraft] = useState({});
  const [draftTime, setDraftTime] = useState(() => toLocalInputValue(new Date().toISOString()));
  const [note, setNote] = useState("");
  const [showManage, setShowManage] = useState(false);
  const [chartTrackerId, setChartTrackerId] = useState("temp");
  const [newTrackerName, setNewTrackerName] = useState("");
  const [newTrackerType, setNewTrackerType] = useState("scale");
  const [editingId, setEditingId] = useState(null);
  const [collapsedOlder, setCollapsedOlder] = useState(true);

  const [meds, setMeds] = useState([]);
  const [medDraft, setMedDraft] = useState({
    name: "",
    dose: "",
    time: toLocalInputValue(new Date().toISOString()),
  });
  const [editingMedId, setEditingMedId] = useState(null);
  const [collapsedOlderMeds, setCollapsedOlderMeds] = useState(true);
  const [showMedOverlay, setShowMedOverlay] = useState(true);

  const [showBackup, setShowBackup] = useState(false);
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState("");
  const [importSuccess, setImportSuccess] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get(STORAGE_KEY, false);
        if (res && res.value) {
          const parsed = JSON.parse(res.value);
          if (parsed.trackers && parsed.trackers.length) setTrackers(parsed.trackers);
          if (parsed.entries) setEntries(parsed.entries);
          if (parsed.meds) setMeds(parsed.meds);
          if (parsed.trackers && parsed.trackers[0]) setChartTrackerId(parsed.trackers[0].id);
        }
      } catch (e) {
        // no existing data yet, that's fine
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  const persist = useCallback(async (nextTrackers, nextEntries, nextMeds) => {
    const payload = JSON.stringify({ trackers: nextTrackers, entries: nextEntries, meds: nextMeds });
    const attempts = 3;
    for (let i = 0; i < attempts; i++) {
      try {
        const result = await window.storage.set(STORAGE_KEY, payload, false);
        if (result) {
          setSaveError(false);
          return;
        }
        console.error("care-log: storage.set returned no result", { attempt: i + 1 });
      } catch (e) {
        console.error("care-log: storage.set threw", { attempt: i + 1, error: e });
      }
      if (i < attempts - 1) await sleep(400 * (i + 1));
    }
    setSaveError(true);
  }, []);

  const retrySave = useCallback(() => {
    setSaveError(false);
    persist(trackers, entries, meds);
  }, [persist, trackers, entries, meds]);

  useEffect(() => {
    if (!loaded) return;
    // The render right after load completes reflects whatever we just read
    // (or failed to read). Skip saving on that one transition so a bad or
    // empty read can never overwrite previously saved data — only genuine
    // user edits after this point trigger a save.
    if (!skippedInitialPersist.current) {
      skippedInitialPersist.current = true;
      return;
    }
    persist(trackers, entries, meds);
  }, [trackers, entries, meds, loaded, persist]);

  const tempTracker = trackers.find((t) => t.type === "temperature");

  const sortedEntries = useMemo(
    () => [...entries].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)),
    [entries]
  );

  const chartData = useMemo(() => {
    const tracker = trackers.find((t) => t.id === chartTrackerId);
    if (!tracker || tracker.type === "boolean") return [];
    return [...entries]
      .filter((e) => e.values[tracker.id] != null)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
      .map((e) => ({
        t: new Date(e.timestamp).getTime(),
        v: e.values[tracker.id],
        label: fmtTimeShort(e.timestamp),
      }));
  }, [entries, trackers, chartTrackerId]);

  const booleanTracker = trackers.find((t) => t.type === "boolean" && t.id === chartTrackerId);
  const booleanHistory = useMemo(() => {
    if (!booleanTracker) return [];
    return [...entries]
      .filter((e) => e.values[booleanTracker.id])
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }, [entries, booleanTracker]);

  const sortedMeds = useMemo(
    () => [...meds].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)),
    [meds]
  );

  const medsInRange = useMemo(() => {
    if (!showMedOverlay || booleanTracker || chartData.length === 0) return [];
    const tMin = chartData[0].t;
    const tMax = chartData[chartData.length - 1].t;
    const span = Math.max(tMax - tMin, 1);
    const pad = span * 0.03;
    return meds
      .map((m) => ({ ...m, t: new Date(m.timestamp).getTime() }))
      .filter((m) => m.t >= tMin - pad && m.t <= tMax + pad)
      .sort((a, b) => a.t - b.t);
  }, [meds, chartData, showMedOverlay, booleanTracker]);

  const latestByTracker = useMemo(() => {
    const map = {};
    for (const t of trackers) {
      const withVal = sortedEntries.find((e) => e.values[t.id] != null);
      if (withVal) map[t.id] = { value: withVal.values[t.id], at: withVal.timestamp };
    }
    return map;
  }, [trackers, sortedEntries]);

  function startEdit(entry) {
    setEditingId(entry.id);
    setDraft({ ...entry.values });
    setNote(entry.note || "");
    setDraftTime(toLocalInputValue(entry.timestamp));
  }

  function resetForm() {
    setDraft({});
    setNote("");
    setDraftTime(toLocalInputValue(new Date().toISOString()));
    setEditingId(null);
  }

  function saveEntry() {
    const hasAnyValue = Object.values(draft).some((v) => v !== undefined && v !== null && v !== "");
    if (!hasAnyValue) return;
    const iso = new Date(draftTime).toISOString();
    const cleaned = {};
    for (const [k, v] of Object.entries(draft)) {
      if (v === undefined || v === "" || v === null) continue;
      cleaned[k] = v;
    }
    if (editingId) {
      setEntries((prev) =>
        prev.map((e) => (e.id === editingId ? { ...e, timestamp: iso, values: cleaned, note } : e))
      );
    } else {
      setEntries((prev) => [...prev, { id: uid(), timestamp: iso, values: cleaned, note }]);
    }
    resetForm();
  }

  function deleteEntry(id) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    if (editingId === id) resetForm();
  }

  function addTracker() {
    const name = newTrackerName.trim();
    if (!name) return;
    const t = {
      id: uid(),
      name,
      type: newTrackerType,
      ...(newTrackerType === "temperature" ? { unit: "°F" } : {}),
    };
    setTrackers((prev) => [...prev, t]);
    setNewTrackerName("");
    setNewTrackerType("scale");
  }

  function removeTracker(id) {
    if (trackers.length <= 1) return;
    setTrackers((prev) => prev.filter((t) => t.id !== id));
    setEntries((prev) =>
      prev.map((e) => {
        const { [id]: _, ...rest } = e.values;
        return { ...e, values: rest };
      })
    );
    if (chartTrackerId === id) {
      const remaining = trackers.filter((t) => t.id !== id);
      if (remaining[0]) setChartTrackerId(remaining[0].id);
    }
  }

  function startEditMed(med) {
    setEditingMedId(med.id);
    setMedDraft({ name: med.name, dose: med.dose || "", time: toLocalInputValue(med.timestamp) });
  }

  function resetMedForm() {
    setMedDraft({ name: "", dose: "", time: toLocalInputValue(new Date().toISOString()) });
    setEditingMedId(null);
  }

  function saveMed() {
    const name = medDraft.name.trim();
    if (!name) return;
    const iso = new Date(medDraft.time).toISOString();
    if (editingMedId) {
      setMeds((prev) =>
        prev.map((m) => (m.id === editingMedId ? { ...m, name, dose: medDraft.dose.trim(), timestamp: iso } : m))
      );
    } else {
      setMeds((prev) => [...prev, { id: uid(), name, dose: medDraft.dose.trim(), timestamp: iso }]);
    }
    resetMedForm();
  }

  function deleteMed(id) {
    setMeds((prev) => prev.filter((m) => m.id !== id));
    if (editingMedId === id) resetMedForm();
  }

  const backupText = useMemo(
    () => JSON.stringify({ trackers, entries, meds }, null, 2),
    [trackers, entries, meds]
  );

  async function copyBackup() {
    try {
      await navigator.clipboard.writeText(backupText);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (e) {
      // clipboard permission may be blocked; the textarea is still there to select manually
      setCopySuccess(false);
    }
  }

  function restoreBackup() {
    setImportError("");
    setImportSuccess(false);
    try {
      const parsed = JSON.parse(importText);
      if (!parsed || typeof parsed !== "object") throw new Error("not an object");
      if (!Array.isArray(parsed.trackers) || !Array.isArray(parsed.entries)) {
        throw new Error("missing trackers or entries");
      }
      setTrackers(parsed.trackers.length ? parsed.trackers : DEFAULT_TRACKERS);
      setEntries(parsed.entries);
      setMeds(Array.isArray(parsed.meds) ? parsed.meds : []);
      setImportText("");
      setImportSuccess(true);
      setTimeout(() => setImportSuccess(false), 2500);
    } catch (e) {
      setImportError("That doesn't look like a valid backup — paste the exact text you copied earlier.");
    }
  }

  const knownMedNames = useMemo(
    () => [...new Set(meds.map((m) => m.name))],
    [meds]
  );

  const recentEntries = sortedEntries.slice(0, 6);
  const olderEntries = sortedEntries.slice(6);
  const recentMeds = sortedMeds.slice(0, 4);
  const olderMeds = sortedMeds.slice(4);

  return (
    <div style={{ background: PALETTE.paper, minHeight: "100vh", color: PALETTE.ink }}>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; }
        .clog-serif { font-family: Georgia, "Iowan Old Style", "Times New Roman", serif; }
        .clog-sans { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; }
        .clog-btn { transition: transform .12s ease, box-shadow .12s ease, background .12s ease; }
        .clog-btn:active { transform: scale(0.96); }
        .clog-tap:focus-visible, .clog-btn:focus-visible, input:focus-visible, textarea:focus-visible {
          outline: 2px solid ${PALETTE.teal}; outline-offset: 2px;
        }
        @media (prefers-reduced-motion: reduce) {
          .clog-btn { transition: none; }
        }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-thumb { background: ${PALETTE.border}; border-radius: 8px; }
      `}</style>

      <div style={{ maxWidth: 560, margin: "0 auto", padding: "20px 16px 96px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 4 }}>
          <h1 className="clog-serif" style={{ fontSize: 26, fontWeight: 700, margin: 0, letterSpacing: -0.3 }}>
            Care Log
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <button
              className="clog-btn clog-tap"
              onClick={() => setShowBackup((s) => !s)}
              style={{
                display: "flex", alignItems: "center", gap: 6, background: "transparent",
                border: "none", color: PALETTE.inkSoft, fontSize: 13, cursor: "pointer", padding: 6,
              }}
            >
              Backup
            </button>
            <button
              className="clog-btn clog-tap"
              onClick={() => setShowManage((s) => !s)}
              style={{
                display: "flex", alignItems: "center", gap: 6, background: "transparent",
                border: "none", color: PALETTE.inkSoft, fontSize: 13, cursor: "pointer", padding: 6,
              }}
            >
              <Settings2 size={16} /> Trackers
            </button>
          </div>
        </div>
        <p className="clog-sans" style={{ fontSize: 13, color: PALETTE.inkSoft, margin: "0 0 18px" }}>
          {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
        </p>

        {/* Latest readings strip */}
        {trackers.length > 0 && (
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, marginBottom: 18 }}>
            {trackers.map((t) => {
              const latest = latestByTracker[t.id];
              const zone = t.type === "temperature" && latest ? tempZone(latest.value) : null;
              const bg = zone ? (zone === "fever" ? PALETTE.redSoft : zone === "low" ? PALETTE.amberSoft : PALETTE.tealSoft) : PALETTE.paperDark;
              const fg = zone ? zoneColor(zone) : PALETTE.inkSoft;
              return (
                <div
                  key={t.id}
                  style={{
                    flex: "0 0 auto", minWidth: 118, background: bg, borderRadius: 14,
                    padding: "10px 12px", border: `1px solid ${PALETTE.border}`,
                  }}
                >
                  <div className="clog-sans" style={{ fontSize: 11, color: fg, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4 }}>
                    {t.name}
                  </div>
                  <div className="clog-serif" style={{ fontSize: 20, fontWeight: 700, marginTop: 2, color: PALETTE.ink }}>
                    {latest
                      ? t.type === "boolean"
                        ? "Yes"
                        : `${latest.value}${t.type === "temperature" ? "°" : ""}`
                      : "—"}
                  </div>
                  <div className="clog-sans" style={{ fontSize: 11, color: PALETTE.inkSoft, marginTop: 1 }}>
                    {latest ? fmtTimeShort(latest.at) : "no data yet"}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Backup & restore panel */}
        {showBackup && (
          <div style={{
            background: PALETTE.card, border: `1px solid ${PALETTE.border}`, borderRadius: 16,
            padding: 14, marginBottom: 18,
          }}>
            <div className="clog-sans" style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: PALETTE.inkSoft, marginBottom: 10 }}>
              Backup & restore
            </div>
            <p className="clog-sans" style={{ fontSize: 13, color: PALETTE.inkSoft, margin: "0 0 10px" }}>
              If saving ever fails, copy this out and paste it somewhere safe (notes app, email to yourself). You can paste it back in below to restore.
            </p>
            <textarea
              readOnly
              value={backupText}
              rows={4}
              className="clog-sans"
              onFocus={(e) => e.target.select()}
              style={{
                width: "100%", border: `1px solid ${PALETTE.border}`, borderRadius: 10,
                padding: "9px 10px", fontSize: 11, background: PALETTE.paper, color: PALETTE.ink,
                resize: "vertical", fontFamily: "monospace",
              }}
            />
            <button
              className="clog-btn clog-tap clog-sans"
              onClick={copyBackup}
              style={{
                marginTop: 8, background: copySuccess ? PALETTE.teal : PALETTE.ink, color: "white",
                border: "none", borderRadius: 10, padding: "9px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer",
              }}
            >
              {copySuccess ? "Copied" : "Copy backup"}
            </button>

            <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${PALETTE.paperDark}` }}>
              <label className="clog-sans" style={{ fontSize: 12, fontWeight: 600, color: PALETTE.inkSoft, textTransform: "uppercase", letterSpacing: 0.4, display: "block", marginBottom: 6 }}>
                Restore from backup
              </label>
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="Paste a previously copied backup here"
                rows={3}
                className="clog-sans"
                style={{
                  width: "100%", border: `1px solid ${PALETTE.border}`, borderRadius: 10,
                  padding: "9px 10px", fontSize: 12, background: PALETTE.paper, color: PALETTE.ink,
                  resize: "vertical", fontFamily: "monospace",
                }}
              />
              {importError && (
                <div className="clog-sans" style={{ fontSize: 12, color: PALETTE.red, marginTop: 6 }}>{importError}</div>
              )}
              {importSuccess && (
                <div className="clog-sans" style={{ fontSize: 12, color: PALETTE.teal, marginTop: 6 }}>Restored.</div>
              )}
              <button
                className="clog-btn clog-tap clog-sans"
                onClick={restoreBackup}
                disabled={!importText.trim()}
                style={{
                  marginTop: 8, background: importText.trim() ? PALETTE.blue : PALETTE.paperDark,
                  color: importText.trim() ? "white" : PALETTE.inkSoft,
                  border: "none", borderRadius: 10, padding: "9px 14px", fontSize: 13, fontWeight: 700,
                  cursor: importText.trim() ? "pointer" : "default",
                }}
              >
                Restore this data
              </button>
            </div>
          </div>
        )}

        {/* Manage trackers panel */}
        {showManage && (
          <div style={{
            background: PALETTE.card, border: `1px solid ${PALETTE.border}`, borderRadius: 16,
            padding: 14, marginBottom: 18,
          }}>
            <div className="clog-sans" style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: PALETTE.inkSoft, marginBottom: 10 }}>
              Manage trackers
            </div>
            {trackers.map((t) => (
              <div key={t.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${PALETTE.paperDark}` }}>
                <div>
                  <div className="clog-sans" style={{ fontSize: 14, fontWeight: 600 }}>{t.name}</div>
                  <div className="clog-sans" style={{ fontSize: 12, color: PALETTE.inkSoft }}>{TYPE_LABEL[t.type]}</div>
                </div>
                {trackers.length > 1 && (
                  <button
                    className="clog-btn clog-tap"
                    onClick={() => removeTracker(t.id)}
                    style={{ background: "transparent", border: "none", color: PALETTE.red, cursor: "pointer", padding: 6 }}
                    aria-label={`Remove ${t.name}`}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <input
                className="clog-sans"
                placeholder="New symptom, e.g. Cough"
                value={newTrackerName}
                onChange={(e) => setNewTrackerName(e.target.value)}
                style={{
                  flex: 1, border: `1px solid ${PALETTE.border}`, borderRadius: 10,
                  padding: "9px 10px", fontSize: 14, background: PALETTE.paper,
                }}
              />
              <select
                className="clog-sans"
                value={newTrackerType}
                onChange={(e) => setNewTrackerType(e.target.value)}
                style={{
                  border: `1px solid ${PALETTE.border}`, borderRadius: 10, padding: "9px 8px",
                  fontSize: 13, background: PALETTE.paper, color: PALETTE.ink,
                }}
              >
                <option value="scale">Severity 0–5</option>
                <option value="boolean">Present / absent</option>
                <option value="temperature">Temperature</option>
              </select>
              <button
                className="clog-btn clog-tap"
                onClick={addTracker}
                style={{
                  background: PALETTE.teal, color: "white", border: "none", borderRadius: 10,
                  padding: "0 14px", cursor: "pointer", display: "flex", alignItems: "center",
                }}
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Quick log form */}
        <div style={{
          background: PALETTE.card, border: `1px solid ${PALETTE.border}`, borderRadius: 18,
          padding: 16, marginBottom: 20, boxShadow: "0 1px 2px rgba(35,35,32,0.04)",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div className="clog-serif" style={{ fontSize: 17, fontWeight: 700 }}>
              {editingId ? "Edit entry" : "Log a reading"}
            </div>
            {editingId && (
              <button className="clog-btn clog-tap" onClick={resetForm} style={{ background: "transparent", border: "none", color: PALETTE.inkSoft, cursor: "pointer" }}>
                <X size={16} />
              </button>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {trackers.map((t) => (
              <div key={t.id}>
                <label className="clog-sans" style={{ fontSize: 12, fontWeight: 600, color: PALETTE.inkSoft, textTransform: "uppercase", letterSpacing: 0.4, display: "block", marginBottom: 6 }}>
                  {t.name}
                </label>

                {t.type === "temperature" && (
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Thermometer size={18} color={PALETTE.inkSoft} />
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.1"
                      placeholder="98.6"
                      value={draft[t.id] ?? ""}
                      onChange={(e) => setDraft((d) => ({ ...d, [t.id]: e.target.value === "" ? "" : parseFloat(e.target.value) }))}
                      style={{
                        flex: 1, fontSize: 22, fontWeight: 700, border: `1px solid ${PALETTE.border}`,
                        borderRadius: 12, padding: "10px 12px", background: PALETTE.paper, color: PALETTE.ink,
                      }}
                      className="clog-serif"
                    />
                    <span className="clog-sans" style={{ color: PALETTE.inkSoft, fontSize: 14 }}>°F</span>
                  </div>
                )}

                {t.type === "scale" && (
                  <div style={{ display: "flex", gap: 6 }}>
                    {[0, 1, 2, 3, 4, 5].map((n) => {
                      const active = draft[t.id] === n;
                      return (
                        <button
                          key={n}
                          className="clog-btn clog-tap"
                          onClick={() => setDraft((d) => ({ ...d, [t.id]: active ? "" : n }))}
                          style={{
                            flex: 1, padding: "10px 0", borderRadius: 10, cursor: "pointer",
                            border: `1px solid ${active ? PALETTE.teal : PALETTE.border}`,
                            background: active ? PALETTE.teal : PALETTE.paper,
                            color: active ? "white" : PALETTE.ink, fontWeight: 700, fontSize: 14,
                          }}
                        >
                          {n}
                        </button>
                      );
                    })}
                  </div>
                )}

                {t.type === "boolean" && (
                  <div style={{ display: "flex", gap: 8 }}>
                    {[{ v: true, label: "Present" }, { v: false, label: "Absent" }].map((opt) => {
                      const active = draft[t.id] === opt.v;
                      return (
                        <button
                          key={opt.label}
                          className="clog-btn clog-tap"
                          onClick={() => setDraft((d) => ({ ...d, [t.id]: active ? "" : opt.v }))}
                          style={{
                            flex: 1, padding: "10px 0", borderRadius: 10, cursor: "pointer",
                            border: `1px solid ${active ? PALETTE.teal : PALETTE.border}`,
                            background: active ? PALETTE.teal : PALETTE.paper,
                            color: active ? "white" : PALETTE.ink, fontWeight: 600, fontSize: 13,
                            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                          }}
                        >
                          {active && <Check size={14} />} {opt.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}

            <div>
              <label className="clog-sans" style={{ fontSize: 12, fontWeight: 600, color: PALETTE.inkSoft, textTransform: "uppercase", letterSpacing: 0.4, display: "block", marginBottom: 6 }}>
                <Clock size={12} style={{ verticalAlign: -1, marginRight: 4 }} />When
              </label>
              <input
                type="datetime-local"
                value={draftTime}
                onChange={(e) => setDraftTime(e.target.value)}
                className="clog-sans"
                style={{
                  width: "100%", border: `1px solid ${PALETTE.border}`, borderRadius: 10,
                  padding: "9px 10px", fontSize: 14, background: PALETTE.paper, color: PALETTE.ink,
                }}
              />
            </div>

            <div>
              <label className="clog-sans" style={{ fontSize: 12, fontWeight: 600, color: PALETTE.inkSoft, textTransform: "uppercase", letterSpacing: 0.4, display: "block", marginBottom: 6 }}>
                Note (optional)
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Gave ibuprofen, seemed drowsy..."
                rows={2}
                className="clog-sans"
                style={{
                  width: "100%", border: `1px solid ${PALETTE.border}`, borderRadius: 10,
                  padding: "9px 10px", fontSize: 14, background: PALETTE.paper, color: PALETTE.ink, resize: "vertical",
                }}
              />
            </div>

            <button
              className="clog-btn clog-tap"
              onClick={saveEntry}
              style={{
                background: PALETTE.ink, color: PALETTE.paper, border: "none", borderRadius: 12,
                padding: "13px 0", fontSize: 15, fontWeight: 700, cursor: "pointer", marginTop: 4,
              }}
            >
              {editingId ? "Save changes" : "Add entry"}
            </button>
          </div>
        </div>

        {/* Medication log */}
        <div style={{
          background: PALETTE.card, border: `1px solid ${PALETTE.border}`, borderRadius: 18,
          padding: 16, marginBottom: 20, boxShadow: "0 1px 2px rgba(35,35,32,0.04)",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div className="clog-serif" style={{ fontSize: 17, fontWeight: 700 }}>
              {editingMedId ? "Edit medication" : "Log medication"}
            </div>
            {editingMedId && (
              <button className="clog-btn clog-tap" onClick={resetMedForm} style={{ background: "transparent", border: "none", color: PALETTE.inkSoft, cursor: "pointer" }}>
                <X size={16} />
              </button>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ flex: 1.4 }}>
                <label className="clog-sans" style={{ fontSize: 12, fontWeight: 600, color: PALETTE.inkSoft, textTransform: "uppercase", letterSpacing: 0.4, display: "block", marginBottom: 6 }}>
                  Medication
                </label>
                <input
                  list="clog-med-names"
                  className="clog-sans"
                  placeholder="Ibuprofen"
                  value={medDraft.name}
                  onChange={(e) => setMedDraft((d) => ({ ...d, name: e.target.value }))}
                  style={{
                    width: "100%", border: `1px solid ${PALETTE.border}`, borderRadius: 10,
                    padding: "9px 10px", fontSize: 14, background: PALETTE.paper, color: PALETTE.ink,
                  }}
                />
                <datalist id="clog-med-names">
                  {knownMedNames.map((n) => <option key={n} value={n} />)}
                </datalist>
              </div>
              <div style={{ flex: 1 }}>
                <label className="clog-sans" style={{ fontSize: 12, fontWeight: 600, color: PALETTE.inkSoft, textTransform: "uppercase", letterSpacing: 0.4, display: "block", marginBottom: 6 }}>
                  Dose
                </label>
                <input
                  className="clog-sans"
                  placeholder="200 mg"
                  value={medDraft.dose}
                  onChange={(e) => setMedDraft((d) => ({ ...d, dose: e.target.value }))}
                  style={{
                    width: "100%", border: `1px solid ${PALETTE.border}`, borderRadius: 10,
                    padding: "9px 10px", fontSize: 14, background: PALETTE.paper, color: PALETTE.ink,
                  }}
                />
              </div>
            </div>

            <div>
              <label className="clog-sans" style={{ fontSize: 12, fontWeight: 600, color: PALETTE.inkSoft, textTransform: "uppercase", letterSpacing: 0.4, display: "block", marginBottom: 6 }}>
                <Clock size={12} style={{ verticalAlign: -1, marginRight: 4 }} />When given
              </label>
              <input
                type="datetime-local"
                value={medDraft.time}
                onChange={(e) => setMedDraft((d) => ({ ...d, time: e.target.value }))}
                className="clog-sans"
                style={{
                  width: "100%", border: `1px solid ${PALETTE.border}`, borderRadius: 10,
                  padding: "9px 10px", fontSize: 14, background: PALETTE.paper, color: PALETTE.ink,
                }}
              />
            </div>

            <button
              className="clog-btn clog-tap"
              onClick={saveMed}
              style={{
                background: PALETTE.blue, color: "white", border: "none", borderRadius: 12,
                padding: "13px 0", fontSize: 15, fontWeight: 700, cursor: "pointer", marginTop: 4,
              }}
            >
              {editingMedId ? "Save changes" : "Add medication"}
            </button>
          </div>

          {sortedMeds.length > 0 && (
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${PALETTE.paperDark}` }}>
              {recentMeds.map((m) => (
                <MedRow key={m.id} med={m} onEdit={() => startEditMed(m)} onDelete={() => deleteMed(m.id)} />
              ))}
              {olderMeds.length > 0 && (
                <>
                  {!collapsedOlderMeds && olderMeds.map((m) => (
                    <MedRow key={m.id} med={m} onEdit={() => startEditMed(m)} onDelete={() => deleteMed(m.id)} />
                  ))}
                  <button
                    className="clog-btn clog-tap clog-sans"
                    onClick={() => setCollapsedOlderMeds((c) => !c)}
                    style={{
                      width: "100%", background: "transparent", border: "none", color: PALETTE.blue,
                      fontSize: 13, fontWeight: 600, padding: "8px 0 0", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                    }}
                  >
                    {collapsedOlderMeds ? <>Show {olderMeds.length} more <ChevronDown size={14} /></> : <>Show less <ChevronUp size={14} /></>}
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Chart */}
        {trackers.length > 0 && (
          <div style={{
            background: PALETTE.card, border: `1px solid ${PALETTE.border}`, borderRadius: 18,
            padding: 16, marginBottom: 20,
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
              <div className="clog-serif" style={{ fontSize: 17, fontWeight: 700 }}>Trend</div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {!booleanTracker && meds.length > 0 && (
                  <label className="clog-sans" style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: PALETTE.inkSoft, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={showMedOverlay}
                      onChange={(e) => setShowMedOverlay(e.target.checked)}
                      style={{ accentColor: PALETTE.blue }}
                    />
                    Meds
                  </label>
                )}
                <select
                className="clog-sans"
                value={chartTrackerId}
                onChange={(e) => setChartTrackerId(e.target.value)}
                style={{
                  border: `1px solid ${PALETTE.border}`, borderRadius: 8, padding: "6px 8px",
                  fontSize: 13, background: PALETTE.paper, color: PALETTE.ink,
                }}
              >
                {trackers.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
                </select>
              </div>
            </div>

            {booleanTracker ? (
              booleanHistory.length === 0 ? (
                <EmptyChart label={booleanTracker.name} />
              ) : (
                <div>
                  <div className="clog-sans" style={{ fontSize: 12, color: PALETTE.inkSoft, marginBottom: 8 }}>
                    Marked present {booleanHistory.length} time{booleanHistory.length === 1 ? "" : "s"}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {booleanHistory.map((e) => (
                      <span key={e.id} className="clog-sans" style={{
                        background: PALETTE.tealSoft, color: PALETTE.teal, fontSize: 12,
                        padding: "5px 10px", borderRadius: 999, fontWeight: 600,
                      }}>
                        {fmtTime(e.timestamp)}
                      </span>
                    ))}
                  </div>
                </div>
              )
            ) : chartData.length === 0 ? (
              <EmptyChart label={trackers.find((t) => t.id === chartTrackerId)?.name || ""} />
            ) : (
              <div style={{ width: "100%", height: 200 }}>
                <ResponsiveContainer>
                  <LineChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                    {chartTrackerId === "temp" && tempTracker && (
                      <>
                        <ReferenceArea y1={95} y2={99} fill={PALETTE.tealSoft} fillOpacity={0.6} />
                        <ReferenceArea y1={99} y2={100.4} fill={PALETTE.amberSoft} fillOpacity={0.6} />
                        <ReferenceArea y1={100.4} y2={107} fill={PALETTE.redSoft} fillOpacity={0.6} />
                        <ReferenceLine y={100.4} stroke={PALETTE.red} strokeDasharray="4 3" strokeWidth={1} />
                      </>
                    )}
                    <CartesianGrid stroke={PALETTE.border} strokeDasharray="2 4" vertical={false} />
                    <XAxis
                      dataKey="t"
                      type="number"
                      domain={["dataMin", "dataMax"]}
                      tickFormatter={(t) => new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      tick={{ fontSize: 11, fill: PALETTE.inkSoft }}
                      axisLine={{ stroke: PALETTE.border }}
                      tickLine={false}
                    />
                    <YAxis
                      domain={chartTrackerId === "temp" ? [95, 106] : [0, 5]}
                      tick={{ fontSize: 11, fill: PALETTE.inkSoft }}
                      axisLine={false}
                      tickLine={false}
                      width={34}
                    />
                    <Tooltip
                      contentStyle={{ background: PALETTE.card, border: `1px solid ${PALETTE.border}`, borderRadius: 8, fontSize: 12 }}
                      labelFormatter={(t) => new Date(t).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                      formatter={(v) => [v, trackers.find((t) => t.id === chartTrackerId)?.name]}
                    />
                    <Line
                      type="monotone"
                      dataKey="v"
                      stroke={PALETTE.ink}
                      strokeWidth={2}
                      dot={(props) => {
                        const { cx, cy, payload, index } = props;
                        const zone = chartTrackerId === "temp" ? tempZone(payload.v) : null;
                        return <Dot key={`d-${index}`} cx={cx} cy={cy} r={3.5} fill={zoneColor(zone)} stroke="none" />;
                      }}
                      activeDot={{ r: 5 }}
                    />
                    {medsInRange.map((m) => (
                      <ReferenceLine
                        key={m.id}
                        x={m.t}
                        stroke={PALETTE.blue}
                        strokeOpacity={0.45}
                        strokeDasharray="3 3"
                        label={<MedMarkerLabel name={m.name} dose={m.dose} />}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {/* Entry list */}
        <div>
          <div className="clog-serif" style={{ fontSize: 17, fontWeight: 700, marginBottom: 10 }}>
            History
          </div>
          {sortedEntries.length === 0 ? (
            <div className="clog-sans" style={{ color: PALETTE.inkSoft, fontSize: 14, padding: "20px 4px" }}>
              No entries yet. Log your first reading above.
            </div>
          ) : (
            <>
              {recentEntries.map((e) => (
                <EntryRow key={e.id} entry={e} trackers={trackers} onEdit={() => startEdit(e)} onDelete={() => deleteEntry(e.id)} />
              ))}
              {olderEntries.length > 0 && (
                <>
                  {!collapsedOlder && olderEntries.map((e) => (
                    <EntryRow key={e.id} entry={e} trackers={trackers} onEdit={() => startEdit(e)} onDelete={() => deleteEntry(e.id)} />
                  ))}
                  <button
                    className="clog-btn clog-tap clog-sans"
                    onClick={() => setCollapsedOlder((c) => !c)}
                    style={{
                      width: "100%", background: "transparent", border: "none", color: PALETTE.teal,
                      fontSize: 13, fontWeight: 600, padding: "10px 0", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                    }}
                  >
                    {collapsedOlder ? <>Show {olderEntries.length} more <ChevronDown size={14} /></> : <>Show less <ChevronUp size={14} /></>}
                  </button>
                </>
              )}
            </>
          )}
        </div>

        {saveError && (
          <div className="clog-sans" style={{
            marginTop: 16, padding: "10px 12px", background: PALETTE.redSoft, border: `1px solid ${PALETTE.red}`,
            borderRadius: 10,
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <span style={{ fontSize: 12, color: PALETTE.red }}>
                Couldn't save changes — your entries are still here, but they aren't backed up yet.
              </span>
              <button
                className="clog-btn clog-tap"
                onClick={retrySave}
                style={{
                  background: PALETTE.red, color: "white", border: "none", borderRadius: 8,
                  padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", flexShrink: 0,
                }}
              >
                Retry
              </button>
            </div>
            <button
              className="clog-btn clog-tap"
              onClick={() => setShowBackup(true)}
              style={{
                marginTop: 8, background: "none", border: "none", color: PALETTE.red,
                fontSize: 12, fontWeight: 600, textDecoration: "underline", cursor: "pointer", padding: 0,
              }}
            >
              Copy a backup now, just in case
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyChart({ label }) {
  return (
    <div className="clog-sans" style={{ color: PALETTE.inkSoft, fontSize: 13, padding: "24px 4px", textAlign: "center" }}>
      No {label ? label.toLowerCase() : ""} readings yet — logged entries will chart here.
    </div>
  );
}

function MedMarkerLabel({ viewBox, name, dose }) {
  if (!viewBox) return null;
  const { x, y, height } = viewBox;
  const baseY = y + height;
  const label = dose ? `${name} · ${dose}` : name;
  return (
    <g>
      <circle cx={x} cy={baseY} r={3.5} fill={PALETTE.blue} stroke={PALETTE.card} strokeWidth={1} />
      <text
        x={x}
        y={baseY}
        transform={`rotate(-55 ${x} ${baseY})`}
        dx={6}
        dy={-5}
        fontSize={9.5}
        fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif"
        fontWeight={600}
        fill={PALETTE.blue}
        textAnchor="start"
      >
        {label}
      </text>
    </g>
  );
}

function MedRow({ med, onEdit, onDelete }) {
  return (
    <div
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 10, padding: "8px 0", borderBottom: `1px solid ${PALETTE.paperDark}`,
      }}
    >
      <button className="clog-tap" onClick={onEdit} style={{ background: "none", border: "none", padding: 0, textAlign: "left", cursor: "pointer", flex: 1 }}>
        <div className="clog-sans" style={{ fontSize: 14, fontWeight: 600, color: PALETTE.ink }}>
          {med.name}{med.dose ? <span style={{ color: PALETTE.inkSoft, fontWeight: 400 }}> · {med.dose}</span> : null}
        </div>
        <div className="clog-sans" style={{ fontSize: 12, color: PALETTE.inkSoft, marginTop: 1 }}>
          {fmtTime(med.timestamp)}
        </div>
      </button>
      <button
        className="clog-btn clog-tap"
        onClick={onDelete}
        aria-label="Delete medication"
        style={{ background: "none", border: "none", color: PALETTE.inkSoft, cursor: "pointer", padding: 4 }}
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
}

function EntryRow({ entry, trackers, onEdit, onDelete }) {
  return (
    <div
      style={{
        background: PALETTE.card, border: `1px solid ${PALETTE.border}`, borderRadius: 14,
        padding: "12px 14px", marginBottom: 8, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10,
      }}
    >
      <button className="clog-tap" onClick={onEdit} style={{ background: "none", border: "none", padding: 0, textAlign: "left", cursor: "pointer", flex: 1 }}>
        <div className="clog-sans" style={{ fontSize: 12, color: PALETTE.inkSoft, marginBottom: 4 }}>
          {fmtTime(entry.timestamp)}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: entry.note ? 6 : 0 }}>
          {trackers.map((t) => {
            const v = entry.values[t.id];
            if (v === undefined || v === null || v === "") return null;
            const zone = t.type === "temperature" ? tempZone(v) : null;
            const bg = zone ? (zone === "fever" ? PALETTE.redSoft : zone === "low" ? PALETTE.amberSoft : PALETTE.tealSoft) : PALETTE.paperDark;
            const fg = zone ? zoneColor(zone) : PALETTE.ink;
            let display;
            if (t.type === "boolean") display = v ? t.name : null;
            else if (t.type === "temperature") display = `${t.name} ${v}°F`;
            else display = `${t.name} ${v}/5`;
            if (!display) return null;
            return (
              <span key={t.id} className="clog-sans" style={{
                background: bg, color: fg, fontSize: 12, fontWeight: 600,
                padding: "3px 9px", borderRadius: 999,
              }}>
                {display}
              </span>
            );
          })}
        </div>
        {entry.note && (
          <div className="clog-sans" style={{ fontSize: 13, color: PALETTE.ink, opacity: 0.85 }}>{entry.note}</div>
        )}
      </button>
      <button
        className="clog-btn clog-tap"
        onClick={onDelete}
        aria-label="Delete entry"
        style={{ background: "none", border: "none", color: PALETTE.inkSoft, cursor: "pointer", padding: 4 }}
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
}
