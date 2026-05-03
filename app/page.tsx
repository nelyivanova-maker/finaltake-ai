"use client";

import { useState, useEffect, useRef } from "react";

/* -------- ROLE DETECTION -------- */
function extractRoles(text: string) {
  const ignoreWords = new Set([
    "INT","EXT","SCENE","CONTINUED","CONT","CUT","TO","FADE","OUT","IN",
    "DISSOLVE","BEAT","DAY","NIGHT","EVENING","MORNING","DUSK","DAWN",
    "THE","AND","BUT","DON","LET","OFF"
  ]);

  const roles = new Set<string>();

  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  for (const rawLine of lines) {
    const line = rawLine
      .replace(/\(CONT'D\)/gi, "")
      .replace(/\(CONT’D\)/gi, "")
      .replace(/\(O\.C\.\)/gi, "")
      .replace(/\(V\.O\.\)/gi, "")
      .trim();

    // 1. Detect "EVIE:" or "Dad:"
    const colonMatch = line.match(/^([A-Za-z][A-Za-z0-9 '’.-]{1,35}):/);
    if (colonMatch) {
      roles.add(colonMatch[1].trim());
    }

    // 2. Detect standalone names
    if (
      /^[A-Za-z][A-Za-z0-9 '’.-]{1,35}$/.test(line) &&
      !ignoreWords.has(line.toUpperCase()) &&
      !line.startsWith("INT.") &&
      !line.startsWith("EXT.") &&
      !line.match(/^SCENE\s+\d+/i)
    ) {
      roles.add(line);
    }

    // 3. Detect uppercase names inside lines (EVIE, CASSIE etc)
    const uppercaseMatches = line.match(/\b[A-Z][A-Z]{2,}\b/g) || [];
    for (const name of uppercaseMatches) {
      if (!ignoreWords.has(name)) {
        roles.add(name);
      }
    }
  }

  return Array.from(roles).sort();
}

/* -------- PAGE -------- */
export default function Page() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [script, setScript] = useState("");
  const [roles, setRoles] = useState<string[]>([]);
  const [role, setRole] = useState("");
  const [fileName, setFileName] = useState("");
  const [status, setStatus] = useState("");

  // Load saved script
  useEffect(() => {
    const saved = localStorage.getItem("script");
    if (saved) {
      const foundRoles = extractRoles(saved);
      setScript(saved);
      setRoles(foundRoles);
      setRole(foundRoles[0] || "");
    }
  }, []);

  // Save script
  useEffect(() => {
    if (script) {
      localStorage.setItem("script", script);
    }
  }, [script]);

  // Handle file upload
  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
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
        setStatus(data.error || "Could not read file.");
        return;
      }

      const loadedText = data.text || "";
      const foundRoles = extractRoles(loadedText);

      setScript(loadedText);
      setRoles(foundRoles);
      setRole(foundRoles[0] || "");
      setStatus("Script loaded.");
    } catch (error) {
      console.error(error);
      setStatus("Upload failed.");
    }

    e.target.value = "";
  }

  function resetScript() {
    localStorage.removeItem("script");
    setScript("");
    setRoles([]);
    setRole("");
    setFileName("");
    setStatus("");
  }

  return (
    <main style={{ background: "#000", color: "#fff", padding: "20px", minHeight: "100vh" }}>
      <h1>🎬 FinalTake AI</h1>
      <p>Upload and read scripts.</p>

      <h2>1. Script</h2>

      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.docx"
        style={{ display: "none" }}
        onChange={handleFile}
      />

      <button onClick={() => fileInputRef.current?.click()}>
        Load New Script
      </button>

      <button onClick={resetScript} style={{ marginLeft: "10px" }}>
        Reset
      </button>

      {fileName && <p>Selected: {fileName}</p>}
      {status && <p>{status}</p>}

      <textarea
        value={script}
        onChange={(e) => {
          const newScript = e.target.value;
          const foundRoles = extractRoles(newScript);

          setScript(newScript);
          setRoles(foundRoles);

          if (!foundRoles.includes(role)) {
            setRole(foundRoles[0] || "");
          }
        }}
        placeholder="Upload or paste your script..."
        style={{
          width: "100%",
          height: "280px",
          marginTop: "10px",
          color: "#000",
          padding: "10px",
        }}
      />

      <h2>2. Choose your role</h2>

      <select value={role} onChange={(e) => setRole(e.target.value)}>
        {roles.length > 0 ? (
          roles.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))
        ) : (
          <option>No roles found</option>
        )}
      </select>

      <div style={{ background: "#1e2a3a", padding: "20px", marginTop: "20px" }}>
        <h3>{role || "No role selected"}</h3>
        <p>
          {script
            .split("\n")
            .find((line) => line.includes(role)) || ""}
        </p>
      </div>

      <h2>3. Record</h2>
      <div style={{ background: "#667085", height: "120px", borderRadius: "10px" }} />

      <button style={{ marginTop: "10px" }}>Start Recording</button>
    </main>
  );
}
