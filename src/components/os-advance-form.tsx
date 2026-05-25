"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { PhotoUpload } from "@/components/ui/photo-upload";
import { BiometricConfirmGate, requiresBiometricConfirmation } from "@/components/auth/biometric-confirm-gate";
import { useOSAdvance } from "@/hooks/use-os-advance";
import { buildAdvancePayload } from "@/lib/os-advance-payload";
import { kanbanColumnTitle } from "@/lib/kanban/column-labels";
import type { AdvanceTargetStatus } from "@/lib/workflow/advance-flow";
import type { OsStatus } from "@/db/schema";
import type { BiometricConfirmation } from "@/lib/auth/biometric-types";
import { listActiveVehiclesForTransportAction } from "@/actions/vehicle-actions";
import type { VehicleOption } from "@/lib/data/vehicles";
import { cn } from "@/lib/utils";

type OSAdvanceFormProps = {
  osId: string;
  currentStatus: OsStatus;
  nextStatus: AdvanceTargetStatus;
  className?: string;
  onAdvanceStart?: (nextStatus: OsStatus) => void;
  onSuccess?: () => void;
  onError?: () => void;
};

const TRANSPORT_FIELDS = [
  { key: "perfil", label: "Perfil" },
  { key: "estrutural", label: "Estrutural" },
  { key: "perfisTotal", label: "Perfis total" },
  { key: "accessories", label: "Acessórios" },
  { key: "glass", label: "Levar vidro" },
] as const;

export function OSAdvanceForm({
  osId,
  currentStatus,
  nextStatus,
  className,
  onAdvanceStart,
  onSuccess,
  onError,
}: OSAdvanceFormProps) {
  const router = useRouter();
  const { advance, isLoading, result, clearResult } = useOSAdvance();
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [measurementPhotos, setMeasurementPhotos] = useState<string[]>([]);
  const [installPhotosBefore, setInstallPhotosBefore] = useState<string[]>([]);
  const [installPhotosAfter, setInstallPhotosAfter] = useState<string[]>([]);
  const [biometricConfirmation, setBiometricConfirmation] =
    useState<BiometricConfirmation | null>(null);
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);

  const needsVehicle = nextStatus === "transporte_perfil";

  useEffect(() => {
    if (!needsVehicle) return;
    listActiveVehiclesForTransportAction().then(setVehicles);
  }, [needsVehicle, osId, nextStatus]);

  const label = kanbanColumnTitle(nextStatus);
  const currentLabel = kanbanColumnTitle(currentStatus);
  const needsBiometric = requiresBiometricConfirmation(nextStatus);
  const isNotifyStep = nextStatus === "transporte_levar_vidro";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    clearResult();
    onAdvanceStart?.(nextStatus);
    const payload = buildAdvancePayload(nextStatus, {
      ...formData,
      measurementPhotos,
      installPhotosBefore,
      installPhotosAfter,
      biometricConfirmation,
    });
    advance(osId, nextStatus, payload, {
      onSuccess: () => {
        onSuccess?.();
        router.refresh();
      },
      onError: () => {
        onError?.();
      },
    });
  };

  if (result?.success) {
    return (
      <Alert variant="success" className={className}>
        <CheckCircle2 className="h-4 w-4" />
        <AlertTitle>Etapa concluída</AlertTitle>
        <AlertDescription>{result.message}</AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle>Avançar para: {label}</CardTitle>
        <CardDescription>
          Status atual: {currentLabel}. Preencha os campos
          obrigatórios.
        </CardDescription>
        {isNotifyStep && (
          <p className="text-xs text-muted-foreground">
            O cliente será notificado por e-mail e WhatsApp (se configurado).
          </p>
        )}
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {nextStatus === "medicao_final" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="dimensions">Dimensões (JSON)</Label>
                <Textarea
                  id="dimensions"
                  placeholder='{"largura": 1000, "altura": 2100}'
                  value={(formData.dimensions as string) ?? ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      dimensions: e.target.value,
                    }))
                  }
                />
              </div>
              <PhotoUpload
                label="Fotos da medição final"
                hint="Enviadas ao selecionar cada foto."
                osId={osId}
                scope="measurements"
                mode="instant"
                disabled={isLoading}
                onUrlsChange={setMeasurementPhotos}
              />
            </>
          )}

          {(nextStatus === "cortes" ||
            nextStatus === "embalagem" ||
            nextStatus === "acessorios_plano") && (
            <p className="text-sm text-muted-foreground">
              Conclua as etapas no checklist de produção (corte, embalagem e
              acessórios) antes de avançar.
            </p>
          )}

          {nextStatus === "transporte_perfil" && (
            <div className="space-y-2">
              <Label htmlFor="vehicleId">Veículo</Label>
              <Select
                id="vehicleId"
                required
                disabled={isLoading || vehicles.length === 0}
                className="h-10 py-2"
                value={(formData.vehicleId as string) ?? ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    vehicleId: e.target.value,
                  }))
                }
              >
                <option value="">
                  {vehicles.length === 0
                    ? "Nenhum veículo cadastrado"
                    : "Selecione o veículo"}
                </option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.description} — {v.plate}
                  </option>
                ))}
              </Select>
            </div>
          )}

          {(nextStatus === "transporte_estrutural" ||
            nextStatus === "transporte_perfis_total" ||
            nextStatus === "transporte_acessorios" ||
            nextStatus === "transporte_levar_vidro") && (
            <div className="grid grid-cols-2 gap-3">
              {TRANSPORT_FIELDS.map(({ key, label: fieldLabel }) => (
                <div key={key} className="flex items-center gap-2">
                  <Checkbox
                    id={`trans-${key}`}
                    checked={!!formData[key]}
                    onCheckedChange={(v) =>
                      setFormData((prev) => ({ ...prev, [key]: v === true }))
                    }
                  />
                  <Label htmlFor={`trans-${key}`} className="text-sm font-normal">
                    {fieldLabel}
                  </Label>
                </div>
              ))}
            </div>
          )}

          {nextStatus === "concluido" && (
            <>
              <PhotoUpload
                label="Fotos — antes da instalação"
                osId={osId}
                scope="installation"
                mode="instant"
                disabled={isLoading}
                onUrlsChange={setInstallPhotosBefore}
              />
              <PhotoUpload
                label="Fotos — depois da instalação"
                osId={osId}
                scope="installation"
                mode="instant"
                disabled={isLoading}
                onUrlsChange={setInstallPhotosAfter}
              />
            </>
          )}

          {needsBiometric && (
            <BiometricConfirmGate
              osId={osId}
              nextStatus={nextStatus}
              disabled={isLoading}
              onConfirmed={setBiometricConfirmation}
              onReset={() => setBiometricConfirmation(null)}
            />
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              placeholder="Detalhes importantes para esta etapa..."
              value={(formData.notes as string) ?? ""}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, notes: e.target.value }))
              }
            />
          </div>

          {result && !result.success && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Erro</AlertTitle>
              <AlertDescription>{result.message}</AlertDescription>
            </Alert>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={
              isLoading ||
              (needsBiometric && !biometricConfirmation) ||
              (needsVehicle && !formData.vehicleId)
            }
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar avanço
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

