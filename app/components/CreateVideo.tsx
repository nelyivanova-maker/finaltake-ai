"use client";

import { useEffect, useRef, useState } from "react";

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
  const recorderRef = useRef<MediaRecorder | null>(null);
  const cueRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [index, setIndex] = useState(0);
  const [recording, setRecording] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [grayBackground, setGrayBackground] = useState(false);
  const [status, setStatus] = useState("");

  const cues = parseCues(script, roles);

  useEffect(() => {
    cueRefs.current[index]?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [index]);

  /* ---------- VOICE (WORKING ON PHONE) ---------- */
  function speak(text: string, lineIndex: number) {
    window.speechSynthesis.cancel();

    const utter = new SpeechSynthesisUtterance(text);

    utter.rate = 0.95;
    utter.pitch = 1;
    utter.volume = 1;

    utter.onend = () => {
      const next = lineIndex + 1;

      if (next < cues.length) {
        setIndex(next);

        const nextCue = cues[next];

        if (nextCue.role === voiceRole) {
          setTimeout(() => speak(nextCue.text, next), 400);
        } else {
          setStatus("Your turn");
        }
      }
    };

    window.speechSynthesis.speak(utter);
  }

  function nextLine() {
    const next = Math.min(index + 1, cues.length - 1);
    setIndex(next);

    const cue = cues[next];

    if (cue?.role === voiceRole) {
      setTimeout(() => speak(cue.text, next), 300);
    } else {
      setStatus("Your turn");
    }
  }

  function previousLine() {
    const prev = Math.max(index - 1, 0);
    setIndex(prev);
    window.speechSynthesis.cancel();
  }

  function pauseVoice() {
    window.speechSynthesis.pause();
  }

  function resumeVoice() {
    window.speechSynthesis.resume();
  }

  /* ---------- VIDEO ---------- */
  async function startVideo() {
    setRecording(true);
    setVideoUrl("");
    setIndex(0);

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 1920, height: 1080, facingMode: "user" },
      audio: true,
    });

    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
    }

    const canvas = canvasRef.current!;
    canvas.width = 1920;
    canvas.height = 1080;

    const ctx = canvas.getContext("2d")!;

    function draw() {
      ctx.fillStyle = grayBackground ? "#9ca3af" : "#000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.drawImage(videoRef.current!, 0, 0, canvas.width, canvas.height);

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

    recorder.ondataavailable = (e) => chunks.push(e.data);

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: "video/webm" });
      setVideoUrl(URL.createObjectURL(blob));
      stream.getTracks().forEach((t) => t.stop());
    };

    recorderRef.current = recorder;
    recorder.start();

    setTimeout(() => {
      const first = cues[0];

      if (first?.role === voiceRole) {
        speak(first.text, 0);
      } else {
        setStatus("Your turn");
      }
    }, 700);
  }

  function stopVideo() {
    setRecording(false);
    window.speechSynthesis.cancel();
    recorderRef.current?.stop();
  }

  return (
    <section style={{ flex: 1, background: "#111827", padding: 24, borderRadius: 24, color: "#fff" }}>
      <h2>🎥 Create Video</h2>

      <div style={{ height: 300, overflowY: "auto", background: "#000", padding: 10 }}>
        {cues.map((cue, i) => (
          <div
            key={i}
            ref={(el) => (cueRefs.current[i] = el)}
            style={{
              padding: 10,
              marginBottom: 6,
              background:
                i === index
                  ? cue.role === myRole
                    ? "green"
                    : "blue"
                  : "#333",
              opacity: i === index ? 1 : 0.5,
            }}
          >
            <b>{cue.role}</b>
            <p>{cue.text}</p>
          </div>
        ))}
      </div>

      <p>Status: {status}</p>

      <button onClick={previousLine}>Previous</button>
      <button onClick={pauseVoice} style={{ marginLeft: 10 }}>Pause</button>
      <button onClick={resumeVoice} style={{ marginLeft: 10 }}>Resume</button>
      <button onClick={nextLine} style={{ marginLeft: 10 }}>Next</button>

      <br /><br />

      <label>
        <input
          type="checkbox"
          checked={grayBackground}
          onChange={(e) => setGrayBackground(e.target.checked)}
        />
        Gray background (frame)
      </label>

      <br /><br />

      <video ref={videoRef} autoPlay muted style={{ display: "none" }} />
      <canvas ref={canvasRef} style={{ width: "100%", aspectRatio: "16/9" }} />

      <br />

      {!recording ? (
        <button onClick={startVideo}>Start Video</button>
      ) : (
        <button onClick={stopVideo}>Stop Video</button>
      )}

      {videoUrl && (
        <p>
          <a href={videoUrl} download="video.webm" style={{ color: "#fff" }}>
            Download Video
          </a>
        </p>
      )}
    </section>
  );
}
