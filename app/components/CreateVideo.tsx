"use client";

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

      <p>
        Script loaded: <strong>{script ? "Yes" : "No"}</strong>
      </p>

      <p>
        Your role: <strong>{myRole || "None"}</strong>
      </p>

      <p>
        Voice reads: <strong>{voiceRole || "None"}</strong>
      </p>

      <p>
        Roles: <strong>{roles.length ? roles.join(", ") : "None"}</strong>
      </p>

      <div
        style={{
          height: 260,
          background: "#000",
          borderRadius: 12,
          padding: 12,
          marginTop: 16,
        }}
      >
        <p>Video section restored.</p>
      </div>
    </section>
  );
}
