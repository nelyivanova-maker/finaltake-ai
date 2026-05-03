<input
  type="file"
  accept=".txt,.pdf,.doc,.docx"
  onChange={async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/extract-script", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Could not read file");
      return;
    }

    setScript(data.text);
  }}
/>
