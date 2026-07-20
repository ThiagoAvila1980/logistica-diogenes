import sharp from "sharp";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const SRC = join(process.cwd(), "app/icon.png");
const OUT = join(process.cwd(), "public");

const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };

async function main() {
  const master = await sharp(SRC)
    .rotate()
    .resize(512, 512, {
      fit: "contain",
      background: WHITE,
    })
    .flatten({ background: WHITE })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();

  writeFileSync(join(OUT, "logo-icon.png"), master);
  writeFileSync(join(process.cwd(), "app/icon.png"), master);

  const sizes = [
    ["favicon-16x16.png", 16],
    ["favicon-32x32.png", 32],
    ["favicon-48x48.png", 48],
    ["logo 01.png", 180],
    ["icon-192.png", 192],
    ["icon-512.png", 512],
  ];

  for (const [name, size] of sizes) {
    const buf = await sharp(master)
      .resize(size, size, {
        fit: "contain",
        background: WHITE,
        kernel: sharp.kernel.lanczos3,
      })
      .flatten({ background: WHITE })
      .png({ compressionLevel: 9, adaptiveFiltering: true })
      .toBuffer();
    writeFileSync(join(OUT, name), buf);
  }

  console.log("Favicons gerados com fundo branco em public/ e app/icon.png");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
