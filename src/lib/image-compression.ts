const MAX_IMAGE_WIDTH = 1600;
const JPEG_QUALITY = 0.8;

export type ImageDimensions = { width: number; height: number };

export function fitImageWithinMaxWidth(
  width: number,
  height: number,
  maxWidth = MAX_IMAGE_WIDTH,
): ImageDimensions {
  if (width <= maxWidth) return { width, height };

  const scale = maxWidth / width;
  return { width: maxWidth, height: Math.round(height * scale) };
}

/**
 * Decodes the image before drawing it so the browser applies its EXIF
 * orientation. The resulting JPEG contains already-oriented pixels and does
 * not need the source metadata in order to display correctly.
 */
export async function compressImage(file: File): Promise<File> {
  const source = await createImageBitmap(file, { imageOrientation: "from-image" });

  try {
    const original = { width: source.width, height: source.height };
    const compressed = fitImageWithinMaxWidth(original.width, original.height);
    const canvas = document.createElement("canvas");
    canvas.width = compressed.width;
    canvas.height = compressed.height;

    const context = canvas.getContext("2d");
    if (!context) throw new Error("This browser cannot optimize photos.");

    // JPEG has no alpha channel. A white background avoids transparent areas
    // becoming black when a PNG or HEIC-derived image is selected.
    context.fillStyle = "#fff";
    context.fillRect(0, 0, compressed.width, compressed.height);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(source, 0, 0, compressed.width, compressed.height);

    const blob = await canvasToBlob(canvas);
    const compressedFile = new File([blob], jpegFileName(file.name), {
      type: "image/jpeg",
      lastModified: file.lastModified,
    });

    console.info("Photo optimization", {
      originalDimensions: `${original.width} × ${original.height}`,
      originalFileSize: file.size,
      compressedDimensions: `${compressed.width} × ${compressed.height}`,
      compressedFileSize: compressedFile.size,
    });

    return compressedFile;
  } finally {
    source.close();
  }
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("The photo could not be optimized."));
    }, "image/jpeg", JPEG_QUALITY);
  });
}

function jpegFileName(name: string): string {
  const baseName = name.replace(/\.[^.]+$/, "") || "label";
  return `${baseName}.jpg`;
}
