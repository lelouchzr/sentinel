import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FRAME · Une image. Une aventure.",
  description:
    "Importez votre illustration ou générez un décor avec un prompt. Créez votre escape game avec les modèles Meta, puis testez et partagez votre aventure.",
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
    <html lang="fr">
      <body className="antialiased">{children}</body>
    </html>
  );
}
