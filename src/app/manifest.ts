import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "VinoCastello",
    short_name: "VinoCastello",
    description: "Your private collection and trusted personal sommelier.",
    start_url: "/",
    display: "standalone",
    background_color: "#171012",
    theme_color: "#171012",
    icons: [
      {
        src: "/images/icon-hero.webp",
        sizes: "1254x1254",
        type: "image/webp",
        purpose: "any",
      },
    ],
  };
}
