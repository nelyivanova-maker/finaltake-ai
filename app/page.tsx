"use client";

import { useMemo, useRef, useState } from "react";

const demoScript = `MUM: In a minute.
DAUGHTER: Mum? I’m really hungry.
MUM: I said, in a minute.
DAUGHTER: Mum?
MUM: I SAID IN A MINUTE!`;

function parseScript(text: string) {
  return text
    .split(/\n+/)
    .map((raw, index) => {
      const match = raw.trim().match(/^([^:]+):\s*(.*)$/);
      return {
        id: index,
        speaker: match ? match[1].trim().toUpperCase() : "UNKNOWN",
        text: match ? match[2].trim() : raw.trim(),
      };
    })
    .filter((line) => line.text);
}

export default function Page() {
  const [script, setScript] = useState(demoScript);
  const [roles, setRoles] = useState<string[]>(["MUM", "DAUGHTER"]);
  const [myRole, setMyRole] = useState("DAUGHTER");
  const [lineIndex, setLineIndex] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const lines = useMemo(() => parseScript(script), [script]);
  const current = lines[lineIndex];
  const isMyLine = current?.speaker === myRole;

  async function aiReadLine() {
    if (!current || isMyLine) return;

    setIsSpeaking(true);

    const response = await fetch("/api/voice", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: current.text }),
    });

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);

    audio.onended = () => {
      setIsSpeaking(false);
      nextLine();
    };

    await audio.play();
  }

  function nextLine() {
    setLineIndex((i) => Math.min(i + 1, lines.length - 1));
  }

  function reset() {
    setLineIndex(0);
  }

  return (
    <main style={{ padding: 24, background: "#111", color: "white", minHeight: "100vh" }}>
      <h1>🎬 FinalTake AI</h1>

      {/* FILE UPLOAD */}
      <section style={{ marginTop: 24 }}>
        <h2>Upload Script (TXT / PDF / DOCX)</h2>

        <input
          type="file"
          accept=".txt,.pdf,.docx"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;

            const formData = new FormData();
            formData.append("file", file);

            const response = await fetch("/api/extract-script", {
              method: "POST",
              body: formData,
            });

            const data = await response.json();

            if (data.text) {
              setScript(data.text);
              setLineIndex(0);

              if (data.roles && data.roles.length > 0) {
                setRoles(data.roles);
                setMyRole(data.roles[0]);
              }

              alert(`Roles detected: ${data.roles?.join(", ")}`);
            } else {
              alert("Could not read file");
            }
          }}
        />
      </section>

      {/* ROLE SELECT */}
      <section style={{ marginTop: 24 }}>
        <h2>Your Role</h2>
        <select value={myRole} onChange={(e) => setMyRole(e.target.value)}>
          {roles.map((role) => (
            <option key={role}>{role}</option>
          ))}
        </select>
      </section>

      {/* SCRIPT DISPLAY */}
      <section style={{ marginTop: 24, background: "#1e293b", padding: 20, borderRadius: 12 }}>
        <h2>{current?.speaker}</h2>
        <p style={{ fontSize: 32 }}>{current?.text}</p>

        {!isMyLine && (
          <button onClick={aiReadLine}>
            {isSpeaking ? "Speaking..." : "🎭 AI Read Line"}
          </button>
        )}

        {isMyLine && <p>Your turn 🎭</p>}

        <div style={{ marginTop: 12 }}>
          <button onClick={nextLine}>Next</button>
          <button onClick={reset} style={{ marginLeft: 8 }}>
            Reset
          </button>
        </div>
      </section>
    </main>
  );
}
