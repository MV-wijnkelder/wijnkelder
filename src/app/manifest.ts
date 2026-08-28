import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "VINOCASTELLO",
    short_name: "VINOCASTELLO",
    description: "Your private collection and trusted personal sommelier.",
    start_url: "/",
    display: "standalone",
    background_color: "#171012",
    theme_color: "#171012",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
