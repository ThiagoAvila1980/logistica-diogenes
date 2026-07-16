import { describe, expect, it } from "vitest";
import { dataUrlToFile } from "./data-url-to-file";

describe("dataUrlToFile", () => {
  it("converte data URL WebP em File com mime e bytes corretos", async () => {
    const payload = "AQID"; // bytes 1,2,3
    const file = dataUrlToFile(`data:image/webp;base64,${payload}`, "foto.webp");

    expect(file.name).toBe("foto.webp");
    expect(file.type).toBe("image/webp");
    expect(file.size).toBe(3);

    const buffer = new Uint8Array(await file.arrayBuffer());
    expect([...buffer]).toEqual([1, 2, 3]);
  });

  it("rejeita data URL inválido", () => {
    expect(() => dataUrlToFile("https://example.com/a.webp", "x.webp")).toThrow(
      /inválido/i,
    );
  });
});
