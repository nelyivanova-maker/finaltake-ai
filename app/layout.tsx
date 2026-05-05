import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "FinalTake AI",
  description: "AI script reader and audition recording app",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "FinalTake AI",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#064e3b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
