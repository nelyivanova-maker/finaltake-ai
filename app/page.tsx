import AnalyzeScript from "./components/AnalyzeScript";
import CreateVideo from "./components/CreateVideo";

export default function Page() {
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
        <AnalyzeScript />
        <CreateVideo />
      </div>
    </main>
  );
}
