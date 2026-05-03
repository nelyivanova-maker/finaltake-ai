"use client";

import { useState } from "react";

export default function Page() {
  const [file, setFile] = useState<File | null>(null);

  async function handleUpload() {
    if (!file) {
      alert("Please choose a file first.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/extract-script", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      alert("Upload failed.");
      return;
    }

    const data = await response.json();
    console.log(data);
    alert("File uploaded successfully.");
  }

  return (
    <main>
      {/* keep your previous page content here */}

      <section style={{ marginTop: "40px" }}>
        <h2>Upload your script</h2>
        <p>Upload a PDF or Word document.</p>

        <input
          type="file"
          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />

        <br />
        <br />

        <button onClick={handleUpload}>
          Upload Script
        </button>

        {file && (
          <p>
            Selected file: <strong>{file.name}</strong>
          </p>
        )}
      </section>
    </main>
  );
}
