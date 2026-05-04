"use client";

import { useRef, useState } from "react";

type Cue = {
  role: string;
  text: string;
};

type CreateVideoProps = {
  script: string;
  roles: string[];
  myRole: string;
  voiceRole: string;
};

function cleanRole(line: string) {
  return line
    .replace(/\(CONT'D\)/gi, "")
    .replace(/\(CONT’D\)/gi, "")
    .replace(/\(O\.C\.\)/gi, "")
    .replace(/\(V\.O\.\)/gi, "")
    .replace(/:$/, "")
    .trim()
    .toUpperCase();
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

  for (const raw of lines) {
    const cleaned = cleanRole(raw);

    if (roles.includes(cleaned)) {
      save();
      role = cleaned;
      buffer = [];
      continue;
    }

    const colon = raw.match(/^([A-Za-z][A-Za-z0-9 '’.-]{1,35}):\s*(.*)$/);
    if (colon) {
      save();
      role = colon[1].toUpperCase();
      buffer = [colon[2]];
      continue;
    }

    if (role) buffer.push(raw);
  }

  save();
  return cues;
}

export default function CreateVideo({
  script,
  roles,
  myRole,
  voiceRole,
}: CreateVideoProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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

    const ctx = canvas.getContext("2d")!;

    function draw() {
      ctx.fillStyle = grayBackground ? "#9ca3af" : "#000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (videoRef.current?.videoWidth) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      }

      requestAnimationFrame(draw);
    }

    draw();

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
    };

    recorderRef.current = recorder;
    recorder.start();

    setTimeout(() => readIfVoice(0), 700);
  }

  function stopVideo() {
    setRecording(false);
    recorderRef.current?.stop();
  }

  return (
    <section style={{ flex: "1 1 420px", background: "#111827", padding: 24, borderRadius: 24, color: "#fff" }}>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <div style={{ width: 86, height: 86, borderRadius: "50%", background: "#ef4444", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 38 }}>
          🎥
        </div>
        <h2>Create Video</h2>
      </div>

      <div style={{ height: 260, overflowY: "auto", background: "#000", padding: 12, borderRadius: 12 }}>
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

      <input placeholder="Your Name" value={actorName} onChange={(e) => setActorName(e.target.value)} />
      <input placeholder="Role Name" value={roleName} onChange={(e) => setRoleName(e.target.value)} style={{ marginLeft: 10 }} />
      <input placeholder="Agency" value={agency} onChange={(e) => setAgency(e.target.value)} style={{ marginLeft: 10 }} />

      <br /><br />

      <label>
        <input type="checkbox" checked={grayBackground} onChange={(e) => setGrayBackground(e.target.checked)} /> Add gray background
      </label>

      <br /><br />

      <video ref={videoRef} autoPlay muted style={{ display: "none" }} />
      <canvas ref={canvasRef} style={{ width: 360, borderRadius: 12 }} />

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
            download={`${actorName}_${roleName}_${agency}.webm`}
            style={{ color: "#fff" }}
          >
            Download Video
          </a>
        </p>
      )}
    </section>
  );
}
