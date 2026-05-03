export default function Page() {
  return (
    <main style={{ padding: "40px" }}>
      <h1>Finaltake AI</h1>

      <p>Create scripts from prompts.</p>

      <input
        type="text"
        placeholder="Enter your idea..."
        style={{ padding: "10px", width: "300px" }}
      />

      <br /><br />

      <button style={{ padding: "10px 20px" }}>
        Generate Script
      </button>
    </main>
  );
}
