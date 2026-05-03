<input
  type="file"
  accept=".txt,.pdf,.docx"
  onChange={async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/extract-script", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (data.text) {
      setScript(data.text);
      setLineIndex(0);

      if (data.roles && data.roles.length > 0) {
        setMyRole(data.roles[0]);
      }

      alert(
        data.roles?.length
          ? `Roles found: ${data.roles.join(", ")}`
          : "File loaded, but no roles were detected."
      );
    } else {
      alert(data.error || "Could not read this file.");
    }
  }}
/>
