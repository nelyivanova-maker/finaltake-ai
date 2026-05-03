"use client";

import { useState } from "react";

export default function Page() {
  const [file, setFile] = useState<File | null>(null);

  const handleUpload = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/extract-script", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    console.log(data);
    alert("Uploaded! Check console.");
  };

  return (
    <main style={{ padding: "40px" }}>
      <h1>Upload Script</h1>

      <input
        type="file"
        accept=".pdf"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />

      <br /><br />

      <button onClick={handleUpload}>
        Upload PDF
      </button>
    </main>
  );
}
