import { z } from "zod";

export const dimensionsSchema = z.record(z.string(), z.number());

export const photosSchema = z.array(z.string().url().or(z.string().min(1)));

/** Fotos persistidas no log de instalação */
export const installationPhotosStorageSchema = z.object({
  service: z.array(z.string()).optional(),
});

/** Observação diária do instalador (uma por dia de serviço) */
export const installationDailyNoteSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  text: z.string().min(1).max(2000),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const installationDailyNotesSchema = z.array(installationDailyNoteSchema);

export type InstallationDailyNote = z.infer<typeof installationDailyNoteSchema>;

const positiveDimension = z.coerce.number().positive();
const extraDimensions = z.array(positiveDimension).optional();

/** Desenho individual de uma medição */
export const drawingItemSchema = z.object({
  id: z.string().min(1),
  url: z.string(),
});

export type DrawingItem = z.infer<typeof drawingItemSchema>;

/** Progresso de corte por vão (item de medição) */
export const itemCuttingProgressSchema = z.object({
  corte: z.boolean().default(false),
  embalagem: z.boolean().default(false),
  acessorios: z.boolean().default(false),
  vidros: z.boolean().default(false),
});

export type ItemCuttingProgress = z.infer<typeof itemCuttingProgressSchema>;

/** Progresso de instalação por vão (item de medição) */
export const itemInstallationProgressSchema = z.object({
  estrutural: z.boolean().default(false),
  vidros: z.boolean().default(false),
});

export type ItemInstallationProgress = z.infer<typeof itemInstallationProgressSchema>;

/** Progresso de transporte por vão (item de medição) */
export const itemTransportProgressSchema = z.object({
  perfilEstrutural: z.boolean().default(false),
  perfilTotal: z.boolean().default(false),
  acessorios: z.boolean().default(false),
  vidros: z.boolean().default(false),
});

export type ItemTransportProgress = z.infer<typeof itemTransportProgressSchema>;

/** Item de medição em campo (desenho + ambiente + dimensões por peça) */
export const measurementLineItemSchema = z.object({
  id: z.string().min(1),
  idAmbiente: z.string().uuid().nullish(),
  qty: z.coerce.number().int().positive(),
  largura: positiveDimension,
  altura: positiveDimension,
  /** Larguras adicionais (ex.: vão superior e inferior em arco) */
  largurasExtras: extraDimensions,
  /** Alturas adicionais (ex.: lateral e central em arco) */
  alturasExtras: extraDimensions,
  /** UI: seção de medidas irregulares expandida no formulário */
  mostrarMedidasExtras: z.boolean().optional(),
  idCor: z.string().uuid().nullish(),
  idTipoVidro: z.string().uuid().nullish(),
  idTipoEnvidracamento: z.string().uuid().nullish(),
  /** @deprecated Use drawings[] — mantido para compatibilidade com dados antigos */
  drawingUrl: z.string().nullable().optional(),
  /** Desenhos da medição (substitui drawingUrl) */
  drawings: z.array(drawingItemSchema).optional(),
  observacao: z.string().max(500).optional(),
  photos: photosSchema.optional(),
  /** Marcado true quando o vão foi selecionado para envio ao plano de corte */
  sentToCutting: z.boolean().optional(),
  /** Progresso de corte por vão — preenchido na tela de produção */
  cuttingProgress: itemCuttingProgressSchema.optional(),
  /** Progresso de transporte por vão — preenchido na tela de logística */
  transportProgress: itemTransportProgressSchema.optional(),
  /** Progresso de instalação por vão — preenchido na tela de instalação */
  installationProgress: itemInstallationProgressSchema.optional(),
});

export const measurementItemsSchema = z
  .array(measurementLineItemSchema)
  .min(1, "Adicione ao menos uma medição com dimensões");

export type Dimensions = z.infer<typeof dimensionsSchema>;
export type MeasurementLineItem = z.infer<typeof measurementLineItemSchema>;
export type InstallationPhotos = z.infer<typeof installationPhotosStorageSchema>;
