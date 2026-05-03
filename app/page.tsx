"use client";

import { useState } from "react";

function extractRoles(text: string) {
  const matches = text.match(/^([A-Z][A-Z0-9 '’-]{1,40}):/gm) || [];
  return Array.from(
    new Set(matches.map((line) => line.replace(":", "").trim()))
  );
}

export default function Page() {
  const defaultScript = `MUM: In a minute.
DAUGHTER: Mum? I'm really hungry.
MUM: I said, in a minute.
DAUGHTER: Mum?
MUM: I SAID IN A MINUTE!`;

  const [script, setScript] = useState(defaultScript);
  const [roles, setRoles] = useState<string[]>(extractRoles(defaultScript));
  const [role, setRole] = useState("DAUGHTER");

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
      <p>Real AI reader voice for the non-chosen role.</p>

      <h2>1. Script</h2>

      <input
        type="file"
        accept=".txt,.pdf,.doc,.docx"
        onChange={handleFile}
      />

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
          height: "200px",
          marginTop: "10px",
          color: "#000",
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

      <h2>3. AI Reader Voice</h2>
      <select>
        <option>Soft Female / Mum</option>
        <option>Neutral</option>
      </select>

      <h2>4. Recording details</h2>
      <input placeholder="Your Name" />
      <input placeholder="Role Name" />
      <input placeholder="Agency" />

      <div style={{ background: "#1e2a3a", padding: "20px", marginTop: "20px" }}>
        <h3>{role || "No role selected"}</h3>
        <p>{script.split("\n").find((line) => line.startsWith(role + ":")) || ""}</p>
      </div>

      <h2>5. Record</h2>
      <div style={{ background: "#667085", height: "120px", borderRadius: "10px" }} />

      <button style={{ marginTop: "10px" }}>Start Recording</button>
    </main>
  );
}
