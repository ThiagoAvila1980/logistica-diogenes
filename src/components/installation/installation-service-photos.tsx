"use client";

import { useCallback, useRef, useState } from "react";
import { Camera, CheckCircle2, Loader2 } from "lucide-react";
import { saveInstallationServicePhotos } from "@/actions/installation-actions";
import { PhotoUpload } from "@/components/ui/photo-upload";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { filterDisplayableUploadUrls } from "@/lib/upload/displayable-url";

type Props = {
  osId: string;
  initialPhotos?: string[];
};

export function InstallationServicePhotos({
  osId,
  initialPhotos = [],
}: Props) {
  const [photos, setPhotos] = useState(() =>
    filterDisplayableUploadUrls(initialPhotos),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSave = useRef<string[] | null>(null);

  const persistPhotos = useCallback(
    async (urls: string[]) => {
      pendingSave.current = urls;
      setSaving(true);
      setError(null);
      setSaved(false);

      const result = await saveInstallationServicePhotos(osId, urls);

      if (pendingSave.current !== urls) return;

      setSaving(false);
      if (result.success) {
        setPhotos(urls);
        setSaved(true);
      } else {
        setError(result.message);
      }
    },
    [osId],
  );

  const handleUrlsChange = useCallback(
    (urls: string[]) => {
      setPhotos(urls);
      setSaved(false);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        void persistPhotos(urls);
      }, 400);
    },
    [persistPhotos],
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Camera className="h-4 w-4 text-success" />
          Fotos do serviço
          {saving && (
            <Loader2 className="ml-auto h-4 w-4 animate-spin text-muted-foreground" />
          )}
          {!saving && saved && (
            <CheckCircle2 className="ml-auto h-4 w-4 text-success" />
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <PhotoUpload
          hint="Registre fotos da obra durante a instalação. Enviadas automaticamente ao selecionar."
          osId={osId}
          scope="installation"
          existingUrls={photos}
          mode="instant"
          disabled={saving}
          showLabel={false}
          onUrlsChange={handleUrlsChange}
        />
      </CardContent>
    </Card>
  );
}
