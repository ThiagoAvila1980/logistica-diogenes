import { StickyNote } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Props = {
  notes: string | null;
  className?: string;
};

export function MeasurementNotesCard({ notes, className }: Props) {
  if (!notes?.trim()) return null;

  return (
    <Card
      className={cn(
        "border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-900/10",
        className,
      )}
    >
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <StickyNote className="h-4 w-4 text-amber-600" />
          Observações da medição
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="whitespace-pre-wrap text-sm text-muted-foreground">
          {notes.trim()}
        </p>
      </CardContent>
    </Card>
  );
}
