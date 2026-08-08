export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

const MAX_EDGE = 2048;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not load image"));
    image.src = src;
  });
}

export async function exportCroppedImage(src: string, area: CropArea): Promise<Blob> {
  const image = await loadImage(src);
  const scale = Math.min(1, MAX_EDGE / Math.max(area.width, area.height));
  const outWidth = Math.round(area.width * scale);
  const outHeight = Math.round(area.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = outWidth;
  canvas.height = outHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, outWidth, outHeight);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Export failed"))),
      "image/webp",
      0.9,
    );
  });
}
