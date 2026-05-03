"use client";

import { useEffect, useRef, useState } from "react";

type Cue = {
  role: string;
  text: string;
};

function extractRoles(text: string) {
  const roles = new Set<string>();
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  for (let line of lines) {
    const upper = line.toUpperCase();

    if (/^[A-Z]{2,}$/.test(upper)) roles.add(upper);

    const match = upper.match(/^([A-Z][A-Z0-9 '’.-]{1,35}):/);
    if (match) roles.add(match[1]);
  }

  return Array.from(roles).sort();
}

function parseCues(text: string, roles: string[]) {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const cues: Cue[] = [];

  let currentRole = "";
  let currentText: string[] = [];

  function save() {
    if (currentRole && currentText.length) {
      cues.push({ role: currentRole, text: currentText.join(" ") });
    }
  }

  for (let raw of lines) {
    const line = raw.trim();
    const upper = line.toUpperCase();

    if (roles.includes(upper)) {
      save();
      currentRole = upper;
      currentText = [];
      continue;
    }

    const colon = line.match(/^([A-Za-z][A-Za-z0-9 '’.-]{1,35}):\s*(.*)$/);
    if (colon) {
      save();
      currentRole = colon[1].toUpperCase();
      currentText = [colon[2]];
      continue;
    }

    if (currentRole) currentText.push(line);
  }

  save();
  return cues;
}

export default function Page() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);

  const [script, setScript] = useState("");
  const [roles, setRoles] = useState<string[]>([]);
  const [myRole, setMyRole] = useState("");
  const [voiceRole, setVoiceRole] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);

  const [videoUrl, setVideoUrl] = useState("");
  const [recording, setRecording] = useState(false);

  const [actorName, setActorName] = useState("");
  const [roleName, setRoleName] = useState("");
  const [agency, setAgency] = useState("");

  const cues = parseCues(script, roles);

  async function readText(text: string) {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    });

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.play();
  }

  function start() {
    const cue = cues[currentIndex];
    if (cue && cue.role === voiceRole) {
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

  async function startRecording() {
    setRecording(true);
    setVideoUrl("");

    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });

    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }

    const chunks: BlobPart[] = [];
    const recorder = new MediaRecorder(stream);

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      setVideoUrl(url);
      stream.getTracks().forEach((t) => t.stop());
    };

    recorderRef.current = recorder;
    recorder.start();

    setTimeout(start, 400);
  }

  function stopRecording() {
    setRecording(false);
    recorderRef.current?.stop();
  }

  return (
    <main style={{ background: "#000", color: "#fff", padding: 20 }}>
      <h1>FinalTake AI</h1>

      <h2>1. Script</h2>

      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.docx"
        style={{ display: "none" }}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;

          const formData = new FormData();
          formData.append("file", file);

          const res = await fetch("/api/extract-script", {
            method: "POST",
            body: formData,
          });

          const data = await res.json();
          const text = data.text || "";

          const foundRoles = extractRoles(text);
          setScript(text);
          setRoles(foundRoles);
          setMyRole(foundRoles[0] || "");
          setVoiceRole(foundRoles[1] || foundRoles[0] || "");
          setCurrentIndex(0);
        }}
      />

      <button onClick={() => fileInputRef.current?.click()}>
        Load Script
      </button>

      <textarea
        value={script}
        onChange={(e) => {
          const text = e.target.value;
          const foundRoles = extractRoles(text);
          setScript(text);
          setRoles(foundRoles);
        }}
        style={{ width: "100%", height: 200, marginTop: 10 }}
      />

      <h2>2. Roles</h2>

      <select value={myRole} onChange={(e) => setMyRole(e.target.value)}>
        {roles.map((r) => (
          <option key={r}>{r}</option>
        ))}
      </select>

      <select
        value={voiceRole}
        onChange={(e) => setVoiceRole(e.target.value)}
        style={{ marginLeft: 10 }}
      >
        {roles.filter((r) => r !== myRole).map((r) => (
          <option key={r}>{r}</option>
        ))}
      </select>

      <h2>3. Reading</h2>

      <div style={{ height: 300, overflowY: "auto", background: "#111", padding: 10 }}>
        {cues.map((cue, i) => (
          <div
            key={i}
            style={{
              marginBottom: 10,
              padding: 10,
              background:
                i === currentIndex
                  ? cue.role === myRole
                    ? "#166534"
                    : "#1d4ed8"
                  : "#333",
            }}
          >
            <strong>{cue.role}</strong>
            <p>{cue.text}</p>
          </div>
        ))}
      </div>

      <h2>4. Controls</h2>

      <button onClick={start}>Start</button>
      <button onClick={() => speechSynthesis.pause()} style={{ marginLeft: 10 }}>
        Pause
      </button>
      <button onClick={() => speechSynthesis.cancel()} style={{ marginLeft: 10 }}>
        Stop
      </button>
      <button onClick={nextLine} style={{ marginLeft: 10 }}>
        Next line
      </button>

      <h2>Recording details</h2>

      <input placeholder="Your Name" value={actorName} onChange={(e) => setActorName(e.target.value)} />
      <input placeholder="Role Name" value={roleName} onChange={(e) => setRoleName(e.target.value)} style={{ marginLeft: 10 }} />
      <input placeholder="Agency" value={agency} onChange={(e) => setAgency(e.target.value)} style={{ marginLeft: 10 }} />

      <h2>5. Record</h2>

      <div style={{ background: "#9ca3af", padding: 20, borderRadius: 10 }}>
        <video
          ref={videoRef}
          autoPlay
          muted
          style={{ width: 320, borderRadius: 8 }}
        />
      </div>

      {!recording ? (
        <button onClick={startRecording}>Start Recording</button>
      ) : (
        <button onClick={stopRecording}>Stop Recording</button>
      )}

      {videoUrl && (
        <a
          href={videoUrl}
          download={`${(actorName || "actor").replace(/\s+/g, "_")}_${(roleName || myRole).replace(/\s+/g, "_")}_${(agency || "agency").replace(/\s+/g, "_")}.webm`}
        >
          Download Video
        </a>
      )}
    </main>
  );
}
