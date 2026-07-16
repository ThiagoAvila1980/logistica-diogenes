import { describe, expect, it } from "vitest";
import { mergePendingPhotoItems } from "./merge-pending-photo-items";

function makeFile(name: string, size = 10, lastModified = 1): File {
  const blob = new Blob([new Uint8Array(size)]);
  return new File([blob], name, { type: "image/jpeg", lastModified });
}

function createItem(file: File) {
  return {
    id: `id-${file.name}`,
    url: `blob:${file.name}`,
    preview: `blob:${file.name}`,
    file,
  };
}

describe("mergePendingPhotoItems", () => {
  it("não duplica arquivos que já estão na lista local (eco do pai)", () => {
    const file = makeFile("foto.jpg", 1200, 42);
    const current = [createItem(file)];

    const next = mergePendingPhotoItems(current, [file], createItem, 10);

    expect(next).toBe(current);
    expect(next).toHaveLength(1);
  });

  it("adiciona apenas arquivos novos ao reidratar", () => {
    const existing = makeFile("a.jpg", 100, 1);
    const incoming = makeFile("b.jpg", 200, 2);
    const current = [createItem(existing)];

    const next = mergePendingPhotoItems(
      current,
      [existing, incoming],
      createItem,
      10,
    );

    expect(next).toHaveLength(2);
    expect(next[1]?.file?.name).toBe("b.jpg");
  });

  it("respeita o limite maxFiles", () => {
    const current = [createItem(makeFile("a.jpg", 1, 1))];
    const next = mergePendingPhotoItems(
      current,
      [makeFile("b.jpg", 2, 2), makeFile("c.jpg", 3, 3)],
      createItem,
      2,
    );

    expect(next).toHaveLength(2);
    expect(next.map((i) => i.file?.name)).toEqual(["a.jpg", "b.jpg"]);
  });
});
