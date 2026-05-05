"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function InstallAppButton() {
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase();

    setIsIOS(/iphone|ipad|ipod/.test(userAgent));
    setIsStandalone(window.matchMedia("(display-mode: standalone)").matches);

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  async function handleInstall() {
    if (!installPrompt) return;

    await installPrompt.prompt();
    await installPrompt.userChoice;

    setInstallPrompt(null);
  }

  if (isStandalone) return null;

  if (isIOS) {
    return (
      <div
        style={{
          background: "#111827",
          color: "#fff",
          padding: 12,
          borderRadius: 12,
          marginBottom: 16,
          textAlign: "center",
        }}
      >
        To install on iPhone: tap <strong>Share</strong> →{" "}
        <strong>Add to Home Screen</strong>
      </div>
    );
  }

  if (!installPrompt) return null;

  return (
    <div style={{ textAlign: "center", marginBottom: 16 }}>
      <button onClick={handleInstall}>
        Install App
      </button>
    </div>
  );
}
