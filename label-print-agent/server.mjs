/**
 * Agente local de impressão de etiquetas (Método A).
 * Roda no Windows com a POS-9220-L (ou similar) no USB.
 *
 *   GET  /health
 *   GET  /printers
 *   POST /print   { "raw": "^XA...", "printer": "opcional" }
 *
 * Variáveis:
 *   LABEL_PRINT_PORT      (default 9101)
 *   LABEL_PRINT_PRINTER   nome da impressora no Windows (obrigatório se houver várias)
 *   LABEL_PRINT_TOKEN     se definido, exige header X-Print-Token
 */

import http from "node:http";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { writeFile, unlink, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));

const PORT = Number(process.env.LABEL_PRINT_PORT || 9101);
const DEFAULT_PRINTER = (process.env.LABEL_PRINT_PRINTER || "").trim();
const TOKEN = (process.env.LABEL_PRINT_TOKEN || "").trim();
const PS1 = join(__dirname, "send-raw.ps1");

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Print-Token",
    "Access-Control-Max-Age": "86400",
  };
}

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload),
    ...corsHeaders(),
  });
  res.end(payload);
}

function sendOptions(res) {
  res.writeHead(204, {
    ...corsHeaders(),
    "Content-Length": "0",
  });
  res.end();
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function assertToken(req) {
  if (!TOKEN) return;
  const got = req.headers["x-print-token"];
  if (got !== TOKEN) {
    const err = new Error("Token de impressão inválido.");
    err.status = 401;
    throw err;
  }
}

async function listPrinters() {
  const { stdout } = await execFileAsync(
    "powershell.exe",
    [
      "-NoProfile",
      "-Command",
      "Get-Printer | Select-Object -ExpandProperty Name | ConvertTo-Json -Compress",
    ],
    { windowsHide: true, maxBuffer: 2 * 1024 * 1024 },
  );
  const trimmed = stdout.trim();
  if (!trimmed) return [];
  const parsed = JSON.parse(trimmed);
  return Array.isArray(parsed) ? parsed : [parsed];
}

async function sendRawToPrinter(printerName, raw) {
  const dir = await mkdtemp(join(tmpdir(), "diogenes-label-"));
  const filePath = join(dir, "label.zpl");
  try {
    await writeFile(filePath, raw, "utf8");
    const { stdout, stderr } = await execFileAsync(
      "powershell.exe",
      [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        PS1,
        "-PrinterName",
        printerName,
        "-FilePath",
        filePath,
      ],
      { windowsHide: true, maxBuffer: 2 * 1024 * 1024 },
    );
    return { stdout: stdout.trim(), stderr: stderr.trim() };
  } finally {
    await unlink(filePath).catch(() => {});
  }
}

async function resolvePrinter(requested) {
  const name = (requested || DEFAULT_PRINTER || "").trim();
  const printers = await listPrinters();
  if (name) {
    const exact = printers.find((p) => p === name);
    if (exact) return exact;
    const loose = printers.find(
      (p) => p.toLowerCase() === name.toLowerCase(),
    );
    if (loose) return loose;
    throw Object.assign(
      new Error(
        `Impressora "${name}" não encontrada. Disponíveis: ${printers.join(", ") || "(nenhuma)"}`,
      ),
      { status: 400 },
    );
  }
  if (printers.length === 1) return printers[0];
  if (printers.length === 0) {
    throw Object.assign(
      new Error("Nenhuma impressora instalada neste Windows."),
      { status: 400 },
    );
  }
  throw Object.assign(
    new Error(
      `Várias impressoras encontradas. Defina LABEL_PRINT_PRINTER ou envie "printer". Disponíveis: ${printers.join(", ")}`,
    ),
    { status: 400 },
  );
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "OPTIONS") {
      sendOptions(res);
      return;
    }

    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

    if (req.method === "GET" && url.pathname === "/health") {
      sendJson(res, 200, {
        ok: true,
        service: "diogenes-label-print-agent",
        defaultPrinter: DEFAULT_PRINTER || null,
        port: PORT,
      });
      return;
    }

    if (req.method === "GET" && url.pathname === "/printers") {
      assertToken(req);
      const printers = await listPrinters();
      sendJson(res, 200, { printers, defaultPrinter: DEFAULT_PRINTER || null });
      return;
    }

    if (req.method === "POST" && url.pathname === "/print") {
      assertToken(req);
      const bodyText = await readBody(req);
      let body;
      try {
        body = JSON.parse(bodyText || "{}");
      } catch {
        sendJson(res, 400, { ok: false, error: "JSON inválido." });
        return;
      }
      const raw = typeof body.raw === "string" ? body.raw : "";
      if (!raw.trim()) {
        sendJson(res, 400, { ok: false, error: 'Campo "raw" é obrigatório.' });
        return;
      }
      const printer = await resolvePrinter(body.printer);
      console.log(
        `[label-print-agent] PRINT printer="${printer}" bytes=${Buffer.byteLength(raw, "utf8")}`,
      );
      const result = await sendRawToPrinter(printer, raw);
      sendJson(res, 200, { ok: true, printer, ...result });
      return;
    }

    // Etiqueta TSPL mínima para diagnosticar driver/fila Windows
    if (
      (req.method === "POST" || req.method === "GET") &&
      url.pathname === "/test"
    ) {
      assertToken(req);
      const printer = await resolvePrinter(url.searchParams.get("printer"));
      const raw = [
        "SIZE 100 mm, 50 mm",
        "GAP 3 mm, 0 mm",
        "DIRECTION 1",
        "CLS",
        'TEXT 40,40,"3",0,1,1,"Diogenes TESTE TSPL"',
        'TEXT 40,100,"2",0,1,1,"Se saiu papel, USB/raw OK"',
        "PRINT 1,1",
        "",
      ].join("\r\n");
      console.log(`[label-print-agent] TEST printer="${printer}"`);
      const result = await sendRawToPrinter(printer, raw);
      sendJson(res, 200, { ok: true, printer, ...result });
      return;
    }

    sendJson(res, 404, { ok: false, error: "Rota não encontrada." });
  } catch (err) {
    const status = err?.status || 500;
    sendJson(res, status, {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[label-print-agent] ouvindo em http://0.0.0.0:${PORT}`);
  console.log(
    `[label-print-agent] impressora padrão: ${DEFAULT_PRINTER || "(auto se houver só uma)"}`,
  );
  console.log(
    "[label-print-agent] GET /health  GET /printers  POST /print  GET|POST /test",
  );
});
