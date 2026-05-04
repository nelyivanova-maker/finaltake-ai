"use client";

import { useEffect, useRef, useState } from "react";

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
  const animationRef = useRef<number | null>(null);
  const cueRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [index, setIndex] = useState(0);
  const [recording, setRecording] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [videoType, setVideoType] = useState("video/webm");
  const [grayBackground, setGrayBackground] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState("");

  const [actorName, setActorName] = useState("");
  const [roleName, setRoleName] = useState("");
  const [agency, setAgency] = useState("");

  const cues = parseCues(script, roles);

  useEffect(() => {
    setIndex(0);
    setVoiceStatus("");
  }, [script, myRole, voiceRole]);

  useEffect(() => {
    cueRefs.current[index]?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [index]);

  async function readVoiceLine(lineIndex: number) {
    const cue = cues[lineIndex];

    if (!cue) {
      setVoiceStatus("No line found.");
      return;
    }

    if (cue.role !== voiceRole) {
      setVoiceStatus(`Waiting for you to read: ${cue.role}`);
      return;
    }

    try {
      setVoiceStatus(`AI reading: ${cue.role}`);

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }

      const res = await fetch("/api/tts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: cue.text }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        setVoiceStatus(`Voice error: ${errorText || "TTS failed"}`);
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);

      audioRef.current = audio;

      audio.onended = () => {
        const next = lineIndex + 1;

        if (next >= cues.length) {
          setVoiceStatus("End of script.");
          return;
        }

        setIndex(next);

        const nextCue = cues[next];

        if (nextCue.role === voiceRole) {
          setTimeout(() => readVoiceLine(next), 500);
        } else {
          setVoiceStatus(`Your turn: ${nextCue.role}`);
        }
      };

      audio.onerror = () => {
        setVoiceStatus("Voice playback failed.");
      };

      await audio.play();
    } catch (error: any) {
      setVoiceStatus(error?.message || "Voice failed.");
    }
  }

  function nextLine() {
    const next = Math.min(index + 1, cues.length - 1);
    setIndex(next);

    setTimeout(() => {
      const cue = cues[next];

      if (cue?.role === voiceRole) {
        readVoiceLine(next);
      } else if (cue) {
        setVoiceStatus(`Your turn: ${cue.role}`);
      }
    }, 250);
  }

  function previousLine() {
    const previous = Math.max(index - 1, 0);
    setIndex(previous);

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    const cue = cues[previous];
    setVoiceStatus(cue ? `Moved to: ${cue.role}` : "");
  }

  function pauseVoice() {
    audioRef.current?.pause();
    setVoiceStatus("Voice paused.");
  }

  function resumeVoice() {
    audioRef.current?.play();
    setVoiceStatus("Voice resumed.");
  }

  function stopVoice() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setVoiceStatus("Voice stopped.");
  }

  function drawCanvas() {
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

    animationRef.current = requestAnimationFrame(drawCanvas);
  }

  async function startVideo() {
    setRecording(true);
    setVideoUrl("");
    setIndex(0);
    setVoiceStatus("Starting video...");

    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        facingMode: "user",
      },
      audio: true,
    });

    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
    }

    const canvas = canvasRef.current!;
    canvas.width = 1920;
    canvas.height = 1080;

    drawCanvas();

    const canvasStream = canvas.captureStream(30);

    const finalStream = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...stream.getAudioTracks(),
    ]);

    let mimeType = "video/webm";

    if (MediaRecorder.isTypeSupported("video/mp4")) {
      mimeType = "video/mp4";
    } else if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9")) {
      mimeType = "video/webm;codecs=vp9";
    }

    setVideoType(mimeType);

    const chunks: BlobPart[] = [];
    const recorder = new MediaRecorder(finalStream, { mimeType });

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType });
      setVideoUrl(URL.createObjectURL(blob));

      stream.getTracks().forEach((t) => t.stop());

      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };

    recorderRef.current = recorder;
    recorder.start();

    setTimeout(() => {
      const firstCue = cues[0];

      if (!firstCue) {
        setVoiceStatus("No dialogue found.");
        return;
      }

      if (firstCue.role === voiceRole) {
        readVoiceLine(0);
      } else {
        setVoiceStatus(`Your turn: ${firstCue.role}`);
      }
    }, 700);
  }

  function stopVideo() {
    setRecording(false);
    stopVoice();
    recorderRef.current?.stop();
  }

  const extension = videoType.includes("mp4") ? "mp4" : "webm";

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
          height: 300,
          overflowY: "auto",
          background: "#000",
          padding: 12,
          borderRadius: 12,
        }}
      >
        {cues.length === 0 && <p>No dialogue loaded yet.</p>}

        {cues.map((cue, i) => {
          const isCurrent = i === index;
          const isMine = cue.role === myRole;
          const isVoice = cue.role === voiceRole;

          return (
            <div
              key={i}
              ref={(el) => {
                cueRefs.current[i] = el;
              }}
              style={{
                padding: isCurrent ? 18 : 12,
                marginBottom: 10,
                borderRadius: 8,
                background: isCurrent
                  ? isMine
                    ? "#166534"
                    : isVoice
                    ? "#1d4ed8"
                    : "#374151"
                  : "#333",
                border: isCurrent ? "3px solid white" : "none",
                opacity: isCurrent ? 1 : 0.5,
              }}
            >
              <strong>{cue.role}</strong>
              <p style={{ fontSize: isCurrent ? 24 : 16 }}>{cue.text}</p>
            </div>
          );
        })}
      </div>

      <p style={{ minHeight: 24 }}>
        <strong>Status:</strong> {voiceStatus || "Ready."}
      </p>

      <button onClick={previousLine}>Previous line</button>

      <button onClick={pauseVoice} style={{ marginLeft: 10 }}>
        Pause
      </button>

      <button onClick={resumeVoice} style={{ marginLeft: 10 }}>
        Resume
      </button>

      <button onClick={nextLine} style={{ marginLeft: 10 }}>
        Next line
      </button>

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

      <br />
      <br />

      <label>
        <input
          type="checkbox"
          checked={grayBackground}
          onChange={(e) => setGrayBackground(e.target.checked)}
        />{" "}
        Add gray background behind horizontal video
      </label>

      <br />
      <br />

      <video ref={videoRef} autoPlay muted playsInline style={{ display: "none" }} />

      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          maxWidth: 520,
          aspectRatio: "16 / 9",
          background: grayBackground ? "#9ca3af" : "#000",
          borderRadius: 12,
        }}
      />

      <br />
      <br />

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
            )}.${extension}`}
            style={{ color: "#fff" }}
          >
            Download Video ({extension.toUpperCase()})
          </a>
        </p>
      )}

      <p style={{ fontSize: 13, opacity: 0.8 }}>
        The gray option adds gray behind the camera image. Replacing your room background needs person-background removal.
      </p>
    </section>
  );
}
