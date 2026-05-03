"use client";

import { useRef, useState } from "react";

type Cue = {
  role: string;
  text: string;
};

/* ---------- ROLE DETECTION (FIXED) ---------- */
function cleanRole(line: string) {
  return line
    .replace(/\(CONT'D\)/gi, "")
    .replace(/\(CONT’D\)/gi, "")
    .replace(/\(O\.C\.\)/gi, "")
    .replace(/\(V\.O\.\)/gi, "")
    .replace(/:$/, "")
    .trim()
    .toUpperCase();
}

function extractRoles(text: string) {
  const ignore = new Set([
    "INT","EXT","SCENE","CUT","TO","FADE","IN","OUT",
    "DISSOLVE","BEAT","DAY","NIGHT","EVENING","MORNING",
    "DUSK","DAWN","SCREAMS","MOVE","LET","GO",
    "THE","AND","BUT"
  ]);

  const roles = new Set<string>();
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);

  for (const raw of lines) {
    const line = cleanRole(raw);

    if (
      /^[A-Z][A-Z '’.-]{1,35}$/.test(line) &&
      !ignore.has(line) &&
      !line.startsWith("INT.") &&
      !line.startsWith("EXT.") &&
      !line.match(/^SCENE\s+\d+/i)
    ) {
      roles.add(line);
    }

    const colon = raw.match(/^([A-Za-z][A-Za-z0-9 '’.-]{1,35}):/);
    if (colon) roles.add(colon[1].toUpperCase());
  }

  return Array.from(roles).sort();
}

/* ---------- PARSE ---------- */
function parseCues(text: string, roles: string[]) {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  const cues: Cue[] = [];

  let role = "";
  let buffer: string[] = [];

  function save() {
    if (role && buffer.length) {
      cues.push({ role, text: buffer.join(" ") });
    }
  }

  for (const raw of lines) {
    const line = cleanRole(raw);

    if (roles.includes(line)) {
      save();
      role = line;
      buffer = [];
      continue;
    }

    const colon = raw.match(/^([A-Za-z][A-Za-z0-9 '’.-]{1,35}):\s*(.*)$/);
    if (colon) {
      save();
      role = colon[1].toUpperCase();
      buffer = [colon[2]];
      continue;
    }

    if (role) buffer.push(raw);
  }

  save();
  return cues;
}

export default function Page() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [script, setScript] = useState("");
  const [roles, setRoles] = useState<string[]>([]);
  const [myRole, setMyRole] = useState("");
  const [voiceRole, setVoiceRole] = useState("");
  const [extraRole1, setExtraRole1] = useState("");
  const [extraRole2, setExtraRole2] = useState("");

  const [analysis, setAnalysis] = useState("");
  const [status, setStatus] = useState("");

  const [index, setIndex] = useState(0);

  const cues = parseCues(script, roles);

  /* ---------- APPLY SCRIPT ---------- */
  function applyScript(text: string) {
    const found = extractRoles(text);

    setScript(text);
    setRoles(found);
    setMyRole(found[0] || "");
    setVoiceRole(found[1] || found[0] || "");
    setIndex(0);
  }

  /* ---------- LOAD FILE ---------- */
  async function loadScriptFile(file: File) {
    setStatus("Loading script...");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/extract-script", {
        method: "POST",
        body: formData,
      });

      const text = await res.text();

      let data;
      try {
        data = JSON.parse(text);
      } catch {
        setStatus("Upload route returned non-JSON response.");
        return;
      }

      if (!res.ok) {
        setStatus(data.error || "Upload failed.");
        return;
      }

      applyScript(data.text || "");
      setStatus("Script loaded.");
    } catch (e: any) {
      setStatus(e?.message || "Upload failed.");
    }
  }

  /* ---------- ANALYZE ---------- */
  async function analyzeScript() {
    if (!script.trim()) {
      setAnalysis("Load a script first.");
      return;
    }

    setAnalysis("Analyzing script...");

    try {
      const res = await fetch("/api/analyze-script", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          script,
          myRole,
          voiceRole,
          extraRole1,
          extraRole2,
        }),
      });

      const text = await res.text();

      let data;
      try {
        data = JSON.parse(text);
      } catch {
        setAnalysis("Analysis route returned HTML (likely missing route).");
        return;
      }

      setAnalysis(data.analysis || "No analysis returned.");
    } catch (e: any) {
      setAnalysis(e?.message || "Analysis failed.");
    }
  }

  /* ---------- RESET ---------- */
  function resetAll() {
    setScript("");
    setRoles([]);
    setMyRole("");
    setVoiceRole("");
    setExtraRole1("");
    setExtraRole2("");
    setAnalysis("");
    setStatus("");
    setIndex(0);
  }

  return (
    <main style={{ background: "#064e3b", color: "#fff", padding: 20 }}>
      <h1>FinalTake AI</h1>

      <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
        
        {/* SECTION 1 */}
        <section style={{ flex: 1, background: "#111827", padding: 20 }}>
          <h2>Analyze Script</h2>

          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.docx"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) loadScriptFile(file);
            }}
          />

          <button onClick={() => fileInputRef.current?.click()}>
            Load Script
          </button>

          <button onClick={resetAll} style={{ marginLeft: 10 }}>
            Reset
          </button>

          <p>{status}</p>

          <textarea
            value={script}
            onChange={(e) => applyScript(e.target.value)}
            style={{ width: "100%", height: 200, color: "#000" }}
          />

          <h3>Roles</h3>
          <p>{roles.join(", ")}</p>

          <select value={myRole} onChange={(e) => setMyRole(e.target.value)}>
            {roles.map(r => <option key={r}>{r}</option>)}
          </select>

          <select
            value={voiceRole}
            onChange={(e) => setVoiceRole(e.target.value)}
          >
            {roles.filter(r => r !== myRole).map(r => (
              <option key={r}>{r}</option>
            ))}
          </select>

          <br /><br />

          <button onClick={analyzeScript}>
            Analyze Script with AI
          </button>

          <textarea
            value={analysis}
            readOnly
            style={{ width: "100%", height: 200, color: "#000" }}
          />
        </section>

        {/* SECTION 2 */}
        <section style={{ flex: 1, background: "#111827", padding: 20 }}>
          <h2>Create Video</h2>

          <div style={{ height: 250, overflowY: "auto", background: "#000" }}>
            {cues.map((c, i) => (
              <div
                key={i}
                style={{
                  padding: 10,
                  background:
                    i === index
                      ? c.role === myRole
                        ? "green"
                        : "blue"
                      : "#333",
                }}
              >
                <b>{c.role}</b>
                <p>{c.text}</p>
              </div>
            ))}
          </div>

          <button onClick={() => setIndex(Math.max(index - 1, 0))}>
            Previous
          </button>

          <button onClick={() => setIndex(Math.min(index + 1, cues.length - 1))}>
            Next
          </button>
        </section>

      </div>
    </main>
  );
}
