"use client";

import { useRef, useState } from "react";

type AnalyzeScriptProps = {
  script: string;
  setScript: (value: string) => void;
  roles: string[];
  setRoles: (value: string[]) => void;
  myRole: string;
  setMyRole: (value: string) => void;
  voiceRole: string;
  setVoiceRole: (value: string) => void;
};

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
    "INT", "EXT", "SCENE", "CUT", "TO", "FADE", "IN", "OUT",
    "DISSOLVE", "BEAT", "DAY", "NIGHT", "EVENING", "MORNING",
    "DUSK", "DAWN", "SCREAMS", "MOVE", "LET", "GO",
    "THE", "AND", "BUT", "CONTINUED", "CONT"
  ]);

  const found = new Set<string>();
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  for (const raw of lines) {
    const line = cleanRole(raw);

    if (
      /^[A-Z][A-Z0-9 '’.-]{1,35}$/.test(line) &&
      !ignore.has(line) &&
      !line.startsWith("INT.") &&
      !line.startsWith("EXT.") &&
      !line.match(/^SCENE\s+\d+/i) &&
      line.split(" ").length <= 3
    ) {
      found.add(line);
    }

    const colon = raw.match(/^([A-Za-z][A-Za-z0-9 '’.-]{1,35}):/);
    if (colon) {
      const role = colon[1].trim().toUpperCase();
      if (!ignore.has(role) && role.split(" ").length <= 3) {
        found.add(role);
      }
    }
  }

  return Array.from(found).sort();
}

export default function AnalyzeScript({
  script,
  setScript,
  roles,
  setRoles,
  myRole,
  setMyRole,
  voiceRole,
  setVoiceRole,
}: AnalyzeScriptProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [analysis, setAnalysis] = useState("");
  const [status, setStatus] = useState("");

  function applyScript(text: string) {
    const foundRoles = extractRoles(text);

    setScript(text);
    setRoles(foundRoles);
    setMyRole(foundRoles[0] || "");
    setVoiceRole(foundRoles[1] || foundRoles[0] || "");
  }

  function resetAll() {
    setScript("");
    setRoles([]);
    setMyRole("");
    setVoiceRole("");
    setAnalysis("");
    setStatus("");
  }

  async function loadScriptFile(file: File) {
    setStatus("Loading script...");

    try {
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
    } catch (error: any) {
      setStatus(error?.message || "Upload failed.");
    }
  }

  async function analyzeScript() {
    if (!script.trim()) {
      setAnalysis("Please load a script first.");
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
        }),
      });

      const data = await res.json();
      setAnalysis(data.analysis || data.error || "No analysis returned.");
    } catch (error: any) {
      setAnalysis(error?.message || "Analysis failed.");
    }
  }

  return (
    <section
      style={{
        flex: "1 1 420px",
        background: "#111827",
        padding: 24,
        borderRadius: 24,
        color: "#fff",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <div
          style={{
            width: 86,
            height: 86,
            borderRadius: "50%",
            background: "#f97316",
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 38,
          }}
        >
          📄
        </div>

        <h2>Analyze Script</h2>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.docx"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) loadScriptFile(file);
          e.target.value = "";
        }}
      />

      <button onClick={() => fileInputRef.current?.click()}>
        Load Script
      </button>

      <button onClick={resetAll} style={{ marginLeft: 10 }}>
        Reset
      </button>

      {status && <p>{status}</p>}

      <textarea
        value={script}
        onChange={(e) => applyScript(e.target.value)}
        placeholder="Upload or paste your script here..."
        style={{
          width: "100%",
          height: 220,
          marginTop: 12,
          padding: 10,
          color: "#000",
        }}
      />

      <h3>Detected roles</h3>

      <p>
        {roles.length > 0 ? roles.join(", ") : "No roles detected yet."}
      </p>

      <label>Your role: </label>
      <select value={myRole} onChange={(e) => setMyRole(e.target.value)}>
        {roles.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>

      <br />
      <br />

      <label>Voice reads: </label>
      <select value={voiceRole} onChange={(e) => setVoiceRole(e.target.value)}>
        {roles
          .filter((r) => r !== myRole)
          .map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
      </select>

      <br />
      <br />

      <button onClick={analyzeScript}>
        Analyze Script with AI
      </button>

      <h3>AI Analysis</h3>

      <textarea
        value={analysis}
        onChange={(e) => setAnalysis(e.target.value)}
        placeholder="AI analysis will appear here..."
        style={{
          width: "100%",
          height: 240,
          padding: 10,
          color: "#000",
          background: "#f3f4f6",
        }}
      />
    </section>
  );
}
