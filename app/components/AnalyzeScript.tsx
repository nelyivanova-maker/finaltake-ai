"use client";

import { useRef, useState } from "react";

function extractRoles(text: string) {
  const roles = new Set<string>();
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);

  for (const line of lines) {
    const upper = line.toUpperCase();

    if (/^[A-Z][A-Z0-9 '’.-]{1,35}$/.test(upper)) {
      roles.add(upper);
    }

    const colon = line.match(/^([A-Za-z][A-Za-z0-9 '’.-]{1,35}):/);
    if (colon) roles.add(colon[1].toUpperCase());
  }

  return Array.from(roles);
}

export default function AnalyzeScript() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [script, setScript] = useState("");
  const [roles, setRoles] = useState<string[]>([]);
  const [myRole, setMyRole] = useState("");
  const [voiceRole, setVoiceRole] = useState("");
  const [analysis, setAnalysis] = useState("");
  const [status, setStatus] = useState("");

  function applyScript(text: string) {
    const found = extractRoles(text);
    setScript(text);
    setRoles(found);
    setMyRole(found[0] || "");
    setVoiceRole(found[1] || found[0] || "");
  }

  async function loadScriptFile(file: File) {
    setStatus("Loading script...");

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/extract-script", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();

    if (!res.ok) {
      setStatus(data.error || "Upload failed.");
      return;
    }

    applyScript(data.text || "");
    setStatus("Script loaded.");
  }

  async function analyzeScript() {
    setAnalysis("Analyzing...");

    const res = await fetch("/api/analyze-script", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ script, myRole, voiceRole }),
    });

    const data = await res.json();
    setAnalysis(data.analysis || "No analysis.");
  }

  return (
    <section style={{ flex: 1, background: "#111827", padding: 24, borderRadius: 24, color: "#fff" }}>
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

      <select value={voiceRole} onChange={(e) => setVoiceRole(e.target.value)}>
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
  );
}
