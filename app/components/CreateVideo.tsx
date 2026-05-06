"use client";

import { useEffect, useRef, useState } from "react";
import { SelfieSegmentation } from "@mediapipe/selfie_segmentation";

type Cue = {
  role: string;
  text: string;
};

type Props = {
  script: string;
  roles: string[];
  myRole: string;
  voiceRole: string;
};

function cleanRole(line: string) {
  return line.toUpperCase().replace(/:$/, "").trim();
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
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [index, setIndex] = useState(0);
  const [recording, setRecording] = useState(false);
  const [camera, setCamera] = useState<"user" | "environment">("user");
  const [status, setStatus] = useState("");

  const cues = parseCues(script, roles);

  /* ---------- VOICE ---------- */
  async function speak(text: string) {
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) throw new Error("TTS failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);

      audioRef.current = audio;

      audio.onended = () => nextLine();

      await audio.play();
    } catch {
      // fallback to browser voice
      const utter = new SpeechSynthesisUtterance(text);
      utter.onend = () => nextLine();
      speechSynthesis.speak(utter);
    }
  }

  function nextLine() {
    const next = Math.min(index + 1, cues.length - 1);
    setIndex(next);

    const cue = cues[next];
    if (cue?.role === voiceRole) {
      setTimeout(() => speak(cue.text), 400);
    } else {
      setStatus("Your turn");
    }
  }

  /* ---------- CAMERA ---------- */
  async function startCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: camera },
      audio: true,
    });

    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
    }
  }

  /* ---------- BACKGROUND REMOVAL ---------- */
  function startSegmentation() {
    const video = videoRef.current!;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    const segmenter = new SelfieSegmentation({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`,
    });

    segmenter.setOptions({ modelSelection: 1 });

    segmenter.onResults((results) => {
      canvas.width = 1280;
      canvas.height = 720;

      ctx.fillStyle = "#9ca3af"; // gray background
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.globalCompositeOperation = "destination-atop";
      ctx.drawImage(results.segmentationMask, 0, 0, canvas.width, canvas.height);

      ctx.globalCompositeOperation = "source-over";
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    });

    async function loop() {
      await segmenter.send({ image: video });
      requestAnimationFrame(loop);
    }

    loop();
  }

  /* ---------- START VIDEO ---------- */
  async function startVideo() {
    setRecording(true);
    setIndex(0);

    await startCamera();
    startSegmentation();

    setTimeout(() => {
      const first = cues[0];

      if (first?.role === voiceRole) {
        speak(first.text);
      } else {
        setStatus("Your turn");
      }
    }, 800);
  }

  /* ---------- UI ---------- */
  return (
    <section
      style={{
        flex: "1 1 420px",
        background: "#111827",
        padding: 24,
        borderRadius: 24,
        color: "#fff",
      }}
    >
      <h2>🎥 Create Video</h2>

      <button onClick={() => setCamera(camera === "user" ? "environment" : "user")}>
        Switch Camera
      </button>

      <div
        style={{
          height: 260,
          overflowY: "auto",
          background: "#000",
          marginTop: 10,
          padding: 10,
        }}
      >
        {cues.map((cue, i) => (
          <div
            key={i}
            style={{
              padding: 10,
              marginBottom: 6,
              background:
                i === index
                  ? cue.role === myRole
                    ? "green"
                    : "blue"
                  : "#333",
            }}
          >
            <b>{cue.role}</b>
            <p>{cue.text}</p>
          </div>
        ))}
      </div>

      <p>Status: {status}</p>

      <video ref={videoRef} style={{ display: "none" }} />
      <canvas ref={canvasRef} style={{ width: "100%", borderRadius: 12 }} />

      <br />

      {!recording ? (
        <button onClick={startVideo}>Start Video</button>
      ) : (
        <button onClick={nextLine}>Next Line</button>
      )}
    </section>
  );
}
