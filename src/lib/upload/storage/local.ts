import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import type { StorageProvider } from "./types";

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");

export function createLocalStorageProvider(): StorageProvider {
  return {
    name: "local",

    async putObject(key, body) {
      const filePath = path.join(UPLOAD_ROOT, key);
      await mkdir(path.dirname(filePath), { recursive: true });
      await writeFile(filePath, body);
      return `/uploads/${key.replace(/\\/g, "/")}`;
    },

    async deleteObject(url) {
      if (!url.startsWith("/uploads/")) return;
      const relative = url.replace(/^\/uploads\//, "");
      const resolved = path.resolve(UPLOAD_ROOT, relative);
      const uploadsRoot = path.resolve(UPLOAD_ROOT);
      if (
        !resolved.startsWith(uploadsRoot + path.sep) &&
        resolved !== uploadsRoot
      ) {
        return;
      }
      try {
        await unlink(resolved);
      } catch (err) {
        const code = (err as NodeJS.ErrnoException)?.code;
        if (code !== "ENOENT") {
          console.warn("[localStorage.deleteObject]", resolved, err);
        }
      }
    },
  };
}
