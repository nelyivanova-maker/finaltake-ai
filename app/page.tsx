"use client";

import { useEffect, useRef, useState } from "react";

function extractRoles(text: string) {
  const matches = text.match(/^([A-Z][A-Z0-9 '’-]{1,40}):/gm) || [];
  return Array.from(new Set(matches.map((line) => line.replace(":", "").trim())));
}

export default function Page() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [script, setScript] = useState("");
  const [roles, setRoles] = useState<string[]>([]);
  const [role, setRole] = useState("");
  const [fileName, setFileName] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("script");
    if (saved) {
      const foundRoles = extractRoles(saved);
      setScript(saved);
      setRoles(foundRoles);
      setRole(foundRoles[0] || "");
    }
  }, []);

  useEffect(() => {
    if (script) {
      localStorage.setItem("script", script);
    }
  }, [script]);

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
      setStatus("Upload failed. Check app/api/extract-script/route.ts.");
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
      <p>Upload and read scripts with AI support.</p>

      <h2>1. Script</h2>

      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.pdf,.doc,.docx"
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
        placeholder="Upload or paste your script here..."
        style={{
          width: "100%",
          height: "270px",
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
        <p>{script.split("\n").find((line) => line.startsWith(role + ":")) || ""}</p>
      </div>

      <h2>3. Record</h2>
      <div style={{ background: "#667085", height: "120px", borderRadius: "10px" }} />

      <button style={{ marginTop: "10px" }}>Start Recording</button>
    </main>
  );
}
