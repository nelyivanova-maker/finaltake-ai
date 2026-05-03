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
  const [voice, setVoice] = useState("EXAVITQu4vr4xnSDxMaL");
  const [isSpeaking, setIsSpeaking] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const lines = useMemo(() => parseScript(script), [script]);
  const roles = Array.from(new Set(lines.map((line) => line.speaker)));
  const current = lines[lineIndex];
  const isMyLine = current?.speaker === myRole;

  async function aiReadLine() {
    if (!current || isMyLine) return;

    setIsSpeaking(true);

    try {
      const response = await fetch("/api/voice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: current.text,
          voiceId: voice,
        }),
      });

      if (!response.ok) {
        throw new Error("Voice generation failed");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);

      audio.onended = () => {
        setIsSpeaking(false);
        nextLine();
      };

      audio.onerror = () => {
        setIsSpeaking(false);
      };

      await audio.play();
    } catch (error) {
      setIsSpeaking(false);
      alert("AI voice failed. Check your ElevenLabs API key in Vercel.");
    }
  }

  function nextLine() {
    setLineIndex((i) => Math.min(i + 1, lines.length - 1));
  }

  function reset() {
    setLineIndex(0);
    window.speechSynthesis?.cancel();
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
      <p>Real AI reader voice for the non-chosen role.</p>

      <section style={{ marginTop: 24 }}>
        <h2>1. Script</h2>

        <input
          type="file"
          accept=".txt"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = () => {
              setScript(String(reader.result || ""));
              setLineIndex(0);
            };
            reader.readAsText(file);
          }}
        />

        <textarea
          value={script}
          onChange={(e) => {
            setScript(e.target.value);
            setLineIndex(0);
          }}
          style={{ width: "100%", height: 140, padding: 12, marginTop: 12 }}
        />
      </section>

      <section style={{ marginTop: 24 }}>
        <h2>2. Choose your role</h2>
        <select value={myRole} onChange={(e) => setMyRole(e.target.value)}>
          {roles.map((role) => (
            <option key={role}>{role}</option>
          ))}
        </select>
      </section>

      <section style={{ marginTop: 24 }}>
        <h2>3. AI Reader Voice</h2>
        <select value={voice} onChange={(e) => setVoice(e.target.value)}>
          <option value="EXAVITQu4vr4xnSDxMaL">Soft Female / Mum</option>
          <option value="pNInz6obpgDQGcFmaJgB">Warm Male</option>
          <option value="21m00Tcm4TlvDq8ikWAM">Young Female</option>
          <option value="AZnzlk1XvdvUeBnXmlld">Clear Narrator</option>
        </select>
      </section>

      <section style={{ marginTop: 24 }}>
        <h2>4. Recording details</h2>

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

        {!isMyLine && (
          <button onClick={aiReadLine} disabled={isSpeaking} style={{ marginRight: 8 }}>
            {isSpeaking ? "Speaking..." : "🎭 AI Read Actor Voice"}
          </button>
        )}

        {isMyLine && <p>Your turn: read this line.</p>}

        <button onClick={nextLine}>Next</button>
        <button onClick={reset} style={{ marginLeft: 8 }}>Reset</button>
      </section>

      <section style={{ marginTop: 24 }}>
        <h2>5. Record</h2>

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
