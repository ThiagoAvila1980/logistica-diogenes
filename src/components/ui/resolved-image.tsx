"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { resolveUploadDisplayUrlAction } from "@/actions/upload-actions";
import {
  shouldResolveUploadUrlClientSide,
  toBrowserDisplayUrl,
} from "@/lib/upload/display-url-client";
import { cn } from "@/lib/utils";

type ResolvedImageProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  src: string;
  fallbackClassName?: string;
};

function isMockImageUrl(url: string): boolean {
  return url.trim().startsWith("mock://");
}

export function ResolvedImage({
  src,
  alt = "",
  className,
  fallbackClassName,
  ...props
}: ResolvedImageProps) {
  const trimmedSrc = src.trim();
  const mockUrl = isMockImageUrl(trimmedSrc);
  const useDirect =
    Boolean(trimmedSrc) &&
    !mockUrl &&
    !shouldResolveUploadUrlClientSide(trimmedSrc);

  const [displaySrc, setDisplaySrc] = useState<string | null>(() =>
    useDirect ? toBrowserDisplayUrl(trimmedSrc) : null,
  );
  const [loading, setLoading] = useState(
    () => Boolean(trimmedSrc) && !mockUrl && !useDirect,
  );
  const [failed, setFailed] = useState(mockUrl);
  const [signedFallbackAttempted, setSignedFallbackAttempted] = useState(false);

  const fetchResolvedUrl = useCallback(async (url: string) => {
    try {
      const resolved = await resolveUploadDisplayUrlAction(url);
      const next = resolved?.trim() ? toBrowserDisplayUrl(resolved) : null;
      setDisplaySrc(next);
      if (!next) setFailed(true);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setSignedFallbackAttempted(false);
    setFailed(mockUrl);

    if (!trimmedSrc) {
      setDisplaySrc(null);
      setLoading(false);
      return;
    }

    if (mockUrl) {
      setDisplaySrc(null);
      setLoading(false);
      return;
    }

    if (useDirect) {
      setDisplaySrc(toBrowserDisplayUrl(trimmedSrc));
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setDisplaySrc(null);

    void (async () => {
      try {
        const resolved = await resolveUploadDisplayUrlAction(trimmedSrc);
        if (cancelled) return;
        const next = resolved?.trim() ? toBrowserDisplayUrl(resolved) : null;
        setDisplaySrc(next);
        if (!next) setFailed(true);
      } catch {
        if (!cancelled) setFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [trimmedSrc, mockUrl, useDirect]);

  function handleImageError() {
    if (useDirect && !signedFallbackAttempted) {
      setSignedFallbackAttempted(true);
      setFailed(false);
      setLoading(true);
      void fetchResolvedUrl(trimmedSrc);
      return;
    }
    setFailed(true);
  }

  if (!trimmedSrc) {
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
      onError={handleImageError}
    />
  );
}
