import React, { useState } from "react";

const KEY = "diagnostic-test-key";

const ink = "#232320";
const paper = "#F7F4EE";
const card = "#FFFDF9";
const border = "#DDD6C7";
const green = "#2F6F68";
const red = "#C1443C";
const amber = "#D98B3F";

function now() {
  return new Date().toLocaleTimeString(undefined, { hour12: false });
}

function serializeError(e) {
  if (!e) return null;
  const out = {};
  if (e.name) out.name = e.name;
  if (e.message) out.message = e.message;
  if (e.status) out.status = e.status;
  if (e.code) out.code = e.code;
  try {
    const own = JSON.parse(JSON.stringify(e));
    Object.assign(out, own);
  } catch (_) {}
  if (Object.keys(out).length === 0) out.raw = String(e);
  return out;
}

export default function StorageDiagnostic() {
  const [log, setLog] = useState([]);
  const [busy, setBusy] = useState(false);

  function addEntry(entry) {
    setLog((prev) => [{ id: Math.random().toString(36).slice(2), time: now(), ...entry }, ...prev]);
  }

  async function runTest(label, fn) {
    setBusy(true);
    const start = performance.now();
    try {
      const result = await fn();
      const ms = Math.round(performance.now() - start);
      addEntry({ label, ok: true, ms, detail: JSON.stringify(result) });
    } catch (e) {
      const ms = Math.round(performance.now() - start);
      addEntry({ label, ok: false, ms, detail: JSON.stringify(serializeError(e)) });
    } finally {
      setBusy(false);
    }
  }

  function testWrite() {
    runTest("Write", async () => {
      if (!window.storage || typeof window.storage.set !== "function") {
        throw new Error("window.storage.set is not available in this environment");
      }
      const value = JSON.stringify({ ping: Date.now() });
      const result = await window.storage.set(KEY, value, false);
      if (!result) throw new Error("storage.set resolved but returned a falsy result (no error thrown)");
      return result;
    });
  }

  function testRead() {
    runTest("Read", async () => {
      if (!window.storage || typeof window.storage.get !== "function") {
        throw new Error("window.storage.get is not available in this environment");
      }
      const result = await window.storage.get(KEY, false);
      if (!result) throw new Error("storage.get resolved but returned null/falsy (key may not exist yet)");
      return result;
    });
  }

  function testDelete() {
    runTest("Delete", async () => {
      if (!window.storage || typeof window.storage.delete !== "function") {
        throw new Error("window.storage.delete is not available in this environment");
      }
      const result = await window.storage.delete(KEY, false);
      return result;
    });
  }

  function testList() {
    runTest("List", async () => {
      if (!window.storage || typeof window.storage.list !== "function") {
        throw new Error("window.storage.list is not available in this environment");
      }
      const result = await window.storage.list("diagnostic", false);
      return result;
    });
  }

  const successCount = log.filter((l) => l.ok).length;
  const failCount = log.filter((l) => !l.ok).length;

  return (
    <div style={{ background: paper, minHeight: "100vh", color: ink, fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif" }}>
      <div style={{ maxWidth: 520, margin: "0 auto", padding: "20px 16px 60px" }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>Storage Diagnostic</h1>
        <p style={{ fontSize: 13, color: "#7A7362", margin: "0 0 18px" }}>
          Tests window.storage directly, with no app logic in the way. Each button fires one call and logs the raw result or error below.
        </p>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
          <button onClick={testWrite} disabled={busy} style={btnStyle(green, busy)}>Write test value</button>
          <button onClick={testRead} disabled={busy} style={btnStyle(amber, busy)}>Read test value</button>
          <button onClick={testDelete} disabled={busy} style={btnStyle(ink, busy)}>Delete test value</button>
          <button onClick={testList} disabled={busy} style={btnStyle("#4F6C8C", busy)}>List keys</button>
        </div>

        {log.length > 0 && (
          <div style={{
            display: "flex", gap: 12, fontSize: 13, marginBottom: 14, padding: "8px 12px",
            background: card, border: `1px solid ${border}`, borderRadius: 10,
          }}>
            <span style={{ color: green, fontWeight: 700 }}>{successCount} succeeded</span>
            <span style={{ color: red, fontWeight: 700 }}>{failCount} failed</span>
          </div>
        )}

        <div>
          {log.length === 0 && (
            <div style={{ fontSize: 13, color: "#7A7362", padding: "16px 4px" }}>
              No tests run yet. Tap a button above to start.
            </div>
          )}
          {log.map((entry) => (
            <div key={entry.id} style={{
              background: card, border: `1px solid ${entry.ok ? border : red}`, borderRadius: 12,
              padding: "10px 12px", marginBottom: 8,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <span style={{ fontWeight: 700, fontSize: 13, color: entry.ok ? green : red }}>
                  {entry.ok ? "✓" : "✗"} {entry.label}
                </span>
                <span style={{ fontSize: 11, color: "#7A7362" }}>{entry.time} · {entry.ms}ms</span>
              </div>
              <pre style={{
                margin: 0, fontSize: 11, whiteSpace: "pre-wrap", wordBreak: "break-word",
                fontFamily: "monospace", color: ink, opacity: 0.85,
              }}>
                {entry.detail}
              </pre>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function btnStyle(color, disabled) {
  return {
    background: disabled ? "#DDD6C7" : color,
    color: "white",
    border: "none",
    borderRadius: 10,
    padding: "10px 14px",
    fontSize: 13,
    fontWeight: 700,
    cursor: disabled ? "default" : "pointer",
  };
}
