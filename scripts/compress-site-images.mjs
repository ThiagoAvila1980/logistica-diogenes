/**
 * Recomprime imagens pesadas da galeria do site.
 * Executa apenas sobre arquivos acima de 300 KB.
 * Mantém formato webp, reduz para max 1400px de largura, qualidade 80.
 * Logo (logotipo.png) é convertido para webp com fundo transparente preservado.
 */
import sharp from "../site/node_modules/sharp/dist/index.cjs";
import { readdir, stat, copyFile, unlink, writeFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const IMAGES_DIR = join(__dirname, "../site/public/images");
const MAX_WIDTH = 1400;
const QUALITY = 80;
const THRESHOLD_BYTES = 300 * 1024; // 300 KB

const files = await readdir(IMAGES_DIR);
const webpFiles = files.filter((f) => f.endsWith(".webp"));

let totalSaved = 0;

for (const file of webpFiles) {
  const filePath = join(IMAGES_DIR, file);
  const { size } = await stat(filePath);

  if (size <= THRESHOLD_BYTES) {
    console.log(`  skip  ${file} (${(size / 1024).toFixed(0)} KB — abaixo do limite)`);
    continue;
  }

  const buffer = await sharp(filePath)
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: QUALITY })
    .toBuffer();

  const newSize = buffer.length;
  const saved = size - newSize;
  totalSaved += saved;

  await writeFile(filePath, buffer);

  console.log(
    `  ✓ ${file}: ${(size / 1024).toFixed(0)} KB → ${(newSize / 1024).toFixed(0)} KB  (−${(saved / 1024).toFixed(0)} KB)`
  );
}

console.log(`\nTotal economizado: ${(totalSaved / 1024 / 1024).toFixed(2)} MB`);
