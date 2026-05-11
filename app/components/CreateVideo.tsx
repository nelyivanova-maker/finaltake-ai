"use client";

import { useRef, useState } from "react";

type CreateVideoProps = {
  script: string;
  roles: string[];
  myRole: string;
  voiceRole: string;
};

export default function CreateVideo({
  script,
  roles,
  myRole,
  voiceRole,
}: CreateVideoProps) {
  const [recording, setRecording] = useState(false);
  const [status, setStatus] = useState("Ready.");
  const videoRef = useRef<HTMLVideoElement | null>(null);

  async function startVideo() {
    setStatus("Starting video...");
    setRecording(true);

    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });

    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
    }

    setStatus("Recording started.");
  }

  function stopVideo() {
    setRecording(false);
    setStatus("Video stopped.");
  }

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

      <p>Script loaded: <strong>{script ? "Yes" : "No"}</strong></p>
      <p>Your role: <strong>{myRole || "None"}</strong></p>
      <p>Voice reads: <strong>{voiceRole || "None"}</strong></p>

      <h3>Controls</h3>

      <button>Previous Line</button>
      <button style={{ marginLeft: 10 }}>Next Line</button>
      <button style={{ marginLeft: 10 }}>Pause Voice</button>
      <button style={{ marginLeft: 10 }}>Resume Voice</button>

      <h3>Recording details</h3>

      <input placeholder="Your Name" />
      <input placeholder="Role Name" style={{ marginLeft: 10 }} />
      <input placeholder="Agency" style={{ marginLeft: 10 }} />

      <br /><br />

      <label>
        <input type="checkbox" /> Gray background behind video frame
      </label>

      <br /><br />

      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        style={{
          width: "100%",
          maxWidth: 520,
          aspectRatio: "16 / 9",
          background: "#000",
          borderRadius: 12,
        }}
      />

      <br /><br />

      {!recording ? (
        <button onClick={startVideo}>Start Video</button>
      ) : (
        <button onClick={stopVideo}>Stop Video</button>
      )}

      <p><strong>Status:</strong> {status}</p>
    </section>
  );
}
