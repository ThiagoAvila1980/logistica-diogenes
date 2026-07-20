import type { OrderDetail } from "@/lib/data/types";
import type { MeasurementLookups } from "@/lib/data/lookup-types";
import { resolveLookupLabel } from "@/lib/data/lookup-types";
import type { MeasurementLineItem } from "@/lib/workflow/schemas";
import { getOrderDisplayNumber } from "@/lib/order-display";
import { formatBrPhone } from "@/lib/phone-format";
import {
  buildVaoItemSubtitle,
  getVaoNumber,
} from "@/lib/measurement/vao-item-subtitle";
import {
  buildLabelZpl,
  buildVaoQrPayload,
  type LabelContent,
} from "@/lib/labels/build-label-zpl";
import { buildLabelTspl } from "@/lib/labels/build-label-tspl";
import {
  DEFAULT_LABEL_PROFILE,
  type LabelProfile,
} from "@/lib/labels/label-profile";

export function buildLabelContent(input: {
  order: Pick<
    OrderDetail,
    | "number"
    | "budgetReference"
    | "clientName"
    | "clientPhone"
    | "clientAddress"
  > & { numeroOrcamento?: string | null };
  item: MeasurementLineItem;
  itemIndex: number;
  lookups?: MeasurementLookups;
}): LabelContent {
  const { order, item, itemIndex, lookups } = input;
  const subtitle = buildVaoItemSubtitle(item, itemIndex, lookups);
  const phone = order.clientPhone?.trim()
    ? formatBrPhone(order.clientPhone)
    : "";

  const ambiente =
    resolveLookupLabel(lookups?.ambientes ?? [], item.idAmbiente ?? null) ??
    "-";
  const envidracamento =
    resolveLookupLabel(
      lookups?.tipoEnvidracamento ?? [],
      item.idTipoEnvidracamento ?? null,
    ) ?? "-";

  return {
    clientName: order.clientName?.trim() || "-",
    budgetNumber: getOrderDisplayNumber(order),
    clientPhone: phone || "-",
    clientAddress: order.clientAddress?.trim() || "-",
    vaoNumber: getVaoNumber(item, itemIndex),
    ambiente,
    envidracamento,
    vaoSpec: subtitle.spec,
    vaoDims: subtitle.dims ?? "",
    qrPayload: buildVaoQrPayload(item.id),
  };
}

export function buildVaoLabelRaw(input: {
  order: Parameters<typeof buildLabelContent>[0]["order"];
  item: MeasurementLineItem;
  itemIndex: number;
  lookups?: MeasurementLookups;
  profile?: LabelProfile;
}): { raw: string; content: LabelContent; profile: LabelProfile } {
  const profile = input.profile ?? DEFAULT_LABEL_PROFILE;
  const content = buildLabelContent(input);
  const raw =
    profile.language === "zpl"
      ? buildLabelZpl(content, profile)
      : buildLabelTspl(content, profile);
  return {
    raw,
    content,
    profile,
  };
}
