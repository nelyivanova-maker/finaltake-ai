"use client";

import { useState } from "react";
import AnalyzeScript from "./components/AnalyzeScript";
import CreateVideo from "./components/CreateVideo";

export default function Page() {
  const [script, setScript] = useState("");
  const [roles, setRoles] = useState<string[]>([]);
  const [myRole, setMyRole] = useState("");
  const [voiceRole, setVoiceRole] = useState("");

  return (
    <main
      style={{
        background: "#064e3b",
        minHeight: "100vh",
        padding: "16px",
        boxSizing: "border-box",
      }}
    >
      <h1
        style={{
          color: "#fff",
          fontSize: "clamp(28px, 6vw, 44px)",
          textAlign: "center",
          marginBottom: 20,
        }}
      >
        🎬 FinalTake AI
      </h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 20,
          maxWidth: 1200,
          margin: "0 auto",
        }}
      >
        <AnalyzeScript
          script={script}
          setScript={setScript}
          roles={roles}
          setRoles={setRoles}
          myRole={myRole}
          setMyRole={setMyRole}
          voiceRole={voiceRole}
          setVoiceRole={setVoiceRole}
        />

        <CreateVideo
          script={script}
          roles={roles}
          myRole={myRole}
          voiceRole={voiceRole}
        />
      </div>
    </main>
  );
}
