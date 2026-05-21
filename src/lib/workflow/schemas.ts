import { z } from "zod";

export const dimensionsSchema = z.record(z.string(), z.number());

export const photosSchema = z.array(z.string().url().or(z.string().min(1)));

export const cutItemSchema = z.object({
  item: z.string().min(1),
  length: z.number().positive(),
  width: z.number().positive(),
  qty: z.number().int().positive(),
});

export const cutsSchema = z.array(cutItemSchema);

export const packagingChecklistSchema = z.object({
  structuralProfile: z.boolean(),
  totalProfiles: z.boolean(),
  accessories: z.boolean(),
  glass: z.boolean(),
  labelsApplied: z.boolean().optional(),
  fragileMarked: z.boolean().optional(),
});

export const accessoriesSchema = z.record(z.string(), z.number().int().nonnegative());

export const transportItemsCheckedSchema = z.object({
  perfil: z.boolean(),
  estrutural: z.boolean(),
  perfisTotal: z.boolean(),
  accessories: z.boolean(),
  glass: z.boolean(),
});

export const installationPhotosSchema = z.object({
  before: z.array(z.string()).min(1),
  after: z.array(z.string()).min(1),
});

export const quoteLineSchema = z.object({
  description: z.string(),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  materialCost: z.number().nonnegative().optional(),
});

export const quoteItemsSchema = z.array(quoteLineSchema);

/** Item de medição em campo (desenho + dimensões por peça) */
export const measurementLineItemSchema = z.object({
  id: z.string().min(1),
  qty: z.coerce.number().int().positive(),
  largura: z.coerce.number().positive(),
  altura: z.coerce.number().positive(),
  drawingUrl: z.string().nullable().optional(),
});

export const measurementItemsSchema = z
  .array(measurementLineItemSchema)
  .min(1, "Adicione ao menos uma medição com dimensões");

export type Dimensions = z.infer<typeof dimensionsSchema>;
export type MeasurementLineItem = z.infer<typeof measurementLineItemSchema>;
export type CutItem = z.infer<typeof cutItemSchema>;
export type PackagingChecklist = z.infer<typeof packagingChecklistSchema>;
export type TransportItemsChecked = z.infer<typeof transportItemsCheckedSchema>;
export type InstallationPhotos = z.infer<typeof installationPhotosSchema>;
