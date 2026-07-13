"use client";

import { useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import { updateItemDrawingAction } from "@/actions/cutting-actions";
import { DrawingEditorModal } from "@/components/field/drawing-editor-modal";
import { DrawingPreview } from "@/components/production/drawing-preview";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

type EditableDrawingPreviewProps = {
  osId: string;
  itemId: string;
  drawingId: string;
  drawingNumber: number;
  src: string;
  alt: string;
  canEdit?: boolean;
  onDrawingUpdated?: (drawingId: string, url: string) => void;
};

export function EditableDrawingPreview({
  osId,
  itemId,
  drawingId,
  drawingNumber,
  src,
  alt,
  canEdit = false,
  onDrawingUpdated,
}: EditableDrawingPreviewProps) {
  const [displaySrc, setDisplaySrc] = useState(src);
  const [editorOpen, setEditorOpen] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDisplaySrc(src);
  }, [src]);

  async function handleSave(base64: string) {
    setSaving(true);
    setError(null);

    const result = await updateItemDrawingAction({
      osId,
      itemId,
      drawingId,
      imageDataUrl: base64,
    });

    if (result.success) {
      setDisplaySrc(result.url);
      onDrawingUpdated?.(drawingId, result.url);
      setIsDirty(false);
      setEditorOpen(false);
    } else {
      setError(result.message);
    }

    setSaving(false);
  }

  return (
    <>
      <div className="relative">
        <DrawingPreview src={displaySrc} alt={alt} />
        {canEdit && (
          <Button
            type="button"
            size="icon"
            variant="secondary"
            className="absolute right-2 top-2 z-10 h-8 w-8 shadow-md"
            onClick={() => {
              setError(null);
              setEditorOpen(true);
            }}
            aria-label={`Editar ${alt}`}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {error && !editorOpen && (
        <Alert variant="destructive" className="mx-4 mt-2">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {editorOpen && (
        <>
          <DrawingEditorModal
            drawingId={drawingId}
            drawingNumber={drawingNumber}
            isNew={false}
            initialImageUrl={displaySrc}
            isDirty={isDirty}
            disabled={saving}
            onSave={handleSave}
            onDirtyChange={setIsDirty}
            onClose={() => {
              if (!saving) setEditorOpen(false);
            }}
          />
          {error && (
            <div className="fixed bottom-4 left-1/2 z-[210] w-[min(92vw,420px)] -translate-x-1/2">
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </div>
          )}
        </>
      )}
    </>
  );
}
