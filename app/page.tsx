"use client";

import { useEffect, useRef, useState } from "react";

type Cue = {
  role: string;
  text: string;
};

function extractRoles(text: string) {
  const ignoreWords = new Set([
    "INT", "EXT", "SCENE", "CUT", "TO", "FADE", "IN", "OUT",
    "DISSOLVE", "BEAT", "DAY", "NIGHT", "EVENING", "MORNING",
    "DUSK", "DAWN", "SCREAMS", "MOVE", "LET", "GO"
  ]);

  const roles = new Set<string>();
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i]
      .replace(/\(CONT'D\)/gi, "")
      .replace(/\(CONT’D\)/gi, "")
      .replace(/\(O\.C\.\)/gi, "")
      .replace(/\(V\.O\.\)/gi, "")
      .trim();

    const nextLine = lines[i + 1] || "";

    if (
      /^[A-Z]{2,}$/.test(line) &&
      !ignoreWords.has(line) &&
      nextLine.length > 0 &&
      !nextLine.match(/^[A-Z\s]+$/)
    ) {
      roles.add(line);
    }

    const colonMatch = line.match(/^([A-Za-z][A-Za-z0-9 '’.-]{1,35}):/);
    if (colonMatch) {
      roles.add(colonMatch[1].toUpperCase());
    }
  }

  return Array.from(roles).sort();
}

function parseCues(text: string, roles: string[]) {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const cues: Cue[] = [];
  let currentRole = "";
  let currentText: string[] = [];

  function saveCue() {
    if (currentRole && currentText.length > 0) {
      cues.push({
        role: currentRole,
        text: currentText.join(" "),
      });
    }
  }

  for (const raw of lines) {
    let line = raw
      .replace(/\(CONT'D\)/gi, "")
      .replace(/\(CONT’D\)/gi, "")
      .replace(/\(O\.C\.\)/gi, "")
      .replace(/\(V\.O\.\)/gi, "")
      .trim();

    const upperLine = line.toUpperCase();

    if (roles.includes(upperLine)) {
      saveCue();
      currentRole = upperLine;
      currentText = [];
      continue;
    }

    const colonMatch = line.match(/^([A-Za-z][A-Za-z0-9 '’.-]{1,35}):\s*(.*)$/);
    if (colonMatch) {
      saveCue();
      currentRole = colonMatch[1].toUpperCase();
      currentText = [colonMatch[2]];
      continue;
    }

    if (currentRole) {
      currentText.push(line);
    }
  }

  saveCue();
  return cues;
}

export default function Page() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cueRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [script, setScript] = useState("");
  const [roles, setRoles] = useState<string[]>([]);
  const [myRole, setMyRole] = useState("");
  const [voiceRole, setVoiceRole] = useState("");
  const [fileName, setFileName] = useState("");
  const [status, setStatus] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);

  const cues = parseCues(script, roles);

  useEffect(() => {
    const saved = localStorage.getItem("script");
    if (saved) {
      const foundRoles = extractRoles(saved);
      setScript(saved);
      setRoles(foundRoles);
      setMyRole(foundRoles[0] || "");
      setVoiceRole(foundRoles[1] || foundRoles[0] || "");
    }
  }, []);

  useEffect(() => {
    if (script) localStorage.setItem("script", script);
  }, [script]);

  useEffect(() => {
    cueRefs.current[currentIndex]?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [currentIndex]);

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
      setMyRole(foundRoles[0] || "");
      setVoiceRole(foundRoles[1] || foundRoles[0] || "");
      setCurrentIndex(0);
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
    setMyRole("");
    setVoiceRole("");
    setFileName("");
    setStatus("");
    setCurrentIndex(0);
  }

  function readText(text: string) {
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.volume = 1;

    window.speechSynthesis.speak(utterance);
  }

  function playCurrentLine() {
    const cue = cues[currentIndex];
    if (!cue) return;

    if (cue.role === voiceRole) {
      readText(cue.text);
    }
  }

  function nextLine() {
    const next = Math.min(currentIndex + 1, cues.length - 1);
    setCurrentIndex(next);

    setTimeout(() => {
      const cue = cues[next];
      if (cue?.role === voiceRole) {
        readText(cue.text);
      }
    }, 200);
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
          setMyRole(foundRoles[0] || "");
          setVoiceRole(foundRoles[1] || foundRoles[0] || "");
          setCurrentIndex(0);
        }}
        placeholder="Upload or paste your script..."
        style={{
          width: "100%",
          height: "220px",
          marginTop: "10px",
          color: "#000",
          padding: "10px",
        }}
      />

      <h2>2. Choose roles</h2>

      <label>Your role: </label>
      <select value={myRole} onChange={(e) => setMyRole(e.target.value)}>
        {roles.map((r) => (
          <option key={r} value={r}>{r}</option>
        ))}
      </select>

      <br />
      <br />

      <label>Voice reads: </label>
      <select value={voiceRole} onChange={(e) => setVoiceRole(e.target.value)}>
        {roles.map((r) => (
          <option key={r} value={r}>{r}</option>
        ))}
      </select>

      <h2>3. Reading window</h2>

      <div
        style={{
          background: "#111827",
          height: "320px",
          overflowY: "auto",
          padding: "20px",
          borderRadius: "10px",
        }}
      >
        {cues.length === 0 && <p>No dialogue found.</p>}

        {cues.map((cue, index) => {
          const isCurrent = index === currentIndex;
          const isMine = cue.role === myRole;
          const isVoice = cue.role === voiceRole;

          return (
            <div
              key={index}
              ref={(el) => {
                cueRefs.current[index] = el;
              }}
              style={{
                padding: "14px",
                marginBottom: "12px",
                borderRadius: "8px",
                background: isCurrent
                  ? isMine
                    ? "#14532d"
                    : isVoice
                    ? "#1d4ed8"
                    : "#374151"
                  : "#1f2937",
                border: isCurrent ? "3px solid #fff" : "1px solid #374151",
                opacity: isCurrent ? 1 : 0.55,
              }}
            >
              <strong>{cue.role}</strong>
              <p style={{ fontSize: isCurrent ? "26px" : "18px" }}>
                {cue.text}
              </p>
            </div>
          );
        })}
      </div>

      <h2>4. Controls</h2>

      <button onClick={playCurrentLine}>
        ▶ Read current voice line
      </button>

      <button onClick={nextLine} style={{ marginLeft: "10px" }}>
        Next line
      </button>

      <button
        onClick={() => window.speechSynthesis.cancel()}
        style={{ marginLeft: "10px" }}
      >
        Stop voice
      </button>

      <h2>5. Record</h2>
      <div style={{ background: "#667085", height: "120px", borderRadius: "10px" }} />

      <button style={{ marginTop: "10px" }}>Start Recording</button>
    </main>
  );
}
