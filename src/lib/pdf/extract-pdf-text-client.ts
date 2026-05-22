import type { PdfHeaderData } from "@/lib/pdf/parse-pdf-header";
import { parsePdfHeaderText } from "@/lib/pdf/parse-pdf-header";

type TextItem = {
  str?: string;
  transform?: number[];
};

function pageTextFromItems(items: TextItem[]): string {
  let lastY: number | null = null;
  let text = "";

  for (const item of items) {
    if (!item.str) continue;
    const y = item.transform?.[5] ?? null;
    if (lastY !== null && y !== null && Math.abs(y - lastY) > 2) {
      text += "\n";
    } else if (text && !text.endsWith("\n") && !text.endsWith(" ")) {
      text += " ";
    }
    text += item.str;
    if (y !== null) lastY = y;
  }

  return text;
}

/** Extrai texto da 1ª página no navegador (pré-visualização do formulário). */
export async function extractPdfHeaderFromFile(
  file: File,
): Promise<PdfHeaderData> {
  const pdfjs = await import("pdfjs-dist");

  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
  }

  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({
    data,
    useWorkerFetch: false,
    isEvalSupported: false,
  }).promise;

  try {
    const page = await doc.getPage(1);
    const content = await page.getTextContent();
    const text = pageTextFromItems(content.items as TextItem[]);
    return parsePdfHeaderText(text);
  } finally {
    await doc.destroy();
  }
}
