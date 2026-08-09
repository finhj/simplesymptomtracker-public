import { useState } from "react";

// ─── Design tokens ────────────────────────────────────────────────────────────
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
};

const SECTION_META = [
  { id: "symptoms",    label: "Symptoms",    icon: "🩺", color: "#2D6A9F" },
  { id: "medications", label: "Medications", icon: "💊", color: "#B85C00" },
  { id: "episodes",    label: "Episodes",    icon: "📋", color: "#6B3FA0" },
  { id: "reports",     label: "Reports",     icon: "📄", color: "#1A7A44" },
];

const SYMPTOM_DEFS = [
  { id: "headache", name: "Headache", color: "#2D6A9F" },
  { id: "fatigue",  name: "Fatigue",  color: "#B85C00" },
  { id: "nausea",   name: "Nausea",   color: "#1A7A44" },
];

// ─── Sample data ──────────────────────────────────────────────────────────────
const INIT_ENTRIES = [
  { id:"e01", symptomId:"headache", symptom:"Headache", date:"Aug 6, 2026",  value:4, notes:"" },
  { id:"e02", symptomId:"fatigue",  symptom:"Fatigue",  date:"Aug 5, 2026",  value:4, notes:"" },
  { id:"e03", symptomId:"nausea",   symptom:"Nausea",   date:"Aug 4, 2026",  value:2, notes:"" },
  { id:"e04", symptomId:"headache", symptom:"Headache", date:"Aug 3, 2026",  value:7, notes:"Woke up with it" },
  { id:"e05", symptomId:"fatigue",  symptom:"Fatigue",  date:"Aug 1, 2026",  value:5, notes:"" },
  { id:"e06", symptomId:"headache", symptom:"Headache", date:"Jul 30, 2026", value:6, notes:"" },
  { id:"e07", symptomId:"nausea",   symptom:"Nausea",   date:"Jul 30, 2026", value:3, notes:"" },
  { id:"e08", symptomId:"fatigue",  symptom:"Fatigue",  date:"Jul 28, 2026", value:7, notes:"Very tired all day" },
  { id:"e09", symptomId:"headache", symptom:"Headache", date:"Jul 26, 2026", value:3, notes:"" },
  { id:"e10", symptomId:"fatigue",  symptom:"Fatigue",  date:"Jul 24, 2026", value:6, notes:"" },
  { id:"e11", symptomId:"headache", symptom:"Headache", date:"Jul 22, 2026", value:5, notes:"" },
  { id:"e12", symptomId:"nausea",   symptom:"Nausea",   date:"Jul 22, 2026", value:4, notes:"" },
  { id:"e13", symptomId:"headache", symptom:"Headache", date:"Jul 18, 2026", value:4, notes:"" },
  { id:"e14", symptomId:"fatigue",  symptom:"Fatigue",  date:"Jul 16, 2026", value:4, notes:"" },
  { id:"e15", symptomId:"nausea",   symptom:"Nausea",   date:"Jul 15, 2026", value:3, notes:"" },
  { id:"e16", symptomId:"headache", symptom:"Headache", date:"Jul 15, 2026", value:6, notes:"" },
  { id:"e17", symptomId:"fatigue",  symptom:"Fatigue",  date:"Jul 13, 2026", value:6, notes:"" },
  { id:"e18", symptomId:"headache", symptom:"Headache", date:"Jul 12, 2026", value:3, notes:"" },
  { id:"e19", symptomId:"fatigue",  symptom:"Fatigue",  date:"Jul 10, 2026", value:8, notes:"Worst day this week" },
  { id:"e20", symptomId:"nausea",   symptom:"Nausea",   date:"Jul 10, 2026", value:6, notes:"" },
  { id:"e21", symptomId:"headache", symptom:"Headache", date:"Jul 9, 2026",  value:7, notes:"" },
  { id:"e22", symptomId:"nausea",   symptom:"Nausea",   date:"Jul 9, 2026",  value:7, notes:"After headache started" },
  { id:"e23", symptomId:"nausea",   symptom:"Nausea",   date:"Jul 8, 2026",  value:5, notes:"" },
  { id:"e24", symptomId:"fatigue",  symptom:"Fatigue",  date:"Jul 7, 2026",  value:5, notes:"" },
  { id:"e25", symptomId:"headache", symptom:"Headache", date:"Jul 6, 2026",  value:5, notes:"" },
  { id:"e26", symptomId:"fatigue",  symptom:"Fatigue",  date:"Jul 4, 2026",  value:7, notes:"" },
  { id:"e27", symptomId:"headache", symptom:"Headache", date:"Jul 3, 2026",  value:6, notes:"" },
  { id:"e28", symptomId:"fatigue",  symptom:"Fatigue",  date:"Jul 1, 2026",  value:6, notes:"" },
  { id:"e29", symptomId:"headache", symptom:"Headache", date:"Jul 1, 2026",  value:4, notes:"" },
];

const INIT_MEDS = [
  { id:"m01", name:"Ibuprofen 400mg",   type:"as-needed", dosesLogged: 10 },
  { id:"m02", name:"Vitamin D 2000 IU", type:"daily",      taken: 31, total: 38 },
];

const INIT_EPISODES = [
  { id:"ep1", name:"Migraine Episode", start:"Jul 8",  end:"Jul 10", duration:"3 days", symptoms:["Headache","Nausea"], notes:"Woke with severe headache and light sensitivity. Resolved after 3 days." },
  { id:"ep2", name:"Fatigue Flare",    start:"Jul 10", end:"Jul 14", duration:"4 days", symptoms:["Fatigue"],           notes:"Unusual tiredness and difficulty concentrating. Improved with rest." },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function sevBadge(v) {
  if (v <= 3) return { label:"Mild",     color:"#1A7A44", bg:"#DCFCE7" };
  if (v <= 6) return { label:"Moderate", color:"#B85C00", bg:"#FEF3C7" };
  return             { label:"Severe",   color:"#B91C1C", bg:"#FEE2E2" };
}

function symColor(id) {
  return SYMPTOM_DEFS.find(s => s.id === id)?.color || P.accent;
}

function groupByDate(entries) {
  const map = {};
  entries.forEach(e => { if (!map[e.date]) map[e.date] = []; map[e.date].push(e); });
  return Object.entries(map);
}

// ─── Shared UI components ─────────────────────────────────────────────────────
function BackHeader({ title, onBack }) {
  return (
    <header style={{ background: P.text, color:"white", padding:"22px 20px 18px", display:"flex", alignItems:"center", gap:12 }}>
      <button
        onClick={onBack}
        aria-label="Back to menu"
        style={{ background:"none", border:"none", color:"white", fontSize:22, cursor:"pointer", padding:"2px 0", lineHeight:1, opacity:0.75 }}
      >←</button>
      <h1 style={{ margin:0, fontSize:20, fontWeight:700 }}>{title}</h1>
    </header>
  );
}

function PrimaryBtn({ children, color, onClick }) {
  return (
    <button onClick={onClick} style={{
      width:"100%", padding:"12px 0", borderRadius:8, border:"none",
      background: color || P.accent, color:"white",
      fontSize:15, fontWeight:700, cursor:"pointer",
    }}>{children}</button>
  );
}

function GhostBtn({ children, onClick }) {
  return (
    <button onClick={onClick} style={{
      width:"100%", padding:"12px 0", borderRadius:8,
      border:`1px solid ${P.border}`, background:P.card,
      color:P.muted, fontSize:15, fontWeight:600, cursor:"pointer",
    }}>{children}</button>
  );
}

function DeleteConfirm({ label, onConfirm, onCancel }) {
  return (
    <div style={{ borderTop:`1px solid ${P.dangerBorder}`, padding:"12px 16px", background:P.dangerLight, display:"flex", justifyContent:"space-between", alignItems:"center", gap:8 }}>
      <span style={{ fontSize:14, color:P.danger, fontWeight:500 }}>{label}</span>
      <div style={{ display:"flex", gap:8, flexShrink:0 }}>
        <button onClick={onCancel}  style={{ padding:"8px 16px", borderRadius:6, border:`1px solid ${P.border}`, background:P.card, color:P.text, fontSize:14, fontWeight:500, cursor:"pointer" }}>Keep</button>
        <button onClick={onConfirm} style={{ padding:"8px 16px", borderRadius:6, border:"none", background:P.danger, color:"white", fontSize:14, fontWeight:700, cursor:"pointer" }}>Delete</button>
      </div>
    </div>
  );
}

function SectionLabel({ children }) {
  return <div style={{ fontSize:11, fontWeight:600, color:P.muted, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:8 }}>{children}</div>;
}

// ─── Home screen ──────────────────────────────────────────────────────────────
function HomeScreen({ entries, meds, episodes, onNavigate }) {
  return (
    <div style={{ background:P.bg, minHeight:"100vh" }}>
      <header style={{ background:P.text, color:"white", padding:"32px 20px 24px" }}>
        <div style={{ fontSize:11, letterSpacing:"0.12em", textTransform:"uppercase", opacity:0.5, marginBottom:8 }}>Care Log</div>
        <div style={{ fontSize:26, fontWeight:700 }}>My Health</div>
        <div style={{ fontSize:13, opacity:0.6, marginTop:4 }}>Jul 1 – Aug 8, 2026</div>
      </header>

      <div style={{ padding:"20px 16px", maxWidth:500, margin:"0 auto" }}>
        {/* Menu tiles */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:28 }}>
          {SECTION_META.map(sec => (
            <button
              key={sec.id}
              onClick={() => onNavigate(sec.id)}
              style={{
                background:P.card, border:`1px solid ${P.border}`,
                borderLeft:`4px solid ${sec.color}`,
                borderRadius:10, padding:"18px 16px",
                textAlign:"left", cursor:"pointer",
              }}
            >
              <div style={{ fontSize:26, marginBottom:10 }}>{sec.icon}</div>
              <div style={{ fontSize:15, fontWeight:700, color:P.text, marginBottom:3 }}>{sec.label}</div>
              <div style={{ fontSize:12, color:P.muted }}>
                {sec.id === "symptoms"    && `${entries.length} entries`}
                {sec.id === "medications" && `${meds.length} tracked`}
                {sec.id === "episodes"    && `${episodes.length} flagged`}
                {sec.id === "reports"     && "Generate & share"}
              </div>
            </button>
          ))}
        </div>

        {/* Recent activity */}
        <SectionLabel>Recent</SectionLabel>
        {entries.slice(0, 4).map(e => {
          const sev = sevBadge(e.value);
          return (
            <div key={e.id} style={{ background:P.card, border:`1px solid ${P.border}`, borderRadius:8, padding:"11px 14px", marginBottom:8, display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:8, height:8, borderRadius:"50%", background:symColor(e.symptomId), flexShrink:0 }} />
              <div style={{ flex:1 }}>
                <span style={{ fontWeight:600, fontSize:14 }}>{e.symptom}</span>
                <span style={{ color:P.muted, fontSize:13, marginLeft:8 }}>{e.date}</span>
              </div>
              <span style={{ fontSize:16, fontWeight:700 }}>{e.value}<span style={{ fontSize:11, color:P.muted, fontWeight:400 }}>/10</span></span>
              <span style={{ fontSize:11, fontWeight:600, color:sev.color, background:sev.bg, padding:"2px 7px", borderRadius:4 }}>{sev.label}</span>
            </div>
          );
        })}
        <button onClick={() => onNavigate("symptoms")} style={{ background:"none", border:"none", color:P.accent, fontSize:14, fontWeight:600, cursor:"pointer", padding:"6px 0" }}>
          View all {entries.length} entries →
        </button>
      </div>
    </div>
  );
}

// ─── Symptoms screen ──────────────────────────────────────────────────────────
const BLANK_FORM = { symptomId:"headache", value:5, notes:"", date:"Aug 9, 2026" };

function SymptomsScreen({ entries, setEntries, onBack }) {
  const [filter,        setFilter]        = useState("all");
  const [pendingDelete, setPendingDelete] = useState(null);
  const [showForm,      setShowForm]      = useState(false);
  const [form,          setForm]          = useState(BLANK_FORM);

  const filtered = filter === "all" ? entries : entries.filter(e => e.symptomId === filter);
  const grouped  = groupByDate(filtered);

  const handleSave = () => {
    const sym = SYMPTOM_DEFS.find(s => s.id === form.symptomId);
    setEntries(prev => [{ id:`e${Date.now()}`, symptomId:form.symptomId, symptom:sym.name, date:form.date, value:form.value, notes:form.notes }, ...prev]);
    setShowForm(false);
    setForm(BLANK_FORM);
  };

  const filterDefs = [{ id:"all", name:"All", color:P.accent }, ...SYMPTOM_DEFS];

  return (
    <div style={{ background:P.bg, minHeight:"100vh" }}>
      <BackHeader title="Symptoms" onBack={onBack} />
      <div style={{ padding:"16px", maxWidth:600, margin:"0 auto" }}>

        {/* Add form */}
        {showForm ? (
          <div style={{ background:P.card, border:`1px solid ${P.border}`, borderRadius:10, padding:"16px", marginBottom:14 }}>
            <div style={{ fontWeight:700, fontSize:15, marginBottom:14 }}>New Entry</div>

            {/* Symptom picker */}
            <div style={{ marginBottom:14 }}>
              <SectionLabel>Symptom</SectionLabel>
              <div style={{ display:"flex", gap:8 }}>
                {SYMPTOM_DEFS.map(s => (
                  <button key={s.id} onClick={() => setForm(f=>({...f, symptomId:s.id}))} style={{
                    flex:1, padding:"10px 0", borderRadius:8,
                    border:`1px solid ${form.symptomId===s.id ? s.color : P.border}`,
                    background: form.symptomId===s.id ? s.color+"18" : P.card,
                    color: form.symptomId===s.id ? s.color : P.muted,
                    fontSize:13, fontWeight: form.symptomId===s.id ? 700 : 400, cursor:"pointer",
                  }}>{s.name}</button>
                ))}
              </div>
            </div>

            {/* Severity picker */}
            <div style={{ marginBottom:14 }}>
              <SectionLabel>Severity — {form.value} / 10</SectionLabel>
              <div style={{ display:"flex", gap:4 }}>
                {[1,2,3,4,5,6,7,8,9,10].map(n => (
                  <button key={n} onClick={() => setForm(f=>({...f,value:n}))} style={{
                    flex:1, paddingTop:"100%", position:"relative", borderRadius:6, cursor:"pointer",
                    border:`1px solid ${form.value===n ? P.accent : P.border}`,
                    background: form.value===n ? P.accent : form.value>=n ? P.accentLight : P.card,
                    color: form.value===n ? "white" : P.text,
                    padding:0, height:36,
                  }}>
                    <span style={{ fontSize:12, fontWeight:600 }}>{n}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div style={{ marginBottom:16 }}>
              <SectionLabel>Notes (optional)</SectionLabel>
              <textarea
                value={form.notes}
                onChange={e => setForm(f=>({...f,notes:e.target.value}))}
                placeholder="Any context…"
                rows={2}
                style={{ width:"100%", borderRadius:6, border:`1px solid ${P.border}`, padding:"8px 10px", fontSize:14, color:P.text, fontFamily:"inherit", resize:"vertical", boxSizing:"border-box" }}
              />
            </div>

            <div style={{ display:"flex", gap:8 }}>
              <button onClick={() => setShowForm(false)} style={{ flex:1, padding:"11px 0", borderRadius:8, border:`1px solid ${P.border}`, background:P.card, color:P.muted, fontSize:15, fontWeight:600, cursor:"pointer" }}>Cancel</button>
              <button onClick={handleSave} style={{ flex:2, padding:"11px 0", borderRadius:8, border:"none", background:P.accent, color:"white", fontSize:15, fontWeight:700, cursor:"pointer" }}>Save Entry</button>
            </div>
          </div>
        ) : (
          <div style={{ marginBottom:14 }}>
            <PrimaryBtn color="#2D6A9F" onClick={() => setShowForm(true)}>+ Log Symptom</PrimaryBtn>
          </div>
        )}

        {/* Filter chips */}
        <div style={{ display:"flex", gap:8, overflowX:"auto", paddingBottom:12 }} role="group" aria-label="Filter by symptom">
          {filterDefs.map(f => {
            const count = f.id==="all" ? entries.length : entries.filter(e=>e.symptomId===f.id).length;
            const active = filter===f.id;
            return (
              <button key={f.id} onClick={() => { setFilter(f.id); setPendingDelete(null); }} style={{
                flexShrink:0, padding:"7px 14px", borderRadius:20,
                border:`1px solid ${active ? f.color : P.border}`,
                background: active ? f.color+"18" : P.card,
                color: active ? f.color : P.muted,
                fontSize:13, fontWeight: active?600:400, cursor:"pointer",
              }}>{f.name} ({count})</button>
            );
          })}
        </div>

        {/* Entry list grouped by date */}
        {filtered.length === 0 ? (
          <div style={{ textAlign:"center", padding:"40px 0", color:P.muted }}>No entries to show.</div>
        ) : (
          grouped.map(([date, dateEntries]) => (
            <div key={date} style={{ marginBottom:20 }}>
              <SectionLabel>{date}</SectionLabel>
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                {dateEntries.map(entry => {
                  const isPending = pendingDelete===entry.id;
                  const sev = sevBadge(entry.value);
                  return (
                    <div key={entry.id} style={{ background:isPending?P.dangerLight:P.card, border:`1px solid ${isPending?P.dangerBorder:P.border}`, borderRadius:8, overflow:"hidden" }}>
                      <div style={{ padding:"12px 14px", display:"flex", alignItems:"center", gap:10 }}>
                        <div style={{ width:8, height:8, borderRadius:"50%", background:symColor(entry.symptomId), flexShrink:0 }} />
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontWeight:600, fontSize:14 }}>{entry.symptom}</div>
                          <div style={{ display:"flex", gap:8, alignItems:"center", marginTop:3 }}>
                            <span style={{ fontSize:17, fontWeight:700 }}>{entry.value}<span style={{ fontSize:11, color:P.muted, fontWeight:400 }}>/10</span></span>
                            <span style={{ fontSize:11, fontWeight:600, color:sev.color, background:sev.bg, padding:"2px 6px", borderRadius:4 }}>{sev.label}</span>
                            {entry.notes && <span style={{ fontSize:11, color:P.muted, fontStyle:"italic", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{entry.notes}</span>}
                          </div>
                        </div>
                        {!isPending && (
                          <button onClick={() => setPendingDelete(entry.id)} aria-label={`Delete ${entry.symptom} entry`}
                            style={{ width:34, height:34, border:`1px solid ${P.border}`, borderRadius:6, background:"none", color:P.muted, fontSize:14, cursor:"pointer", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
                        )}
                      </div>
                      {isPending && (
                        <DeleteConfirm
                          label="Delete this entry?"
                          onConfirm={() => { setEntries(prev => prev.filter(e => e.id!==entry.id)); setPendingDelete(null); }}
                          onCancel={() => setPendingDelete(null)}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Medications screen ───────────────────────────────────────────────────────
function MedicationsScreen({ meds, setMeds, onBack }) {
  const [pendingDelete, setPendingDelete] = useState(null);

  return (
    <div style={{ background:P.bg, minHeight:"100vh" }}>
      <BackHeader title="Medications" onBack={onBack} />
      <div style={{ padding:"16px", maxWidth:600, margin:"0 auto" }}>
        <div style={{ marginBottom:16 }}>
          <PrimaryBtn color="#B85C00" onClick={() => {}}>+ Add Medication</PrimaryBtn>
        </div>
        <SectionLabel>Tracked medications</SectionLabel>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {meds.map(med => {
            const isPending = pendingDelete===med.id;
            const pct = med.type==="daily" ? Math.round(med.taken/med.total*100) : null;
            const adhereFill = pct!=null ? (pct>=80?"#1A7A44":pct>=60?"#B85C00":P.danger) : null;
            return (
              <div key={med.id} style={{ background:isPending?P.dangerLight:P.card, border:`1px solid ${isPending?P.dangerBorder:P.border}`, borderLeft:"3px solid #B85C00", borderRadius:8, overflow:"hidden" }}>
                <div style={{ padding:"14px 16px", display:"flex", alignItems:"center", gap:12 }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:600, fontSize:15, marginBottom:5 }}>{med.name}</div>
                    <div style={{ fontSize:13, color:P.muted, marginBottom: med.type==="daily"?6:0 }}>
                      {med.type==="daily"
                        ? `Daily · ${med.taken}/${med.total} days taken`
                        : `As needed · ${med.dosesLogged} doses logged`}
                    </div>
                    {med.type==="daily" && (
                      <div>
                        <div style={{ height:6, background:P.border, borderRadius:3, overflow:"hidden", maxWidth:200 }}>
                          <div style={{ width:`${pct}%`, height:"100%", background:adhereFill, borderRadius:3 }} />
                        </div>
                        <div style={{ fontSize:11, color:adhereFill, marginTop:3, fontWeight:600 }}>{pct}% adherence</div>
                      </div>
                    )}
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:6, alignItems:"flex-end", flexShrink:0 }}>
                    {!isPending && (
                      <>
                        <button style={{ padding:"7px 12px", borderRadius:6, background:"#B85C0018", border:"1px solid #B85C00", color:"#B85C00", fontSize:13, fontWeight:600, cursor:"pointer", whiteSpace:"nowrap" }}>
                          Log dose
                        </button>
                        <button onClick={() => setPendingDelete(med.id)} aria-label={`Remove ${med.name}`}
                          style={{ width:30, height:30, border:`1px solid ${P.border}`, borderRadius:6, background:"none", color:P.muted, fontSize:13, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
                      </>
                    )}
                  </div>
                </div>
                {isPending && (
                  <DeleteConfirm
                    label="Remove this medication?"
                    onConfirm={() => { setMeds(prev => prev.filter(m => m.id!==med.id)); setPendingDelete(null); }}
                    onCancel={() => setPendingDelete(null)}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Episodes screen ──────────────────────────────────────────────────────────
function EpisodesScreen({ episodes, setEpisodes, onBack }) {
  const [pendingDelete, setPendingDelete] = useState(null);

  return (
    <div style={{ background:P.bg, minHeight:"100vh" }}>
      <BackHeader title="Episodes" onBack={onBack} />
      <div style={{ padding:"16px", maxWidth:600, margin:"0 auto" }}>
        <div style={{ marginBottom:16 }}>
          <PrimaryBtn color="#6B3FA0" onClick={() => {}}>+ Add Episode</PrimaryBtn>
        </div>
        <SectionLabel>Illness episodes</SectionLabel>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {episodes.map(ep => {
            const isPending = pendingDelete===ep.id;
            return (
              <div key={ep.id} style={{ background:isPending?P.dangerLight:P.card, border:`1px solid ${isPending?P.dangerBorder:P.border}`, borderLeft:"3px solid #6B3FA0", borderRadius:8, overflow:"hidden" }}>
                <div style={{ padding:"14px 16px", display:"flex", gap:12 }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:700, fontSize:15, marginBottom:3 }}>{ep.name}</div>
                    <div style={{ fontSize:13, color:P.muted, marginBottom:8 }}>{ep.start} – {ep.end} · {ep.duration}</div>
                    <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginBottom:8 }}>
                      {ep.symptoms.map(s => (
                        <span key={s} style={{ fontSize:11, background:"#6B3FA018", color:"#6B3FA0", padding:"2px 8px", borderRadius:4, fontWeight:600 }}>{s}</span>
                      ))}
                    </div>
                    <div style={{ fontSize:13, color:P.muted, fontStyle:"italic", lineHeight:1.5 }}>{ep.notes}</div>
                  </div>
                  {!isPending && (
                    <button onClick={() => setPendingDelete(ep.id)} aria-label={`Delete ${ep.name}`}
                      style={{ width:34, height:34, border:`1px solid ${P.border}`, borderRadius:6, background:"none", color:P.muted, fontSize:14, cursor:"pointer", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", alignSelf:"flex-start" }}>✕</button>
                  )}
                </div>
                {isPending && (
                  <DeleteConfirm
                    label="Delete this episode?"
                    onConfirm={() => { setEpisodes(prev => prev.filter(e => e.id!==ep.id)); setPendingDelete(null); }}
                    onCancel={() => setPendingDelete(null)}
                  />
                )}
              </div>
            );
          })}
          {episodes.length === 0 && (
            <div style={{ textAlign:"center", padding:"40px 0", color:P.muted }}>No episodes logged.</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Reports screen ───────────────────────────────────────────────────────────
function ReportsScreen({ entries, meds, episodes, onBack }) {
  return (
    <div style={{ background:P.bg, minHeight:"100vh" }}>
      <BackHeader title="Reports" onBack={onBack} />
      <div style={{ padding:"16px", maxWidth:600, margin:"0 auto" }}>
        <div style={{ background:P.card, border:`1px solid ${P.border}`, borderLeft:"3px solid #1A7A44", borderRadius:10, padding:"20px", marginBottom:16 }}>
          <div style={{ fontWeight:700, fontSize:16, marginBottom:12 }}>Health Report</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:4 }}>
            {[
              { label:"Date range",  value:"Jul 1 – Aug 8" },
              { label:"Entries",     value:`${entries.length} logged` },
              { label:"Medications", value:`${meds.length} tracked` },
              { label:"Episodes",    value:`${episodes.length} flagged` },
            ].map(s => (
              <div key={s.label}>
                <div style={{ fontSize:11, color:P.muted, marginBottom:2, textTransform:"uppercase", letterSpacing:"0.05em", fontWeight:600 }}>{s.label}</div>
                <div style={{ fontSize:15, fontWeight:700 }}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          <PrimaryBtn color="#1A7A44" onClick={() => {}}>Generate & Share Report</PrimaryBtn>
          <GhostBtn onClick={() => {}}>Download PDF</GhostBtn>
        </div>

        <div style={{ marginTop:20, padding:"14px 16px", background:P.card, border:`1px solid ${P.border}`, borderRadius:8 }}>
          <div style={{ fontSize:13, fontWeight:600, marginBottom:6 }}>How sharing works</div>
          <div style={{ fontSize:13, color:P.muted, lineHeight:1.7 }}>
            Your doctor receives a link — no login or account required. Links expire after 30 days and can be revoked anytime. Your data never leaves your device unless you choose to share it.
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── App shell ────────────────────────────────────────────────────────────────
export default function CareLogApp() {
  const [screen,   setScreen]   = useState("home");
  const [entries,  setEntries]  = useState(INIT_ENTRIES);
  const [meds,     setMeds]     = useState(INIT_MEDS);
  const [episodes, setEpisodes] = useState(INIT_EPISODES);

  const goHome = () => setScreen("home");

  return (
    <>
      {screen==="home"        && <HomeScreen       entries={entries} meds={meds} episodes={episodes} onNavigate={setScreen} />}
      {screen==="symptoms"    && <SymptomsScreen    entries={entries} setEntries={setEntries} onBack={goHome} />}
      {screen==="medications" && <MedicationsScreen meds={meds} setMeds={setMeds} onBack={goHome} />}
      {screen==="episodes"    && <EpisodesScreen    episodes={episodes} setEpisodes={setEpisodes} onBack={goHome} />}
      {screen==="reports"     && <ReportsScreen     entries={entries} meds={meds} episodes={episodes} onBack={goHome} />}
    </>
  );
}
