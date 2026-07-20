/**
 * Remove flatDir do build.gradle gerado pelo Capacitor (aviso inofensivo do AGP).
 * Roda após `cap sync` — o arquivo capacitor-cordova-android-plugins é regenerado.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const file = join(
  process.cwd(),
  "android",
  "capacitor-cordova-android-plugins",
  "build.gradle",
);

if (!existsSync(file)) {
  console.log("[cap-strip-flatdir] arquivo não encontrado, ok.");
  process.exit(0);
}

const original = readFileSync(file, "utf8");
let next = original.replace(
  /\n\s*flatDir\s*\{\s*dirs\s+'src\/main\/libs',\s*'libs'\s*\}\s*/g,
  "\n",
);
next = next.replace(
  /implementation fileTree\(dir: 'src\/main\/libs', include: \['\*\.jar'\]\)\s*\n/,
  "",
);

if (next === original) {
  console.log("[cap-strip-flatdir] nada a alterar.");
} else {
  writeFileSync(file, next, "utf8");
  console.log("[cap-strip-flatdir] flatDir removido.");
}
