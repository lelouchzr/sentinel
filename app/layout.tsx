import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Storyscape · Images that come to life.",
  description:
    "Import your illustration or generate a setting with a prompt. Create your escape game with Meta models, then test and share your adventure.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
