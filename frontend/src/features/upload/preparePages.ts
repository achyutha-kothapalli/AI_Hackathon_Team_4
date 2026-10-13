// Turns user files (photos, scans, PDFs) into compressed JPEG page images.
// Everything is normalised to images client-side so the backend only ever
// deals with one input type and uploads stay under Vercel's 4.5 MB limit.

export interface PreparedPage {
  id: string;
  blob: Blob;
  url: string; // object URL for display
  width: number;
  height: number;
  sourceName: string;
}

const MAX_EDGE = 2000;
const PDF_RENDER_EDGE = 2000;

let nextId = 0;

async function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality),
  );
  if (!blob) throw new Error("Could not encode image.");
  return blob;
}

function drawScaled(source: CanvasImageSource, w: number, h: number, maxEdge: number) {
  const scale = Math.min(1, maxEdge / Math.max(w, h));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff"; // transparent PNGs would otherwise turn black
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

async function makePage(canvas: HTMLCanvasElement, sourceName: string): Promise<PreparedPage> {
  const blob = await canvasToJpeg(canvas, 0.85);
  return {
    id: `page-${nextId++}`,
    blob,
    url: URL.createObjectURL(blob),
    width: canvas.width,
    height: canvas.height,
    sourceName,
  };
}

async function imageFileToPage(file: File): Promise<PreparedPage> {
  let bitmap: ImageBitmap;
  try {
    // Respects EXIF orientation, so phone photos are upright.
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error(
      `"${file.name}" could not be read. HEIC photos only work in Safari — please use JPEG or PNG.`,
    );
  }
  const canvas = drawScaled(bitmap, bitmap.width, bitmap.height, MAX_EDGE);
  bitmap.close();
  return makePage(canvas, file.name);
}

async function pdfFileToPages(file: File, maxPages: number): Promise<PreparedPage[]> {
  // Loaded on demand: pdf.js is large and most uploads are photos.
  const pdfjs = await import("pdfjs-dist");
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const task = pdfjs.getDocument({ data: await file.arrayBuffer() });
  const doc = await task.promise;
  const pages: PreparedPage[] = [];
  try {
    for (let n = 1; n <= Math.min(doc.numPages, maxPages); n++) {
      const page = await doc.getPage(n);
      const base = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({
        scale: PDF_RENDER_EDGE / Math.max(base.width, base.height),
      });
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      await page.render({ canvas, viewport, background: "#ffffff" }).promise;
      pages.push(await makePage(canvas, `${file.name} p.${n}`));
    }
  } finally {
    await task.destroy();
  }
  return pages;
}

export async function preparePages(files: File[], maxPages: number): Promise<PreparedPage[]> {
  const pages: PreparedPage[] = [];
  for (const file of files) {
    const remaining = maxPages - pages.length;
    if (remaining <= 0) break;
    if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
      pages.push(...(await pdfFileToPages(file, remaining)));
    } else {
      pages.push(await imageFileToPage(file));
    }
  }
  return pages;
}

/** Re-encode pages smaller until the whole upload fits in `maxBytes`. */
export async function fitToBudget(pages: PreparedPage[], maxBytes: number): Promise<Blob[]> {
  const total = (blobs: Blob[]) => blobs.reduce((n, b) => n + b.size, 0);
  let blobs = pages.map((p) => p.blob);
  const attempts: [number, number][] = [
    [1600, 0.75],
    [1400, 0.65],
    [1200, 0.55],
  ];
  for (const [edge, quality] of attempts) {
    if (total(blobs) <= maxBytes) break;
    blobs = await Promise.all(
      pages.map(async (p) => {
        const bitmap = await createImageBitmap(p.blob);
        const canvas = drawScaled(bitmap, bitmap.width, bitmap.height, edge);
        bitmap.close();
        return canvasToJpeg(canvas, quality);
      }),
    );
  }
  if (total(blobs) > maxBytes) {
    throw new Error("These pages are too large to upload together. Try fewer pages.");
  }
  return blobs;
}

export function releasePages(pages: PreparedPage[]) {
  pages.forEach((p) => URL.revokeObjectURL(p.url));
}
