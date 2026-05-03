"use client";

import { useRef, useState } from "react";

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

  return Array.from(roles);
}

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
  const [index, setIndex] = useState(0);

  const [recording, setRecording] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [grayBackground, setGrayBackground] = useState(false);

  const [actorName, setActorName] = useState("");
  const [roleName, setRoleName] = useState("");
  const [agency, setAgency] = useState("");

  const cues = parseCues(script, roles);

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

  function readIfVoice(lineIndex: number) {
    const cue = cues[lineIndex];
    if (cue?.role === voiceRole) {
      read(cue.text);
    }
  }

  function nextLine() {
    const nextIndex = Math.min(index + 1, cues.length - 1);
    setIndex(nextIndex);

    setTimeout(() => {
      readIfVoice(nextIndex);
    }, 200);
  }

  function previousLine() {
    const previousIndex = Math.max(index - 1, 0);
    setIndex(previousIndex);

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    setTimeout(() => {
      readIfVoice(previousIndex);
    }, 200);
  }

  function pauseVoice() {
    audioRef.current?.pause();
  }

  function drawVideoToCanvas() {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const canvasW = canvas.width;
    const canvasH = canvas.height;

    ctx.fillStyle = grayBackground ? "#9ca3af" : "#000000";
    ctx.fillRect(0, 0, canvasW, canvasH);

    if (video.videoWidth && video.videoHeight) {
      const scale = Math.min(
        canvasW / video.videoWidth,
        canvasH / video.videoHeight
      );

      const drawW = video.videoWidth * scale;
      const drawH = video.videoHeight * scale;
      const x = (canvasW - drawW) / 2;
      const y = (canvasH - drawH) / 2;

      ctx.drawImage(video, x, y, drawW, drawH);
    }

    animationRef.current = requestAnimationFrame(drawVideoToCanvas);
  }

  async function startRecording() {
    setRecording(true);
    setVideoUrl("");
    setIndex(0);

    const cameraStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });

    if (videoRef.current) {
      videoRef.current.srcObject = cameraStream;
      await videoRef.current.play();
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = 1280;
    canvas.height = 720;

    drawVideoToCanvas();

    const canvasStream = canvas.captureStream(30);
    const audioTracks = cameraStream.getAudioTracks();

    const finalStream = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...audioTracks,
    ]);

    const chunks: BlobPart[] = [];
    const recorder = new MediaRecorder(finalStream);

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: "video/webm" });
      setVideoUrl(URL.createObjectURL(blob));

      cameraStream.getTracks().forEach((t) => t.stop());

      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };

    recorderRef.current = recorder;
    recorder.start();

    setTimeout(() => {
      readIfVoice(0);
    }, 500);
  }

  function stopRecording() {
    setRecording(false);

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

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
          const found = extractRoles(text);

          setScript(text);
          setRoles(found);
          setMyRole(found[0] || "");
          setVoiceRole(found[1] || found[0] || "");
          setIndex(0);
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
          setMyRole(found[0] || "");
          setVoiceRole(found[1] || found[0] || "");
          setIndex(0);
        }}
        style={{ width: "100%", height: 200, marginTop: 10 }}
      />

      <h2>2. Choose roles</h2>

      <div>
        <label>Your role: </label>
        <select value={myRole} onChange={(e) => setMyRole(e.target.value)}>
          {roles.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginTop: 10 }}>
        <label>Voice reads: </label>
        <select value={voiceRole} onChange={(e) => setVoiceRole(e.target.value)}>
          {roles
            .filter((r) => r !== myRole)
            .map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
        </select>
      </div>

      <h2>3. Reading</h2>

      <div style={{ height: 300, overflowY: "auto", background: "#111", padding: 10 }}>
        {cues.map((cue, i) => (
          <div
            key={i}
            style={{
              marginBottom: 10,
              padding: 10,
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

      <h2>4. Controls</h2>

      <button onClick={previousLine}>Previous line</button>

      <button onClick={pauseVoice} style={{ marginLeft: 10 }}>
        Pause
      </button>

      <button onClick={nextLine} style={{ marginLeft: 10 }}>
        Next line
      </button>

      <h2>Recording details</h2>

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

      <h2>5. Record</h2>

      <label>
        <input
          type="checkbox"
          checked={grayBackground}
          onChange={(e) => setGrayBackground(e.target.checked)}
        />{" "}
        Add gray background to video
      </label>

      <div style={{ marginTop: 10 }}>
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          style={{
            width: 320,
            background: grayBackground ? "#9ca3af" : "#000",
          }}
        />
      </div>

      <canvas ref={canvasRef} style={{ display: "none" }} />

      <br />

      {!recording ? (
        <button onClick={startRecording}>Start Video</button>
      ) : (
        <button onClick={stopRecording}>Stop Video</button>
      )}

      {videoUrl && (
        <p>
          <a
            href={videoUrl}
            download={`${(actorName || "actor").replace(/\s+/g, "_")}_${(
              roleName || myRole
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
    </main>
  );
}
