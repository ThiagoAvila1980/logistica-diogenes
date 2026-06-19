import sharp from "sharp";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const SRC =
  "C:/Users/User/.cursor/projects/c-dev-logistica-diogenes/assets/c__Users_User_AppData_Roaming_Cursor_User_workspaceStorage_34ef527eee47abb3b86142b12149f980_images_favicon-054923a3-141f-4732-b3c4-993965712da0.png";
const OUT = join(process.cwd(), "public");

const BG_THRESHOLD = 42;
const FEATHER = 55;

function isBackground(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max <= BG_THRESHOLD && max - min <= 24;
}

function removeBackground(data, width, height) {
  const visited = new Uint8Array(width * height);
  const queue = [];

  for (let x = 0; x < width; x++) {
    queue.push(x, 0, x, height - 1);
  }
  for (let y = 1; y < height - 1; y++) {
    queue.push(0, y, width - 1, y);
  }

  while (queue.length) {
    const y = queue.pop();
    const x = queue.pop();
    const i = y * width + x;
    if (x < 0 || y < 0 || x >= width || y >= height || visited[i]) continue;

    const idx = i * 4;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];

    if (!isBackground(r, g, b)) continue;

    visited[i] = 1;
    data[idx + 3] = 0;

    queue.push(x - 1, y, x + 1, y, x, y - 1, x, y + 1);
  }

  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    if (visited[i]) continue;

    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    const max = Math.max(r, g, b);

    if (max <= BG_THRESHOLD) {
      data[idx + 3] = 0;
    } else if (max <= BG_THRESHOLD + FEATHER) {
      const t = (max - BG_THRESHOLD) / FEATHER;
      data[idx + 3] = Math.min(data[idx + 3], Math.round(t * 255));
    }
  }
}

async function main() {
  const { data, info } = await sharp(SRC)
    .rotate()
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const rgba = Buffer.from(data);
  removeBackground(rgba, info.width, info.height);

  let pipeline = sharp(rgba, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .trim({ threshold: 1 })
    .extend({
      top: 32,
      bottom: 32,
      left: 32,
      right: 32,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    });

  const master = await pipeline
    .resize(512, 512, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();

  writeFileSync(join(OUT, "logo-icon.png"), master);

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
        background: { r: 0, g: 0, b: 0, alpha: 0 },
        kernel: sharp.kernel.lanczos3,
      })
      .png({ compressionLevel: 9, adaptiveFiltering: true })
      .toBuffer();
    writeFileSync(join(OUT, name), buf);
  }

  console.log("Favicons generated in public/ and app/icon.png");
  writeFileSync(join(process.cwd(), "app/icon.png"), master);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
