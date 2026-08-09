import { useState } from "react";
import {
  LineChart, Line, BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceArea
} from "recharts";

// ─── Design tokens ────────────────────────────────────────────────────────────
const P = {
  bg:           "#F7F8FA",
  card:         "#FFFFFF",
  border:       "#E2E6ED",
  text:         "#1A2332",
  muted:        "#5A6577",
  accent:       "#2D6A9F",
  accentLight:  "#EBF3FB",
  header:       "#1A2332",
  sym:          ["#2D6A9F", "#B85C00", "#1A7A44"],   // blue, amber, green
  episode:      "#6B3FA0",
};

// ─── Sample report data ───────────────────────────────────────────────────────
const REPORT = {
  patient:  { name: "Alex Johnson", age: 34 },
  range:    { start: "Jul 1, 2026", end: "Aug 8, 2026" },
  meta:     { generated: "Aug 8, 2026", expires: "Sep 7, 2026" },

  symptoms: [
    {
      id: "headache", name: "Headache", color: P.sym[0], dash: "0",
      entries: [
        { date: "Jul 1", v: 4 }, { date: "Jul 3", v: 6 }, { date: "Jul 6", v: 5 },
        { date: "Jul 9", v: 7 }, { date: "Jul 12", v: 3 }, { date: "Jul 15", v: 6 },
        { date: "Jul 18", v: 4 }, { date: "Jul 22", v: 5 }, { date: "Jul 26", v: 3 },
        { date: "Jul 30", v: 6 }, { date: "Aug 3", v: 7 }, { date: "Aug 6", v: 4 },
      ],
    },
    {
      id: "fatigue", name: "Fatigue", color: P.sym[1], dash: "6 3",
      entries: [
        { date: "Jul 1", v: 6 }, { date: "Jul 4", v: 7 }, { date: "Jul 7", v: 5 },
        { date: "Jul 10", v: 8 }, { date: "Jul 13", v: 6 }, { date: "Jul 16", v: 4 },
        { date: "Jul 20", v: 5 }, { date: "Jul 24", v: 6 }, { date: "Jul 28", v: 7 },
        { date: "Aug 1", v: 5 }, { date: "Aug 5", v: 4 }, { date: "Aug 8", v: 3 },
      ],
    },
    {
      id: "nausea", name: "Nausea", color: P.sym[2], dash: "2 3",
      entries: [
        { date: "Jul 8", v: 5 }, { date: "Jul 9", v: 7 }, { date: "Jul 10", v: 6 },
        { date: "Jul 15", v: 3 }, { date: "Jul 22", v: 4 }, { date: "Jul 30", v: 3 },
        { date: "Aug 4", v: 2 },
      ],
    },
  ],

  medications: [
    {
      id: "ibu", name: "Ibuprofen 400mg", type: "as-needed",
      doses: [
        { date: "Jul 1", n: 1 }, { date: "Jul 3", n: 1 }, { date: "Jul 9", n: 2 },
        { date: "Jul 12", n: 1 }, { date: "Jul 15", n: 1 }, { date: "Jul 22", n: 1 },
        { date: "Aug 3", n: 2 },
      ],
    },
    {
      id: "vitd", name: "Vitamin D 2000 IU", type: "daily",
      totalDays: 38, taken: 31, missed: 7,
    },
  ],

  episodes: [
    {
      id: "ep1", name: "Migraine Episode",
      start: "Jul 8", end: "Jul 10", duration: "3 days",
      symptoms: ["Headache", "Nausea"],
      notes: "Woke with severe headache and light sensitivity. Resolved after 3 days with ibuprofen.",
    },
    {
      id: "ep2", name: "Fatigue Flare",
      start: "Jul 10", end: "Jul 14", duration: "4 days",
      symptoms: ["Fatigue"],
      notes: "Unusual tiredness and difficulty concentrating. Improved with rest.",
    },
  ],
};

// ─── Utilities ────────────────────────────────────────────────────────────────
function parseDate(d) {
  const m = { Jan:1, Feb:2, Mar:3, Apr:4, May:5, Jun:6, Jul:7, Aug:8, Sep:9, Oct:10, Nov:11, Dec:12 };
  const [mo, dy] = d.split(" ");
  return m[mo] * 100 + parseInt(dy);
}

function buildCombined(symptoms) {
  const map = {};
  symptoms.forEach(s => s.entries.forEach(e => {
    if (!map[e.date]) map[e.date] = { date: e.date };
    map[e.date][s.id] = e.v;
  }));
  return Object.values(map).sort((a, b) => parseDate(a.date) - parseDate(b.date));
}

function stats(entries) {
  const vals = entries.map(e => e.v);
  return {
    avg: (vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(1),
    max: Math.max(...vals),
    count: vals.length,
  };
}

// ─── Shared sub-components ────────────────────────────────────────────────────
function Stat({ label, value, large }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: P.muted, marginBottom: 2, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
      <div style={{ fontSize: large ? 18 : 15, fontWeight: 700, color: P.text }}>{value}</div>
    </div>
  );
}

function Tag({ children, color }) {
  return (
    <span style={{
      fontSize: 12, padding: "2px 9px", borderRadius: 4,
      background: color ? color + "18" : P.accentLight,
      color: color || P.accent, fontWeight: 500,
    }}>
      {children}
    </span>
  );
}

function SectionHeader({ index, title, accent }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
      <div style={{ width: 3, height: 22, background: accent, borderRadius: 2, flexShrink: 0 }} />
      <span style={{ fontSize: 11, color: P.muted, letterSpacing: "0.1em", textTransform: "uppercase" }}>{index}</span>
      <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: P.text }}>{title}</h2>
    </div>
  );
}

function Card({ children, accent, style }) {
  return (
    <div style={{
      background: P.card, border: `1px solid ${P.border}`, borderRadius: 8,
      padding: "16px 18px", borderLeft: accent ? `3px solid ${accent}` : undefined,
      ...style,
    }}>
      {children}
    </div>
  );
}

function ChartWrap({ label, children }) {
  return (
    <Card>
      {label && (
        <div style={{ fontSize: 11, color: P.muted, textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 600, marginBottom: 12 }}>
          {label}
        </div>
      )}
      {children}
    </Card>
  );
}

function ToggleBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "7px 16px", fontSize: 13, borderRadius: 6, cursor: "pointer",
        border: `1px solid ${active ? P.accent : P.border}`,
        background: active ? P.accentLight : P.card,
        color: active ? P.accent : P.muted,
        fontWeight: active ? 600 : 400,
        outline: "none",
      }}
    >
      {children}
    </button>
  );
}

function AdherenceBar({ taken, total }) {
  const pct = Math.round((taken / total) * 100);
  const fill = pct >= 80 ? "#1A7A44" : pct >= 60 ? "#B85C00" : "#C0392B";
  return (
    <div style={{ flex: 1, minWidth: 120 }}>
      <div style={{ fontSize: 12, color: P.muted, marginBottom: 5 }}>{pct}% adherence</div>
      <div
        role="progressbar"
        aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}
        aria-label={`Medication adherence: ${pct}%`}
        style={{ height: 8, background: P.border, borderRadius: 4, overflow: "hidden" }}
      >
        <div style={{ width: `${pct}%`, height: "100%", background: fill, borderRadius: 4 }} />
      </div>
    </div>
  );
}

// ─── Chart tooltips ───────────────────────────────────────────────────────────
function SeverityTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 6, padding: "10px 14px", fontSize: 13, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
      <div style={{ fontWeight: 600, color: P.text, marginBottom: 4 }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ display: "flex", gap: 8, color: p.color }}>
          <span>{p.name}:</span><strong>{p.value}/10</strong>
        </div>
      ))}
    </div>
  );
}

function DoseTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 6, padding: "8px 12px", fontSize: 13 }}>
      <div style={{ fontWeight: 600, color: P.text }}>{label}</div>
      <div>{payload[0].value} dose{payload[0].value !== 1 ? "s" : ""}</div>
    </div>
  );
}

// ─── Main report ──────────────────────────────────────────────────────────────
export default function CareLogReport() {
  const [chartMode, setChartMode] = useState("combined");
  const [tappedMedBar, setTappedMedBar] = useState({});
  const combined = buildCombined(REPORT.symptoms);
  const freqData  = REPORT.symptoms.map(s => ({ name: s.name, count: s.entries.length, color: s.color }));

  // Custom X-axis tick: shows first 3 chars unless this bar index is tapped
  const makeMedTick = (medId) => ({ x, y, payload, index }) => {
    const isActive = tappedMedBar[medId] === index;
    return (
      <g transform={`translate(${x},${y})`}>
        <text
          dy={12}
          textAnchor="middle"
          fontSize={10}
          fill={isActive ? P.accent : P.muted}
          fontWeight={isActive ? 600 : 400}
        >
          {isActive ? payload.value : payload.value.slice(0, 3)}
        </text>
      </g>
    );
  };

  const handleMedBarClick = (medId, _data, index) => {
    setTappedMedBar(prev => ({
      ...prev,
      [medId]: prev[medId] === index ? null : index,
    }));
  };

  return (
    <div style={{ background: P.bg, minHeight: "100vh", fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", color: P.text }}>

      {/* ── Header ── */}
      <header style={{ background: P.header, color: "white", padding: "28px 32px" }}>
        <div style={{ maxWidth: 860, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", opacity: 0.55, marginBottom: 6 }}>
              Health Report · Care Log
            </div>
            <div style={{ fontSize: 26, fontWeight: 700, marginBottom: 3 }}>{REPORT.patient.name}</div>
            <div style={{ fontSize: 14, opacity: 0.7 }}>
              Age {REPORT.patient.age} · {REPORT.range.start} – {REPORT.range.end}
            </div>
          </div>
          <div style={{ textAlign: "right", fontSize: 12, opacity: 0.6, lineHeight: 1.7 }}>
            <div>Generated {REPORT.meta.generated}</div>
            <div>View access expires {REPORT.meta.expires}</div>
            <div>Shared by the patient</div>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 860, margin: "0 auto", padding: "32px 20px 64px" }}>

        {/* ── 01 Symptoms ── */}
        <section aria-labelledby="symptoms-heading" style={{ marginBottom: 44 }}>
          <SectionHeader index="01" title="Symptoms" accent={P.sym[0]} />

          {/* Stat cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10, marginBottom: 20 }}>
            {REPORT.symptoms.map(s => {
              const st = stats(s.entries);
              return (
                <Card key={s.id} accent={s.color}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: s.color, marginBottom: 10 }}>{s.name}</div>
                  <div style={{ display: "flex", gap: 18 }}>
                    <Stat label="Avg" value={`${st.avg}/10`} />
                    <Stat label="Peak" value={`${st.max}/10`} />
                    <Stat label="Logs" value={`${st.count}×`} />
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Severity legend */}
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 12, color: P.muted, marginBottom: 10 }}>
            <span style={{ fontWeight: 600 }}>Severity zones:</span>
            <span>🟢 Mild (1–3)</span>
            <span>🟡 Moderate (4–6)</span>
            <span>🔴 Severe (7–10)</span>
          </div>

          {/* Toggle */}
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }} role="group" aria-label="Chart display mode">
            <ToggleBtn active={chartMode === "combined"}    onClick={() => setChartMode("combined")}>Combined view</ToggleBtn>
            <ToggleBtn active={chartMode === "individual"} onClick={() => setChartMode("individual")}>Individual view</ToggleBtn>
          </div>

          {chartMode === "combined" ? (
            <ChartWrap label="Severity over time — all symptoms">
              <ResponsiveContainer width="100%" height={230}>
                <LineChart data={combined} margin={{ top: 6, right: 16, bottom: 0, left: -4 }}>
                  <CartesianGrid stroke={P.border} strokeDasharray="3 3" />
                  <ReferenceArea y1={7} y2={10} fill="rgba(192,57,43,0.07)" />
                  <ReferenceArea y1={4} y2={7}  fill="rgba(184,92,0,0.06)" />
                  <ReferenceArea y1={0} y2={4}  fill="rgba(26,122,68,0.06)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: P.muted }} />
                  <YAxis domain={[0, 10]} tick={{ fontSize: 11, fill: P.muted }} />
                  <Tooltip content={<SeverityTip />} />
                  <Legend wrapperStyle={{ fontSize: 13 }} />
                  {REPORT.symptoms.map(s => (
                    <Line
                      key={s.id}
                      type="monotone"
                      dataKey={s.id}
                      name={s.name}
                      stroke={s.color}
                      strokeWidth={2}
                      strokeDasharray={s.dash}
                      dot={{ r: 4, fill: s.color, stroke: "white", strokeWidth: 1.5 }}
                      activeDot={{ r: 6 }}
                      connectNulls={false}
                      isAnimationActive={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </ChartWrap>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10 }}>
              {REPORT.symptoms.map(s => (
                <ChartWrap key={s.id} label={s.name}>
                  <ResponsiveContainer width="100%" height={160}>
                    <LineChart data={s.entries} margin={{ top: 6, right: 12, bottom: 0, left: -8 }}>
                      <CartesianGrid stroke={P.border} strokeDasharray="3 3" />
                      <ReferenceArea y1={7} y2={10} fill="rgba(192,57,43,0.07)" />
                      <ReferenceArea y1={4} y2={7}  fill="rgba(184,92,0,0.06)" />
                      <ReferenceArea y1={0} y2={4}  fill="rgba(26,122,68,0.06)" />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: P.muted }} interval="preserveStartEnd" />
                      <YAxis domain={[0, 10]} tick={{ fontSize: 10, fill: P.muted }} width={22} />
                      <Tooltip content={<SeverityTip />} />
                      <Line
                        type="monotone" dataKey="v" name={s.name}
                        stroke={s.color} strokeWidth={2}
                        dot={{ r: 3, fill: s.color, stroke: "white", strokeWidth: 1 }}
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartWrap>
              ))}
            </div>
          )}

          {/* Frequency chart */}
          <ChartWrap label="Log frequency by symptom" style={{ marginTop: 10 }}>
            <ResponsiveContainer width="100%" height={130}>
              <BarChart data={freqData} margin={{ top: 4, right: 16, bottom: 0, left: -4 }}>
                <CartesianGrid stroke={P.border} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: P.muted }} />
                <YAxis tick={{ fontSize: 11, fill: P.muted }} allowDecimals={false} />
                <Tooltip formatter={(v) => [`${v} times logged`, "Logs"]} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                  {freqData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartWrap>
        </section>

        {/* ── 02 Medications ── */}
        <section aria-labelledby="meds-heading" style={{ marginBottom: 44 }}>
          <SectionHeader index="02" title="Medications" accent={P.accent} />
          <div style={{ display: "grid", gap: 10 }}>

            {/* As-needed med */}
            {REPORT.medications.filter(m => m.type === "as-needed").map(med => (
              <Card key={med.id} accent={P.accent}>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{med.name}</div>
                  <Tag>As needed</Tag>
                </div>
                <Stat label="Total doses" value={`${med.doses.reduce((s, d) => s + d.n, 0)} doses over ${med.doses.length} days`} />
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 11, color: P.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 600 }}>Dose log</div>
                  <div style={{ fontSize: 11, color: P.muted, marginBottom: 4 }}>Tap a bar to see the full date</div>
                  <ResponsiveContainer width="100%" height={110}>
                    <BarChart
                      data={med.doses}
                      margin={{ top: 0, right: 12, bottom: 4, left: -8 }}
                      onClick={(chartData, event) => {
                        if (chartData?.activeTooltipIndex != null) {
                          handleMedBarClick(med.id, chartData, chartData.activeTooltipIndex);
                        }
                      }}
                      style={{ cursor: "pointer" }}
                    >
                      <CartesianGrid stroke={P.border} strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" tick={makeMedTick(med.id)} />
                      <YAxis tick={{ fontSize: 10, fill: P.muted }} allowDecimals={false} width={22} />
                      <Tooltip content={<DoseTip />} />
                      <Bar dataKey="n" radius={[3, 3, 0, 0]} isAnimationActive={false}>
                        {med.doses.map((_, i) => (
                          <Cell
                            key={i}
                            fill={tappedMedBar[med.id] === i ? P.text : P.accent}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            ))}

            {/* Daily med */}
            {REPORT.medications.filter(m => m.type === "daily").map(med => (
              <Card key={med.id} accent={P.accent}>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{med.name}</div>
                  <Tag>Daily</Tag>
                </div>
                <div style={{ display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}>
                  <Stat label="Days taken" value={`${med.taken} / ${med.totalDays}`} />
                  <Stat label="Missed" value={`${med.missed} days`} />
                  <AdherenceBar taken={med.taken} total={med.totalDays} />
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* ── 03 Episodes ── */}
        <section aria-labelledby="episodes-heading" style={{ marginBottom: 44 }}>
          <SectionHeader index="03" title="Episodes" accent={P.episode} />
          <div style={{ display: "grid", gap: 10 }}>
            {REPORT.episodes.map(ep => (
              <Card key={ep.id} accent={P.episode}>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{ep.name}</div>
                  <div style={{ fontSize: 13, color: P.muted }}>{ep.start} – {ep.end} · {ep.duration}</div>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                  {ep.symptoms.map(s => <Tag key={s} color={P.episode}>{s}</Tag>)}
                </div>
                <div style={{ fontSize: 14, color: P.muted, lineHeight: 1.6 }}>{ep.notes}</div>
              </Card>
            ))}
          </div>
        </section>

        {/* ── Footer ── */}
        <footer style={{ borderTop: `1px solid ${P.border}`, paddingTop: 20, fontSize: 12, color: P.muted, lineHeight: 1.7 }}>
          <div>Generated by <strong style={{ color: P.text }}>Care Log</strong> on {REPORT.meta.generated}. Shared by the patient for informational purposes.</div>
          <div>View access expires {REPORT.meta.expires}. This link is non-transferable.</div>
          <div style={{ marginTop: 4, color: "#9AA3AE" }}>
            Care Log does not provide medical advice. All data originates from patient self-report and has not been independently verified.
          </div>
        </footer>
      </main>
    </div>
  );
}
