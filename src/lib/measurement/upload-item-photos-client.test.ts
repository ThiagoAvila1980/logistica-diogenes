import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MeasurementLineItem } from "@/lib/workflow/schemas";

const uploadPhotos = vi.hoisted(() =>
  vi.fn(async () => ({ success: true as const, urls: ["uploads/photo.webp"] })),
);

const compressPhotoToJpegFile = vi.hoisted(() =>
  vi.fn(async (file: File) => {
    return new File([file], `compressed-${file.name}`, { type: "image/jpeg" });
  }),
);

vi.mock("@/actions/upload-actions", () => ({
  uploadPhotos,
}));

vi.mock("@/lib/offline/photo-compress", () => ({
  compressPhotoToJpegFile,
}));

import { uploadPendingItemPhotos } from "./upload-item-photos-client";

function makeItem(id: string, photos?: string[]): MeasurementLineItem {
  return {
    id,
    photos,
  } as MeasurementLineItem;
}

function makeFile(name: string, size = 100): File {
  return new File([new Uint8Array(size)], name, { type: "image/jpeg" });
}

describe("uploadPendingItemPhotos", () => {
  beforeEach(() => {
    uploadPhotos.mockClear();
    compressPhotoToJpegFile.mockClear();
    uploadPhotos.mockImplementation(async (fd: FormData) => {
      const files = fd.getAll("photos").filter((f) => f instanceof File);
      return {
        success: true as const,
        urls: files.map((_, i) => `uploads/photo-${i}.webp`),
      };
    });
  });

  it("envia uma foto por vez após comprimir, nunca o lote inteiro", async () => {
    const files = [makeFile("a.jpg"), makeFile("b.jpg"), makeFile("c.jpg")];

    const result = await uploadPendingItemPhotos(
      "11111111-1111-1111-1111-111111111111",
      [makeItem("item-1")],
      { "item-1": files },
    );

    expect(result.success).toBe(true);
    expect(compressPhotoToJpegFile).toHaveBeenCalledTimes(3);
    expect(uploadPhotos).toHaveBeenCalledTimes(3);

    for (const call of uploadPhotos.mock.calls) {
      const fd = call[0] as FormData;
      const batch = fd.getAll("photos").filter((f) => f instanceof File);
      expect(batch).toHaveLength(1);
    }
  });

  it("preserva fotos já salvas e acumula as novas URLs", async () => {
    uploadPhotos
      .mockResolvedValueOnce({
        success: true,
        urls: ["uploads/new-1.webp"],
      })
      .mockResolvedValueOnce({
        success: true,
        urls: ["uploads/new-2.webp"],
      });

    const result = await uploadPendingItemPhotos(
      "11111111-1111-1111-1111-111111111111",
      [makeItem("item-1", ["uploads/old.webp"])],
      { "item-1": [makeFile("a.jpg"), makeFile("b.jpg")] },
    );

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.items[0]?.photos).toEqual([
      "uploads/old.webp",
      "uploads/new-1.webp",
      "uploads/new-2.webp",
    ]);
  });

  it("falha no primeiro upload com erro e não continua o lote", async () => {
    uploadPhotos.mockResolvedValueOnce({
      success: false,
      message: "Arquivo muito grande",
    });

    const result = await uploadPendingItemPhotos(
      "11111111-1111-1111-1111-111111111111",
      [makeItem("item-1")],
      { "item-1": [makeFile("a.jpg"), makeFile("b.jpg")] },
    );

    expect(result).toEqual({
      success: false,
      message: "Arquivo muito grande",
    });
    expect(uploadPhotos).toHaveBeenCalledTimes(1);
  });
});
