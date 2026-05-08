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
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);
  const cueRefs = useRef<(HTMLDivElement | null)[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [index, setIndex] = useState(0);
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [status, setStatus] = useState("Ready.");
  const [grayBackground, setGrayBackground] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<"user" | "environment">(
    "user"
  );

  const [actorName, setActorName] = useState("");
  const [roleName, setRoleName] = useState("");
  const [agency, setAgency] = useState("");

  const cues = parseCues(script, roles);

  useEffect(() => {
    setIndex(0);
    setStatus("Ready.");
  }, [script, myRole, voiceRole]);

  useEffect(() => {
    cueRefs.current[index]?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [index]);

  async function speakWithOpenAI(text: string, lineIndex: number) {
    try {
      setStatus("AI voice loading...");

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

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "TTS failed");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);

      audioRef.current = audio;

      audio.onended = () => {
        afterVoiceEnds(lineIndex);
      };

      audio.onerror = () => {
        setStatus("AI voice playback failed. Using browser voice.");
        speakWithBrowser(text, lineIndex);
      };

      setStatus("AI voice reading...");
      await audio.play();
    } catch (error: any) {
      setStatus("AI voice failed. Using browser voice.");
      speakWithBrowser(text, lineIndex);
    }
  }

  function speakWithBrowser(text: string, lineIndex: number) {
    window.speechSynthesis.cancel();

    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 0.9;
    utter.pitch = 1;
    utter.volume = 1;

    utter.onend = () => {
      afterVoiceEnds(lineIndex);
    };

    setStatus("Browser voice reading...");
    window.speechSynthesis.speak(utter);
  }

  function afterVoiceEnds(lineIndex: number) {
    const next = lineIndex + 1;

    if (next >= cues.length) {
      setStatus("End of script.");
      return;
    }

    setIndex(next);

    const nextCue = cues[next];

    if (nextCue.role === voiceRole) {
      setTimeout(() => {
        speakWithOpenAI(nextCue.text, next);
      }, 500);
    } else {
      setStatus(`Your turn: ${nextCue.role}`);
    }
  }

  function playLineIfVoice(lineIndex: number) {
    const cue = cues[lineIndex];

    if (!cue) {
      setStatus("No line found.");
      return;
    }

    if (cue.role === voiceRole) {
      speakWithOpenAI(cue.text, lineIndex);
    } else {
      setStatus(`Your turn: ${cue.role}`);
    }
  }

  function nextLine() {
    const next = Math.min(index + 1, cues.length - 1);
    setIndex(next);

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    window.speechSynthesis.cancel();

    setTimeout(() => {
      playLineIfVoice(next);
    }, 250);
  }

  function previousLine() {
    const prev = Math.max(index - 1, 0);
    setIndex(prev);

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    window.speechSynthesis.cancel();
    setStatus("Moved to previous line.");
  }

  function pauseVoice() {
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
    }

    window.speechSynthesis.pause();
    setStatus("Voice paused.");
  }

  function resumeVoice() {
    if (audioRef.current && audioRef.current.paused) {
      audioRef.current.play();
    }

    window.speechSynthesis.resume();
    setStatus("Voice resumed.");
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

  async function startCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());

    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: cameraFacing,
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
      audio: true,
    });

    streamRef.current = stream;

    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
    }

    const canvas = canvasRef.current;

    if (canvas) {
      canvas.width = 1920;
      canvas.height = 1080;
    }

    drawCanvas();

    return stream;
  }

  function switchCamera() {
    if (recording) {
      setStatus("Stop video before switching camera.");
      return;
    }

    const nextCamera = cameraFacing === "user" ? "environment" : "user";
    setCameraFacing(nextCamera);

    setStatus(
      nextCamera === "user"
        ? "Front camera selected."
        : "Back camera selected."
    );
  }

  async function startVideo() {
    if (cues.length === 0) {
      setStatus("Load a script first.");
      return;
    }

    setRecording(true);
    setPaused(false);
    setVideoUrl("");
    setIndex(0);
    setStatus("Starting video...");

    try {
      const stream = await startCamera();

      const canvas = canvasRef.current!;
      const canvasStream = canvas.captureStream(30);

      const finalStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...stream.getAudioTracks(),
      ]);

      const chunks: BlobPart[] = [];

      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : "video/webm";

      const recorder = new MediaRecorder(finalStream, { mimeType });

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "video/webm" });
        setVideoUrl(URL.createObjectURL(blob));

        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;

        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };

      recorderRef.current = recorder;
      recorder.start();

      setTimeout(() => {
        playLineIfVoice(0);
      }, 900);
    } catch (error: any) {
      setRecording(false);
      setStatus(error?.message || "Could not start camera.");
    }
  }

  function pauseVideo() {
    if (!recorderRef.current || recorderRef.current.state !== "recording") {
      return;
    }

    recorderRef.current.pause();
    setPaused(true);
    pauseVoice();
    setStatus("Video paused.");
  }

  function resumeVideo() {
    if (!recorderRef.current || recorderRef.current.state !== "paused") {
      return;
    }

    recorderRef.current.resume();
    setPaused(false);
    resumeVoice();
    setStatus("Video resumed.");
  }

  function stopVideo() {
    setRecording(false);
    setPaused(false);

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    window.speechSynthesis.cancel();

    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }

    setStatus("Video stopped.");
  }

  const filename = `${(actorName || "actor").replace(/\s+/g, "_")}_${(
    roleName || myRole || "role"
  ).replace(/\s+/g, "_")}_${(agency || "agency").replace(/\s+/g, "_")}.webm`;

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

      <p>
        <strong>Status:</strong> {status}
      </p>

      <button onClick={previousLine}>Previous Line</button>

      <button onClick={nextLine} style={{ marginLeft: 10 }}>
        Next Line
      </button>

      <button onClick={pauseVoice} style={{ marginLeft: 10 }}>
        Pause Voice
      </button>

      <button onClick={resumeVoice} style={{ marginLeft: 10 }}>
        Resume Voice
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

      <button onClick={switchCamera}>
        Use {cameraFacing === "user" ? "Back" : "Front"} Camera
      </button>

      <p>Selected camera: {cameraFacing === "user" ? "Front" : "Back"}</p>

      <label>
        <input
          type="checkbox"
          checked={grayBackground}
          onChange={(e) => setGrayBackground(e.target.checked)}
        />{" "}
        Gray background behind video frame
      </label>

      <br />
      <br />

      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        style={{ display: "none" }}
      />

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
        <>
          {!paused ? (
            <button onClick={pauseVideo}>Pause Video</button>
          ) : (
            <button onClick={resumeVideo}>Resume Video</button>
          )}

          <button onClick={stopVideo} style={{ marginLeft: 10 }}>
            Stop Video
          </button>
        </>
      )}

      {videoUrl && (
        <p>
          <a href={videoUrl} download={filename} style={{ color: "#fff" }}>
            Download Video
          </a>
        </p>
      )}

      <p style={{ fontSize: 13, opacity: 0.8 }}>
        Video records in horizontal 16:9 WebM. MP4 export will need server
        conversion later.
      </p>
    </section>
  );
}
