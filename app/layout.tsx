import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FRAME · Une image. Une aventure.",
  description:
    "Explorez des escape games illustrés. Créez votre aventure avec les modèles Meta et partagez-la avec la communauté.",
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
