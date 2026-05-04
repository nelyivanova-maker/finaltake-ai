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
        padding: 24,
      }}
    >
      <h1 style={{ color: "#fff" }}>🎬 FinalTake AI</h1>

      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
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
