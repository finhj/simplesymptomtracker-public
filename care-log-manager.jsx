import { useState } from "react";

// ─── Design tokens (matches report) ──────────────────────────────────────────
const P = {
  bg:          "#F7F8FA",
  card:        "#FFFFFF",
  border:      "#E2E6ED",
  text:        "#1A2332",
  muted:       "#5A6577",
  accent:      "#2D6A9F",
  accentLight: "#EBF3FB",
  danger:      "#B91C1C",
  dangerLight: "#FEF2F2",
  dangerBorder:"#FECACA",
  sym:         ["#2D6A9F", "#B85C00", "#1A7A44"],
};

// ─── Sample data ──────────────────────────────────────────────────────────────
const INITIAL_ENTRIES = [
  { id: "e01", symptomId: "headache", symptom: "Headache", date: "Aug 6, 2026",  value: 4, notes: "" },
  { id: "e02", symptomId: "fatigue",  symptom: "Fatigue",  date: "Aug 5, 2026",  value: 4, notes: "" },
  { id: "e03", symptomId: "nausea",   symptom: "Nausea",   date: "Aug 4, 2026",  value: 2, notes: "" },
  { id: "e04", symptomId: "headache", symptom: "Headache", date: "Aug 3, 2026",  value: 7, notes: "Woke up with it" },
  { id: "e05", symptomId: "fatigue",  symptom: "Fatigue",  date: "Aug 1, 2026",  value: 5, notes: "" },
  { id: "e06", symptomId: "headache", symptom: "Headache", date: "Jul 30, 2026", value: 6, notes: "" },
  { id: "e07", symptomId: "nausea",   symptom: "Nausea",   date: "Jul 30, 2026", value: 3, notes: "" },
  { id: "e08", symptomId: "fatigue",  symptom: "Fatigue",  date: "Jul 28, 2026", value: 7, notes: "Very tired all day" },
  { id: "e09", symptomId: "headache", symptom: "Headache", date: "Jul 26, 2026", value: 3, notes: "" },
  { id: "e10", symptomId: "fatigue",  symptom: "Fatigue",  date: "Jul 24, 2026", value: 6, notes: "" },
  { id: "e11", symptomId: "headache", symptom: "Headache", date: "Jul 22, 2026", value: 5, notes: "" },
  { id: "e12", symptomId: "nausea",   symptom: "Nausea",   date: "Jul 22, 2026", value: 4, notes: "" },
  { id: "e13", symptomId: "headache", symptom: "Headache", date: "Jul 18, 2026", value: 4, notes: "" },
  { id: "e14", symptomId: "fatigue",  symptom: "Fatigue",  date: "Jul 16, 2026", value: 4, notes: "" },
  { id: "e15", symptomId: "nausea",   symptom: "Nausea",   date: "Jul 15, 2026", value: 3, notes: "" },
  { id: "e16", symptomId: "headache", symptom: "Headache", date: "Jul 15, 2026", value: 6, notes: "" },
  { id: "e17", symptomId: "fatigue",  symptom: "Fatigue",  date: "Jul 13, 2026", value: 6, notes: "" },
  { id: "e18", symptomId: "headache", symptom: "Headache", date: "Jul 12, 2026", value: 3, notes: "" },
  { id: "e19", symptomId: "fatigue",  symptom: "Fatigue",  date: "Jul 10, 2026", value: 8, notes: "Worst day this week" },
  { id: "e20", symptomId: "nausea",   symptom: "Nausea",   date: "Jul 10, 2026", value: 6, notes: "" },
  { id: "e21", symptomId: "headache", symptom: "Headache", date: "Jul 9, 2026",  value: 7, notes: "" },
  { id: "e22", symptomId: "nausea",   symptom: "Nausea",   date: "Jul 9, 2026",  value: 7, notes: "After headache started" },
  { id: "e23", symptomId: "nausea",   symptom: "Nausea",   date: "Jul 8, 2026",  value: 5, notes: "" },
  { id: "e24", symptomId: "fatigue",  symptom: "Fatigue",  date: "Jul 7, 2026",  value: 5, notes: "" },
  { id: "e25", symptomId: "headache", symptom: "Headache", date: "Jul 6, 2026",  value: 5, notes: "" },
  { id: "e26", symptomId: "fatigue",  symptom: "Fatigue",  date: "Jul 4, 2026",  value: 7, notes: "" },
  { id: "e27", symptomId: "headache", symptom: "Headache", date: "Jul 3, 2026",  value: 6, notes: "" },
  { id: "e28", symptomId: "fatigue",  symptom: "Fatigue",  date: "Jul 1, 2026",  value: 6, notes: "" },
  { id: "e29", symptomId: "headache", symptom: "Headache", date: "Jul 1, 2026",  value: 4, notes: "" },
];

const FILTERS = [
  { id: "all",      label: "All",      color: P.accent  },
  { id: "headache", label: "Headache", color: P.sym[0]  },
  { id: "fatigue",  label: "Fatigue",  color: P.sym[1]  },
  { id: "nausea",   label: "Nausea",   color: P.sym[2]  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function severityBadge(v) {
  if (v <= 3) return { label: "Mild",     color: "#1A7A44", bg: "#DCFCE7" };
  if (v <= 6) return { label: "Moderate", color: "#B85C00", bg: "#FEF3C7" };
  return              { label: "Severe",  color: P.danger,  bg: "#FEE2E2" };
}

function symColor(id) {
  return FILTERS.find(f => f.id === id)?.color || P.accent;
}

// Group entries by date for display
function groupByDate(entries) {
  const groups = {};
  entries.forEach(e => {
    if (!groups[e.date]) groups[e.date] = [];
    groups[e.date].push(e);
  });
  return Object.entries(groups); // [date, entries[]]
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function FilterChip({ filter, active, count, onClick }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      style={{
        flexShrink: 0,
        padding: "8px 14px",
        borderRadius: 20,
        border: `1px solid ${active ? filter.color : P.border}`,
        background: active ? filter.color + "18" : P.card,
        color: active ? filter.color : P.muted,
        fontSize: 14,
        fontWeight: active ? 600 : 400,
        cursor: "pointer",
        whiteSpace: "nowrap",
        lineHeight: 1.2,
      }}
    >
      {filter.label}
      <span style={{ marginLeft: 5, opacity: 0.65, fontWeight: 400 }}>({count})</span>
    </button>
  );
}

function EntryRow({ entry, isPending, onDeleteRequest, onDeleteConfirm, onDeleteCancel }) {
  const sev   = severityBadge(entry.value);
  const color = symColor(entry.symptomId);

  return (
    <div
      style={{
        background: isPending ? P.dangerLight : P.card,
        border: `1px solid ${isPending ? P.dangerBorder : P.border}`,
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
      {/* Main row */}
      <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        {/* Color dot */}
        <div style={{ width: 9, height: 9, borderRadius: "50%", background: color, flexShrink: 0, marginTop: 1 }} />

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 600, fontSize: 15, color: P.text }}>{entry.symptom}</span>
            <span style={{ fontSize: 13, color: P.muted }}>{entry.date}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
            <span style={{ fontSize: 19, fontWeight: 700, color: P.text, lineHeight: 1 }}>
              {entry.value}
              <span style={{ fontSize: 12, fontWeight: 400, color: P.muted }}>/10</span>
            </span>
            <span style={{
              fontSize: 11, fontWeight: 600, padding: "2px 7px", borderRadius: 4,
              color: sev.color, background: sev.bg,
            }}>
              {sev.label}
            </span>
            {entry.notes
              ? <span style={{ fontSize: 12, color: P.muted, fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 180 }}>
                  {entry.notes}
                </span>
              : null}
          </div>
        </div>

        {/* Delete trigger */}
        {!isPending && (
          <button
            onClick={() => onDeleteRequest(entry.id)}
            aria-label={`Delete ${entry.symptom} entry from ${entry.date}`}
            style={{
              flexShrink: 0,
              width: 36, height: 36,
              border: `1px solid ${P.border}`,
              borderRadius: 6,
              background: "none",
              color: P.muted,
              fontSize: 15,
              cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Inline delete confirmation — no modal, no animation */}
      {isPending && (
        <div style={{
          borderTop: `1px solid ${P.dangerBorder}`,
          padding: "12px 16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          background: P.dangerLight,
        }}>
          <span style={{ fontSize: 14, color: P.danger, fontWeight: 500 }}>
            Delete this entry?
          </span>
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <button
              onClick={onDeleteCancel}
              style={{
                padding: "9px 18px", borderRadius: 6,
                border: `1px solid ${P.border}`,
                background: P.card, color: P.text,
                fontSize: 14, fontWeight: 500, cursor: "pointer",
              }}
            >
              Keep
            </button>
            <button
              onClick={() => onDeleteConfirm(entry.id)}
              style={{
                padding: "9px 18px", borderRadius: 6,
                border: "none",
                background: P.danger, color: "white",
                fontSize: 14, fontWeight: 600, cursor: "pointer",
              }}
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function LogManager() {
  const [entries,       setEntries]       = useState(INITIAL_ENTRIES);
  const [filter,        setFilter]        = useState("all");
  const [pendingDelete, setPendingDelete] = useState(null);

  const filtered = filter === "all"
    ? entries
    : entries.filter(e => e.symptomId === filter);

  const grouped = groupByDate(filtered);

  const countFor = (id) =>
    id === "all" ? entries.length : entries.filter(e => e.symptomId === id).length;

  const handleFilterChange = (id) => {
    setFilter(id);
    setPendingDelete(null);
  };

  const handleDeleteRequest = (id) => {
    setPendingDelete(id);
  };

  const handleDeleteConfirm = (id) => {
    setEntries(prev => prev.filter(e => e.id !== id));
    setPendingDelete(null);
  };

  const handleDeleteCancel = () => {
    setPendingDelete(null);
  };

  return (
    <div style={{ background: P.bg, minHeight: "100vh", fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", color: P.text }}>

      {/* Header */}
      <header style={{ background: P.text, color: "white", padding: "24px 20px 20px" }}>
        <div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", opacity: 0.5, marginBottom: 6 }}>
          Care Log
        </div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>My Health Log</h1>
        <div style={{ fontSize: 13, opacity: 0.6, marginTop: 4 }}>
          {entries.length} {entries.length === 1 ? "entry" : "entries"}
        </div>
      </header>

      {/* Filter chips */}
      <div style={{
        padding: "12px 16px",
        borderBottom: `1px solid ${P.border}`,
        background: P.card,
        display: "flex",
        gap: 8,
        overflowX: "auto",
      }}
        role="group"
        aria-label="Filter by symptom"
      >
        {FILTERS.map(f => (
          <FilterChip
            key={f.id}
            filter={f}
            active={filter === f.id}
            count={countFor(f.id)}
            onClick={() => handleFilterChange(f.id)}
          />
        ))}
      </div>

      {/* Entry list */}
      <div style={{ padding: "16px", maxWidth: 600, margin: "0 auto" }}>

        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "56px 0", color: P.muted }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>—</div>
            <div style={{ fontSize: 15 }}>No entries to show.</div>
          </div>
        ) : (
          grouped.map(([date, dateEntries]) => (
            <div key={date} style={{ marginBottom: 20 }}>
              {/* Date header */}
              <div style={{
                fontSize: 12, fontWeight: 600, color: P.muted,
                textTransform: "uppercase", letterSpacing: "0.07em",
                marginBottom: 8,
              }}>
                {date}
              </div>

              {/* Entries for this date */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {dateEntries.map(entry => (
                  <EntryRow
                    key={entry.id}
                    entry={entry}
                    isPending={pendingDelete === entry.id}
                    onDeleteRequest={handleDeleteRequest}
                    onDeleteConfirm={handleDeleteConfirm}
                    onDeleteCancel={handleDeleteCancel}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
