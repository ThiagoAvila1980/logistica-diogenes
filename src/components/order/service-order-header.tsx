import Link from "next/link";
import { ArrowLeft, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { buildWhatsAppUrl } from "@/lib/phone-format";
import { buildMapsSearchUrl } from "@/lib/maps-url";
import { cn } from "@/lib/utils";

export type ServiceOrderHeaderProps = {
  backHref?: string;
  backAriaLabel?: string;
  displayNumber: string;
  clientName: string;
  clientPhone?: string | null;
  clientAddress?: string | null;
  description?: string | null;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  contentClassName?: string;
};

/** Cabeçalho padrão de OS: cliente, nº orçamento, telefone (WhatsApp) e endereço (Maps). */
export function ServiceOrderHeader({
  backHref,
  backAriaLabel = "Voltar",
  displayNumber,
  clientName,
  clientPhone,
  clientAddress,
  description,
  actions,
  children,
  className,
  contentClassName,
}: ServiceOrderHeaderProps) {
  const phone = clientPhone?.trim();
  const address = clientAddress?.trim();
  const whatsAppUrl = phone ? buildWhatsAppUrl(phone) : null;
  const mapsUrl = address ? buildMapsSearchUrl(address) : null;
  const hasActions = Boolean(actions);

  return (
    <section
      className={cn(
        "relative rounded-xl border bg-card p-4 shadow-sm",
        className,
      )}
    >
      {actions ? (
        <div className="absolute right-1 top-1 z-10 flex items-center gap-0.5 sm:right-2 sm:top-2">
          {actions}
        </div>
      ) : null}

      <div className="flex items-start gap-2">
        {backHref ? (
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="mt-0.5 shrink-0"
          >
            <Link href={backHref} aria-label={backAriaLabel}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
        ) : null}

        <div
          className={cn(
            "min-w-0 flex-1",
            hasActions && "pr-[4.75rem]",
            contentClassName,
          )}
        >
          <div className="min-w-0">
            <p className="truncate text-xl font-semibold leading-tight text-primary">
              {clientName}
            </p>
            <p className="font-mono text-xl tabular-nums text-muted-foreground">
              {displayNumber}
            </p>
          </div>

          {description?.trim() ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {description.trim()}
            </p>
          ) : null}

          {phone ? (
            <div className="mt-2.5">
              {whatsAppUrl ? (
                <a
                  href={whatsAppUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-primary underline-offset-2 hover:underline"
                  aria-label={`Abrir WhatsApp de ${phone}`}
                >
                  <WhatsAppIcon className="h-3.5 w-3.5 text-[#25D366]" />
                  {phone}
                </a>
              ) : (
                <span className="text-sm text-muted-foreground">{phone}</span>
              )}
            </div>
          ) : null}

          {address && mapsUrl ? (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2.5 inline-flex items-start gap-1.5 text-sm text-primary underline-offset-2 hover:underline"
              aria-label={`Abrir endereço no mapa: ${address}`}
            >
              <MapPin
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive"
                aria-hidden
              />
              <span>{address}</span>
            </a>
          ) : null}

          {children}
        </div>
      </div>
    </section>
  );
}
