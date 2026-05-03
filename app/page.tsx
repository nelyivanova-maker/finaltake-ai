"use client";

import { useRef, useState } from "react";

type Cue = {
  role: string;
  text: string;
};

/* ---------- ROLE DETECTION ---------- */
function extractRoles(text: string) {
  const roles = new Set<string>();
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  for (let line of lines) {
    const upper = line.toUpperCase();

    if (/^[A-Z]{2,}$/.test(upper)) roles.add(upper);

    const match = upper.match(/^([A-Z][A-Z0-9 '’.-]{1,35}):/);
    if (match) roles.add(match[1]);
  }

  return Array.from(roles);
}

/* ---------- SCRIPT PARSER ---------- */
function parseCues(text: string, roles: string[]) {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const cues: Cue[] = [];

  let role = "";
  let buffer: string[] = [];

  function save() {
    if (role && buffer.length) {
      cues.push({ role, text: buffer.join(" ") });
    }
  }

  for (let line of lines) {
    const upper = line.toUpperCase();

    if (roles.includes(upper)) {
      save();
      role = upper;
      buffer = [];
      continue;
    }

    const colon = line.match(/^([A-Za-z][A-Za-z0-9 '’.-]{1,35}):\s*(.*)$/);
    if (colon) {
      save();
      role = colon[1].toUpperCase();
      buffer = [colon[2]];
      continue;
    }

    if (role) buffer.push(line);
  }

  save();
  return cues;
}

export default function Page() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const animationRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [script, setScript] = useState("");
  const [roles, setRoles] = useState<string[]>([]);
  const [myRole, setMyRole] = useState("");
  const [voiceRole, setVoiceRole] = useState("");
  const [extraRole1, setExtraRole1] = useState("");
  const [extraRole2, setExtraRole2] = useState("");

  const [analysis, setAnalysis] = useState("");

  const [index, setIndex] = useState(0);

  const [grayBackground, setGrayBackground] = useState(false);
  const [recording, setRecording] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");

  const [actorName, setActorName] = useState("");
  const [roleName, setRoleName] = useState("");
  const [agency, setAgency] = useState("");

  const cues = parseCues(script, roles);

  /* ---------- VOICE ---------- */
  async function read(text: string) {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

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

    audioRef.current = audio;
    audio.play();
  }

  function readIfVoice(i: number) {
    const cue = cues[i];
    if (cue?.role === voiceRole) read(cue.text);
  }

  function nextLine() {
    const next = Math.min(index + 1, cues.length - 1);
    setIndex(next);

    setTimeout(() => readIfVoice(next), 200);
  }

  function previousLine() {
    const prev = Math.max(index - 1, 0);
    setIndex(prev);

    setTimeout(() => readIfVoice(prev), 200);
  }

  function pauseVoice() {
    audioRef.current?.pause();
  }

  /* ---------- VIDEO ---------- */
  function draw() {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = grayBackground ? "#9ca3af" : "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    animationRef.current = requestAnimationFrame(draw);
  }

  async function startRecording() {
    setRecording(true);
    setVideoUrl("");
    setIndex(0);

    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });

    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
    }

    const canvas = canvasRef.current!;
    canvas.width = 1280;
    canvas.height = 720;

    draw();

    const canvasStream = canvas.captureStream(30);
    const finalStream = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...stream.getAudioTracks(),
    ]);

    const chunks: BlobPart[] = [];
    const recorder = new MediaRecorder(finalStream);

    recorder.ondataavailable = (e) => chunks.push(e.data);

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: "video/webm" });
      setVideoUrl(URL.createObjectURL(blob));

      stream.getTracks().forEach((t) => t.stop());
      cancelAnimationFrame(animationRef.current!);
    };

    recorderRef.current = recorder;
    recorder.start();

    setTimeout(() => readIfVoice(0), 500);
  }

  function stopRecording() {
    setRecording(false);
    recorderRef.current?.stop();
  }

  /* ---------- AI ANALYSIS ---------- */
  async function analyzeScript() {
    const res = await fetch("/api/analyze-script", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        script,
        myRole,
        voiceRole,
        extraRole1,
        extraRole2,
      }),
    });

    const data = await res.json();
    setAnalysis(data.analysis || "No analysis.");
  }

  return (
    <main style={{ background: "#000", color: "#fff", padding: 20 }}>
      <h1>FinalTake AI</h1>

      {/* ---------- SECTION 1 ---------- */}
      <h2>1. Analyze Script</h2>

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
          const found = extractRoles(text);

          setScript(text);
          setRoles(found);
          setMyRole(found[0] || "");
          setVoiceRole(found[1] || found[0] || "");
        }}
      />

      <button onClick={() => fileInputRef.current?.click()}>
        Load Script
      </button>

      <textarea
        value={script}
        onChange={(e) => {
          const text = e.target.value;
          const found = extractRoles(text);
          setScript(text);
          setRoles(found);
        }}
        style={{ width: "100%", height: 200, marginTop: 10 }}
      />

      <br /><br />

      <label>Your role: </label>
      <select value={myRole} onChange={(e) => setMyRole(e.target.value)}>
        {roles.map((r) => <option key={r}>{r}</option>)}
      </select>

      <br /><br />

      <label>Voice reads: </label>
      <select value={voiceRole} onChange={(e) => setVoiceRole(e.target.value)}>
        {roles.filter((r) => r !== myRole).map((r) => (
          <option key={r}>{r}</option>
        ))}
      </select>

      <br /><br />

      <label>Extra role 1: </label>
      <select value={extraRole1} onChange={(e) => setExtraRole1(e.target.value)}>
        <option value="">None</option>
        {roles.map((r) => <option key={r}>{r}</option>)}
      </select>

      <br /><br />

      <label>Extra role 2: </label>
      <select value={extraRole2} onChange={(e) => setExtraRole2(e.target.value)}>
        <option value="">None</option>
        {roles.map((r) => <option key={r}>{r}</option>)}
      </select>

      <br /><br />

      <button onClick={analyzeScript}>Analyze Script with AI</button>

      {analysis && (
        <div style={{ background: "#1f2937", padding: 20, marginTop: 20 }}>
          <h3>AI Analysis</h3>
          <pre style={{ whiteSpace: "pre-wrap" }}>{analysis}</pre>
        </div>
      )}

      {/* ---------- SECTION 2 ---------- */}
      <h2>2. Create Video</h2>

      <div style={{ height: 250, overflowY: "auto", background: "#111", padding: 10 }}>
        {cues.map((cue, i) => (
          <div
            key={i}
            style={{
              padding: 10,
              marginBottom: 8,
              background:
                i === index
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

      <br />

      <button onClick={previousLine}>Previous</button>
      <button onClick={pauseVoice} style={{ marginLeft: 10 }}>Pause</button>
      <button onClick={nextLine} style={{ marginLeft: 10 }}>Next</button>

      <h3>Recording</h3>

      <label>
        <input
          type="checkbox"
          checked={grayBackground}
          onChange={(e) => setGrayBackground(e.target.checked)}
        /> Gray background
      </label>

      <br /><br />

      <video ref={videoRef} autoPlay muted style={{ display: "none" }} />

      <canvas ref={canvasRef} style={{ width: 320 }} />

      <br />

      {!recording ? (
        <button onClick={startRecording}>Start Video</button>
      ) : (
        <button onClick={stopRecording}>Stop Video</button>
      )}

      {videoUrl && (
        <a
          href={videoUrl}
          download={`${actorName}_${roleName}_${agency}.webm`}
        >
          Download Video
        </a>
      )}
    </main>
  );
}
