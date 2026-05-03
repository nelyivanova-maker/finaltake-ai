"use client";

import { useState, useEffect } from "react";

function extractRoles(text: string) {
  const matches = text.match(/^([A-Z][A-Z0-9 '’-]{1,40}):/gm) || [];
  return Array.from(
    new Set(matches.map((line) => line.replace(":", "").trim()))
  );
}

export default function Page() {
  const [script, setScript] = useState("");
  const [roles, setRoles] = useState<string[]>([]);
  const [role, setRole] = useState("");

  // Load saved script on start
  useEffect(() => {
    const saved = localStorage.getItem("script");
    if (saved) {
      const newRoles = extractRoles(saved);
      setScript(saved);
      setRoles(newRoles);
      setRole(newRoles[0] || "");
    }
  }, []);

  // Save script whenever it changes
  useEffect(() => {
    if (script) {
      localStorage.setItem("script", script);
    }
  }, [script]);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/extract-script", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Failed to read file");
      return;
    }

    const newScript = data.text || "";
    const newRoles = extractRoles(newScript);

    setScript(newScript);
    setRoles(newRoles);
    setRole(newRoles[0] || "");
  }

  return (
    <main style={{ background: "#000", color: "#fff", padding: "20px" }}>
      <h1>🎬 FinalTake AI</h1>
      <p>Upload and read scripts with AI support.</p>

      {/* 1. SCRIPT */}
      <h2>1. Script</h2>

      {/* Hidden file input */}
      <input
        id="fileInput"
        type="file"
        accept=".txt,.pdf,.doc,.docx"
        style={{ display: "none" }}
        onChange={handleFile}
      />

      {/* Buttons */}
      <div style={{ marginBottom: "10px" }}>
        <button
          onClick={() => document.getElementById("fileInput")?.click()}
          style={{ marginRight: "10px" }}
        >
          Load New Script
        </button>

        <button
          onClick={() => {
            localStorage.removeItem("script");
            setScript("");
            setRoles([]);
            setRole("");
          }}
        >
          Reset
        </button>
      </div>

      {/* Script box */}
      <textarea
        value={script}
        onChange={(e) => {
          const newScript = e.target.value;
          const newRoles = extractRoles(newScript);

          setScript(newScript);
          setRoles(newRoles);

          if (!newRoles.includes(role)) {
            setRole(newRoles[0] || "");
          }
        }}
        style={{
          width: "100%",
          height: "250px",
          color: "#000",
          padding: "10px",
        }}
        placeholder="Upload or paste your script here..."
      />

      {/* 2. ROLE */}
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

      {/* Preview */}
      <div
        style={{
          background: "#1e2a3a",
          padding: "20px",
          marginTop: "20px",
        }}
      >
        <h3>{role || "No role selected"}</h3>
        <p>
          {script
            .split("\n")
            .find((line) => line.startsWith(role + ":")) || ""}
        </p>
      </div>

      {/* Record placeholder */}
      <h2>3. Record</h2>
      <div
        style={{
          background: "#667085",
          height: "120px",
          borderRadius: "10px",
        }}
      />

      <button style={{ marginTop: "10px" }}>Start Recording</button>
    </main>
  );
}
