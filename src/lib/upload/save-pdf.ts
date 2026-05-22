import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { loadPdfParse } from "@/lib/pdf/pdf-parse-server";
import {
  PDF_ALLOWED_MIME,
  PDF_MAX_FILE_BYTES,
  parsePdfHeaderText,
  type PdfHeaderData,
} from "@/lib/pdf/parse-pdf-header";

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");

export function validatePdfFile(file: File): string | null {
  if (!file.size) return "Arquivo vazio";
  if (file.size > PDF_MAX_FILE_BYTES) {
    return `PDF muito grande (máx. ${PDF_MAX_FILE_BYTES / 1024 / 1024} MB)`;
  }
  if (!PDF_ALLOWED_MIME.has(file.type) && !file.name.toLowerCase().endsWith(".pdf")) {
    return "Apenas arquivos PDF são permitidos";
  }
  return null;
}

export async function parsePdfBuffer(
  buffer: Buffer,
): Promise<{ header: PdfHeaderData; error?: string }> {
  let parser: InstanceType<Awaited<ReturnType<typeof loadPdfParse>>> | null =
    null;
  try {
    const PDFParse = await loadPdfParse();
    parser = new PDFParse({ data: buffer });
    const textResult = await parser.getText({ first: 1 });
    const header = parsePdfHeaderText(textResult.text ?? "");
    return { header };
  } catch (err) {
    console.error("[parsePdfBuffer] PDF parse failed:", err);
    return {
      header: {
        clientName: null,
        clientPhone: null,
        budgetReference: null,
        rawHeaderText: "",
      },
      error: "Não foi possível ler o cabeçalho do PDF. Preencha os dados manualmente.",
    };
  } finally {
    await parser?.destroy();
  }
}

/** Lê o cabeçalho do PDF em memória (sem gravar em disco). */
export async function parsePdfFromFile(
  file: File,
): Promise<{ header: PdfHeaderData; error?: string }> {
  const validationError = validatePdfFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  return parsePdfBuffer(buffer);
}

export function pdfUrlToAbsolutePath(url: string): string | null {
  if (!url.startsWith("/uploads/")) return null;
  const relative = url.replace(/^\/uploads\//, "");
  const resolved = path.resolve(UPLOAD_ROOT, relative);
  const uploadsRoot = path.resolve(UPLOAD_ROOT);
  if (
    !resolved.startsWith(uploadsRoot + path.sep) &&
    resolved !== uploadsRoot
  ) {
    return null;
  }
  return resolved;
}

/** Remove PDF salvo localmente em public/uploads (não usa cloud storage). */
export async function deletePdfAtUrl(url: string): Promise<void> {
  const filePath = pdfUrlToAbsolutePath(url);
  if (!filePath) return;
  try {
    await unlink(filePath);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code !== "ENOENT") {
      console.warn("[deletePdfAtUrl]", filePath, err);
    }
  }
}

/**
 * Lê o cabeçalho do PDF. Não envia o arquivo ao Supabase/R2 — apenas parse em memória.
 * Opcionalmente grava cópia local em public/uploads (não é storage em nuvem).
 */
export async function savePdfAndParseHeader(
  file: File,
  osId: string,
  options?: { keepLocalCopy?: boolean },
): Promise<{ url: string | null; header: PdfHeaderData; error?: string }> {
  const validationError = validatePdfFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const { header, error } = await parsePdfBuffer(buffer);

  if (options?.keepLocalCopy === false) {
    return { url: null, header, error };
  }

  const dir = path.join(UPLOAD_ROOT, "measurements", osId);
  await mkdir(dir, { recursive: true });

  const filename = `${randomUUID()}.pdf`;
  await writeFile(path.join(dir, filename), buffer);

  const url = `/uploads/measurements/${osId}/${filename}`;
  return { url, header, error };
}
