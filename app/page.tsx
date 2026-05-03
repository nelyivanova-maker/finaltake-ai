"use client";

import { useState } from "react";

export default function Page() {
  const [script, setScript] = useState(
`MUM: In a minute.
DAUGHTER: Mum? I'm really hungry.
MUM: I said, in a minute.
DAUGHTER: Mum?
MUM: I SAID IN A MINUTE!`
  );

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

    setScript(data.text);
  }

  return (
    <main style={{ background: "#000", color: "#fff", padding: "20px" }}>
      <h1>🎬 FinalTake AI</h1>
      <p>Real AI reader voice for the non-chosen role.</p>

      {/* 1. SCRIPT */}
      <h2>1. Script</h2>

      <input
        type="file"
        accept=".txt,.pdf,.doc,.docx"
        onChange={handleFile}
      />

      <textarea
        value={script}
        onChange={(e) => setScript(e.target.value)}
        style={{
          width: "100%",
          height: "200px",
          marginTop: "10px",
          color: "#000",
        }}
      />

      {/* 2. ROLE */}
      <h2>2. Choose your role</h2>
      <select value={role} onChange={(e) => setRole(e.target.value)}>
        <option>DAUGHTER</option>
        <option>MUM</option>
      </select>

      {/* 3. VOICE */}
      <h2>3. AI Reader Voice</h2>
      <select>
        <option>Soft Female / Mum</option>
        <option>Neutral</option>
      </select>

      {/* 4. DETAILS */}
      <h2>4. Recording details</h2>
      <input placeholder="Your Name" />
      <input placeholder="Role Name" />
      <input placeholder="Agency" />

      {/* PREVIEW */}
      <div style={{ background: "#1e2a3a", padding: "20px", marginTop: "20px" }}>
        <h3>{role}</h3>
        <p>{script.split("\n")[0]}</p>
      </div>

      {/* 5. RECORD */}
      <h2>5. Record</h2>
      <div style={{ background: "#667085", height: "120px", borderRadius: "10px" }} />

      <button style={{ marginTop: "10px" }}>
        Start Recording
      </button>
    </main>
  );
}
