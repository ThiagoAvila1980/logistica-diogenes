import { z } from "zod";

export const dimensionsSchema = z.record(z.string(), z.number());

export const photosSchema = z.array(z.string().url().or(z.string().min(1)));

/** Fotos persistidas no log de instalação */
export const installationPhotosStorageSchema = z.object({
  service: z.array(z.string()).optional(),
});

/** Item de medição em campo (desenho + ambiente + dimensões por peça) */
export const measurementLineItemSchema = z.object({
  id: z.string().min(1),
  idAmbiente: z.string().uuid().nullish(),
  qty: z.coerce.number().int().positive(),
  largura: z.coerce.number().positive(),
  altura: z.coerce.number().positive(),
  idCor: z.string().uuid().nullish(),
  idTipoVidro: z.string().uuid().nullish(),
  idTipoEnvidracamento: z.string().uuid().nullish(),
  drawingUrl: z.string().nullable().optional(),
});

export const measurementItemsSchema = z
  .array(measurementLineItemSchema)
  .min(1, "Adicione ao menos uma medição com dimensões");

export type Dimensions = z.infer<typeof dimensionsSchema>;
export type MeasurementLineItem = z.infer<typeof measurementLineItemSchema>;
export type InstallationPhotos = z.infer<typeof installationPhotosStorageSchema>;
