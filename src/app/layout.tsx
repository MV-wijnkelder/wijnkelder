import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Marcel's Wijnkelder",
  description: "Scan een wijnetiket en bewaar je favoriete flessen.",
};

export const viewport: Viewport = {
  themeColor: "#f5f3ef",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl">
      <body>{children}</body>
    </html>
  );
}
