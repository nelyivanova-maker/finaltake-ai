export const metadata = {
  title: "Finaltake AI",
  description: "Finaltake AI app",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
