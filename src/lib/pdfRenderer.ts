import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

export interface RenderedPage {
  pageNumber: number;
  width: number;
  height: number;
  dataUrl: string;
}

export interface RenderedPdf {
  id: string;
  name: string;
  pages: RenderedPage[];
}

export async function renderPdf(file: File): Promise<RenderedPdf> {
  const arrayBuffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", arrayBuffer);
  const id = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");

  const pdf = await pdfjsLib.getDocument({
    data: arrayBuffer,
  }).promise;

  const pages: RenderedPage[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);

    const viewport = page.getViewport({
      scale: 1.5,
    });

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Could not create canvas context.");
    }

    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);

    await page.render({
      canvas,
      canvasContext: context,
      viewport,
    }).promise;

    pages.push({
      pageNumber,
      width: viewport.width,
      height: viewport.height,
      dataUrl: canvas.toDataURL("image/jpeg", 0.85),
    });

    page.cleanup();
  }

  return { id, name: file.name, pages };
}