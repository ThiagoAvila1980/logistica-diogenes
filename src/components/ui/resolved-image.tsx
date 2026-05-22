"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { resolveUploadDisplayUrlAction } from "@/actions/upload-actions";
import { cn } from "@/lib/utils";

type ResolvedImageProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  src: string;
  fallbackClassName?: string;
};

function needsRemoteResolve(url: string): boolean {
  return url.startsWith("http://") || url.startsWith("https://");
}

export function ResolvedImage({
  src,
  alt = "",
  className,
  fallbackClassName,
  ...props
}: ResolvedImageProps) {
  const [displaySrc, setDisplaySrc] = useState<string | null>(() =>
    src && !needsRemoteResolve(src) ? src : null,
  );
  const [loading, setLoading] = useState(
    () => Boolean(src && needsRemoteResolve(src)),
  );
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);

    if (!src) {
      setDisplaySrc(null);
      setLoading(false);
      return;
    }

    if (!needsRemoteResolve(src)) {
      setDisplaySrc(src);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setDisplaySrc(null);

    void resolveUploadDisplayUrlAction(src)
      .then((resolved) => {
        if (cancelled) return;
        setDisplaySrc(resolved);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setFailed(true);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [src]);

  if (!src) {
    return null;
  }

  if (loading) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-lg border border-dashed bg-muted/30 text-muted-foreground",
          className,
          fallbackClassName,
        )}
      >
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
      </div>
    );
  }

  if (!displaySrc || failed) {
    return (
      <p
        className={cn(
          "rounded-lg border border-dashed bg-muted/30 px-3 py-6 text-center text-sm text-muted-foreground",
          fallbackClassName,
        )}
      >
        Imagem indisponível
      </p>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      {...props}
      src={displaySrc}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
