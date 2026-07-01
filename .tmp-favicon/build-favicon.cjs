const fs = require("node:fs/promises");
const path = require("node:path");
const sharp = require("sharp");
const pngToIco = require("png-to-ico").default;

const publicDir = path.resolve(__dirname, "../site/public");
const sourcePath = path.join(publicDir, "logo-icon.png");
const outputPath = path.join(publicDir, "favicon.ico");

function isBlueBand(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const saturation = max === 0 ? 0 : (max - min) / max;

  if (max < 40) return false;
  if (b < 55) return false;
  if (b <= r + 8 && b <= g + 8) return false;

  return saturation > 0.12 || b >= 90;
}

function cleanLogoPixels(data, width, height) {
  const cleaned = Buffer.from(data);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const idx = (y * width + x) * 4;
      const r = cleaned[idx];
      const g = cleaned[idx + 1];
      const b = cleaned[idx + 2];

      if (isBlueBand(r, g, b)) {
        cleaned[idx + 3] = 255;
        continue;
      }

      cleaned[idx + 3] = 0;
    }
  }

  return cleaned;
}

async function buildTransparentLogo(size) {
  const { data, info } = await sharp(sourcePath)
    .resize(size, size, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const cleaned = cleanLogoPixels(data, info.width, info.height);

  return sharp(cleaned, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4,
    },
  })
    .png()
    .toBuffer();
}

async function main() {
  const sizes = [16, 32, 48];
  const pngBuffers = await Promise.all(sizes.map((size) => buildTransparentLogo(size)));
  const icoBuffer = await pngToIco(pngBuffers);
  await fs.writeFile(outputPath, icoBuffer);
  await fs.writeFile(
    path.join(publicDir, "_favicon-preview-32.png"),
    pngBuffers[1],
  );
  console.log(`Wrote ${outputPath} (${sizes.join(", ")}px)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
