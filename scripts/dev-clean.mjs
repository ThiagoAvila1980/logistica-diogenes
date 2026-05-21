import { rmSync } from "node:fs";
import { spawn } from "node:child_process";

const args = process.argv.slice(2);
const useWebpack = args.includes("--webpack");
const skipClean = args.includes("--no-clean");

if (!skipClean) {
  rmSync(".next", { recursive: true, force: true });
  console.log("[dev:clean] Pasta .next removida.");
}

const nextArgs = ["dev"];
if (!useWebpack) {
  nextArgs.push("--turbopack");
}

console.log(`[dev:clean] Iniciando: next ${nextArgs.join(" ")}`);

const child = spawn("next", nextArgs, {
  stdio: "inherit",
  shell: true,
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
