"use client";

import { useRef, useState } from "react";

type Cue = {
  role: string;
  text: string;
};

function cleanRole(line: string) {
  return line
    .replace(/\(CONT'D\)/gi, "")
    .replace(/\(CONT’D\)/gi, "")
    .replace(/\(O\.C\.\)/gi, "")
    .replace(/\(V\.O\.\)/gi, "")
    .trim()
    .toUpperCase();
}

function extractRoles(text: string) {
  const ignore = new Set([
    "INT", "EXT", "SCENE", "CUT", "TO", "FADE", "IN", "OUT",
    "DISSOLVE", "BEAT", "DAY", "NIGHT", "EVENING", "MORNING",
    "DUSK", "DAWN", "SCREAMS", "MOVE", "LET", "GO",
  ]);

  const roles = new Set<string>();
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  for (let i = 0; i < lines.length; i++) {
    const line = cleanRole(lines[i]);
    const nextLine = lines[i + 1] || "";

    if (
      /^[A-Z][A-Z '’.-]{1,35}$/.test(line) &&
      !ignore.has(line) &&
      !line.startsWith("INT.") &&
      !line.startsWith("EXT.") &&
      !line.match(/^SCENE\s+\d+/i) &&
      nextLine.length > 0
    ) {
      roles.add(line);
    }

    const colon = line.match(/^([A-Z][A-Z0-9 '’.-]{1,35}):/);
    if (colon && !ignore.has(colon[1])) {
      roles.add(colon[1]);
    }
  }

  return Array.from(roles).sort();
}

function parseCues(text: string, roles: string[]) {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const cues: Cue[] = [];

  let currentRole = "";
  let buffer: string[] = [];

  function saveCue() {
    if (currentRole && buffer.length) {
      cues.push({
        role: currentRole,
        text: buffer.join(" "),
      });
    }
  }

  for (const raw of lines) {
    const cleaned = cleanRole(raw);

    if (roles.includes(cleaned)) {
      saveCue();
      currentRole = cleaned;
      buffer = [];
      continue;
    }

    const colon = raw.match(/^([A-Za-z][A-Za-z0-9 '’.-]{1,35}):\s*(.*)$/);
    if (colon) {
      saveCue();
      currentRole = colon[1].toUpperCase();
      buffer = [colon[2]];
      continue;
    }

    if (currentRole) buffer.push(raw);
  }

  saveCue();
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
  const [status, setStatus] = useState("");

  const [index, setIndex] = useState(0);
  const [grayBackground, setGrayBackground] = useState(false);
  const [recording, setRecording] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");

  const [actorName, setActorName] = useState("");
  const [roleName, setRoleName] = useState("");
  const [agency, setAgency] = useState("");

  const cues = parseCues(script, roles);

  async function loadScriptFile(file: File) {
    setStatus("Loading script...");

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/extract-script", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();

    if (!res.ok) {
      setStatus(data.error || "Script failed to load.");
      return;
    }

    const text = data.text || "";
    const foundRoles = extractRoles(text);

    setScript(text);
    setRoles(foundRoles);
    setMyRole(foundRoles[0] || "");
    setVoiceRole(foundRoles[1] || foundRoles[0] || "");
    setExtraRole1("");
    setExtraRole2("");
    setIndex(0);
    setStatus("Script loaded.");
  }

  async function analyzeScript() {
    setAnalysis("Analyzing script...");

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
    setAnalysis(data.analysis || data.error || "No analysis returned.");
  }

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

  function drawCanvas() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = grayBackground ? "#9ca3af" : "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (video.videoWidth && video.videoHeight) {
      const scale = Math.min(
        canvas.width / video.videoWidth,
        canvas.height / video.videoHeight
      );

      const w = video.videoWidth * scale;
      const h = video.videoHeight * scale;
      const x = (canvas.width - w) / 2;
      const y = (canvas.height - h) / 2;

      ctx.drawImage(video, x, y, w, h);
    }

    animationRef.current = requestAnimationFrame(drawCanvas);
  }

  async function startVideo() {
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

    drawCanvas();

    const canvasStream = canvas.captureStream(30);
    const finalStream = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...stream.getAudioTracks(),
    ]);

    const chunks: BlobPart[] = [];
    const recorder = new MediaRecorder(finalStream);

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: "video/webm" });
      setVideoUrl(URL.createObjectURL(blob));
      stream.getTracks().forEach((t) => t.stop());

      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };

    recorderRef.current = recorder;
    recorder.start();

    setTimeout(() => readIfVoice(0), 700);
  }

  function stopVideo() {
    setRecording(false);

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    recorderRef.current?.stop();
  }

  return (
    <main
      style={{
        background: "#000",
        color: "#fff",
        minHeight: "100vh",
        padding: 24,
        fontFamily: "Georgia, serif",
      }}
    >
      <h1>🎬 FinalTake AI</h1>

      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
        {/* SECTION 1 */}
        <section
          style={{
            flex: "1 1 420px",
            background: "#111827",
            padding: 24,
            borderRadius: 24,
          }}
        >
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <div
              style={{
                width: 86,
                height: 86,
                borderRadius: "50%",
                background: "#f97316",
                margin: "0 auto",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 38,
              }}
            >
              📄
            </div>
            <h2>Analyze Script</h2>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.docx"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) loadScriptFile(file);
              e.target.value = "";
            }}
          />

          <button onClick={() => fileInputRef.current?.click()}>
            Load Script
          </button>

          {status && <p>{status}</p>}

          <textarea
            value={script}
            onChange={(e) => {
              const text = e.target.value;
              const foundRoles = extractRoles(text);

              setScript(text);
              setRoles(foundRoles);
              setMyRole(foundRoles[0] || "");
              setVoiceRole(foundRoles[1] || foundRoles[0] || "");
              setIndex(0);
            }}
            placeholder="Upload or paste your script here..."
            style={{
              width: "100%",
              height: 220,
              marginTop: 12,
              padding: 10,
              color: "#000",
            }}
          />

          <h3>Detected roles</h3>

          <label>Your role: </label>
          <select value={myRole} onChange={(e) => setMyRole(e.target.value)}>
            {roles.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>

          <br /><br />

          <label>Voice reads: </label>
          <select value={voiceRole} onChange={(e) => setVoiceRole(e.target.value)}>
            {roles.filter((r) => r !== myRole).map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>

          <br /><br />

          <label>Extra role 1: </label>
          <select value={extraRole1} onChange={(e) => setExtraRole1(e.target.value)}>
            <option value="">None</option>
            {roles.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>

          <br /><br />

          <label>Extra role 2: </label>
          <select value={extraRole2} onChange={(e) => setExtraRole2(e.target.value)}>
            <option value="">None</option>
            {roles.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>

          <br /><br />

          <button onClick={analyzeScript}>Analyze Script with AI</button>

          <h3>AI Analysis</h3>

          <textarea
            value={analysis}
            onChange={(e) => setAnalysis(e.target.value)}
            placeholder="AI analysis will appear here..."
            style={{
              width: "100%",
              height: 240,
              padding: 10,
              color: "#000",
              background: "#f3f4f6",
            }}
          />
        </section>

        {/* SECTION 2 */}
        <section
          style={{
            flex: "1 1 420px",
            background: "#111827",
            padding: 24,
            borderRadius: 24,
          }}
        >
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <div
              style={{
                width: 86,
                height: 86,
                borderRadius: "50%",
                background: "#ef4444",
                margin: "0 auto",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 38,
              }}
            >
              🎥
            </div>
            <h2>Create Video</h2>
          </div>

          <div
            style={{
              height: 260,
              overflowY: "auto",
              background: "#000",
              padding: 12,
              borderRadius: 12,
            }}
          >
            {cues.map((cue, i) => (
              <div
                key={i}
                style={{
                  padding: 12,
                  marginBottom: 10,
                  borderRadius: 8,
                  background:
                    i === index
                      ? cue.role === myRole
                        ? "#166534"
                        : "#1d4ed8"
                      : "#333",
                  border: i === index ? "3px solid white" : "none",
                }}
              >
                <strong>{cue.role}</strong>
                <p>{cue.text}</p>
              </div>
            ))}
          </div>

          <br />

          <button onClick={previousLine}>Previous line</button>
          <button onClick={pauseVoice} style={{ marginLeft: 10 }}>Pause</button>
          <button onClick={nextLine} style={{ marginLeft: 10 }}>Next line</button>

          <h3>Recording details</h3>

          <input
            placeholder="Your Name"
            value={actorName}
            onChange={(e) => setActorName(e.target.value)}
          />

          <input
            placeholder="Role Name"
            value={roleName}
            onChange={(e) => setRoleName(e.target.value)}
            style={{ marginLeft: 10 }}
          />

          <input
            placeholder="Agency"
            value={agency}
            onChange={(e) => setAgency(e.target.value)}
            style={{ marginLeft: 10 }}
          />

          <br /><br />

          <label>
            <input
              type="checkbox"
              checked={grayBackground}
              onChange={(e) => setGrayBackground(e.target.checked)}
            />{" "}
            Add gray background to video
          </label>

          <br /><br />

          <video ref={videoRef} autoPlay muted playsInline style={{ display: "none" }} />

          <canvas
            ref={canvasRef}
            style={{
              width: 360,
              maxWidth: "100%",
              background: grayBackground ? "#9ca3af" : "#000",
              borderRadius: 12,
            }}
          />

          <br /><br />

          {!recording ? (
            <button onClick={startVideo}>Start Video</button>
          ) : (
            <button onClick={stopVideo}>Stop Video</button>
          )}

          {videoUrl && (
            <p>
              <a
                href={videoUrl}
                download={`${(actorName || "actor").replace(/\s+/g, "_")}_${(
                  roleName || myRole || "role"
                ).replace(/\s+/g, "_")}_${(agency || "agency").replace(
                  /\s+/g,
                  "_"
                )}.webm`}
                style={{ color: "#fff" }}
              >
                Download Video
              </a>
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
