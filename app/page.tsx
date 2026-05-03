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
        speaker: match ? match[1].trim() : "UNKNOWN",
        text: match ? match[2].trim() : raw.trim(),
      };
    })
    .filter((line) => line.text);
}

export default function Page() {
  const [script, setScript] = useState(demoScript);
  const [myRole, setMyRole] = useState("DAUGHTER");
  const [lineIndex, setLineIndex] = useState(0);
  const [mode, setMode] = useState("video");
  const [name, setName] = useState("");
  const [roleName, setRoleName] = useState("");
  const [agency, setAgency] = useState("");
  const [recording, setRecording] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState("");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const lines = useMemo(() => parseScript(script), [script]);
  const roles = Array.from(new Set(lines.map((line) => line.speaker)));
  const current = lines[lineIndex];

  const isMyLine = current?.speaker === myRole;

  function nextLine() {
    setLineIndex((i) => Math.min(i + 1, lines.length - 1));
  }

  function reset() {
    setLineIndex(0);
  }

  async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: mode === "video",
      audio: true,
    });

    streamRef.current = stream;
    chunksRef.current = [];

    if (videoRef.current && mode === "video") {
      videoRef.current.srcObject = stream;
    }

    const recorder = new MediaRecorder(stream);
    recorderRef.current = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, {
        type: mode === "video" ? "video/webm" : "audio/webm",
      });

      setDownloadUrl(URL.createObjectURL(blob));
    };

    recorder.start();
    setRecording(true);
  }

  function stopRecording() {
    recorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    setRecording(false);
  }

  const fileName = `${name || "Name"}_${roleName || myRole || "Role"}_${agency || "Agency"}.webm`;

  return (
    <main style={{ padding: 24, fontFamily: "Arial", background: "#111", color: "white", minHeight: "100vh" }}>
      <h1>🎬 FinalTake AI</h1>
      <p>Self-tape MVP: AI reads the other role. You read your selected role.</p>

      <section style={{ marginTop: 24 }}>
        <h2>1. Script</h2>
        <textarea
          value={script}
          onChange={(e) => {
            setScript(e.target.value);
            setLineIndex(0);
          }}
          style={{ width: "100%", height: 140, padding: 12 }}
        />
      </section>

      <section style={{ marginTop: 24 }}>
        <h2>2. Choose your role</h2>
        <select value={myRole} onChange={(e) => setMyRole(e.target.value)}>
          {roles.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>
      </section>

      <section style={{ marginTop: 24 }}>
        <h2>3. Recording details</h2>
        <input placeholder="Your Name" value={name} onChange={(e) => setName(e.target.value)} />
        <input placeholder="Role Name" value={roleName} onChange={(e) => setRoleName(e.target.value)} />
        <input placeholder="Agency" value={agency} onChange={(e) => setAgency(e.target.value)} />

        <div style={{ marginTop: 12 }}>
          <select value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="video">Video + Audio</option>
            <option value="audio">Audio Only</option>
          </select>
        </div>
      </section>

      <section style={{ marginTop: 24, background: "#1e293b", padding: 24, borderRadius: 16 }}>
        <h2>{current?.speaker}</h2>
        <p style={{ fontSize: 36, fontWeight: "bold" }}>{current?.text}</p>

        <p>
          {isMyLine
            ? "Your turn: read this line."
            : "AI Reader: this line should be read by the app."}
        </p>

        <button onClick={nextLine}>Next Line</button>
        <button onClick={reset} style={{ marginLeft: 8 }}>Reset</button>
      </section>

      <section style={{ marginTop: 24 }}>
        <h2>4. Record</h2>

        {mode === "video" && (
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            style={{
              width: "100%",
              maxWidth: 600,
              background: "#64748b",
              borderRadius: 16,
            }}
          />
        )}

        <div style={{ marginTop: 16 }}>
          {!recording ? (
            <button onClick={startRecording}>Start Recording</button>
          ) : (
            <button onClick={stopRecording}>Stop Recording</button>
          )}
        </div>

        {downloadUrl && (
          <p>
            <a href={downloadUrl} download={fileName} style={{ color: "#38bdf8" }}>
              Download {fileName}
            </a>
          </p>
        )}
      </section>
    </main>
  );
}
