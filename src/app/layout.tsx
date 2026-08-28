import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  applicationName: "VinoCastello",
  title: "VinoCastello",
  description: "Your private collection and trusted personal sommelier.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/images/icon-hero.webp", sizes: "1254x1254", type: "image/webp" }],
    shortcut: [{ url: "/images/icon-hero.webp", type: "image/webp" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#171012",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
