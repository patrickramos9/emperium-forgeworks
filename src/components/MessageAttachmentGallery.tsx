import { useEffect, useState } from "react";
import { resolveMessageAttachmentUrl } from "@/lib/messageAttachmentUpload";

export function MessageAttachmentGallery({
  paths,
}: {
  paths: Array<string | null | undefined> | null | undefined;
}) {
  const [urls, setUrls] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    const list = (paths ?? [])
      .map((p) => (typeof p === "string" ? p.trim() : ""))
      .filter(Boolean);
    if (!list.length) {
      setUrls([]);
      return;
    }

    void (async () => {
      const resolved = await Promise.all(
        list.map((path) => resolveMessageAttachmentUrl(path)),
      );
      if (!cancelled) {
        setUrls(resolved.filter((url): url is string => Boolean(url)));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [paths?.join("|")]);

  if (!urls.length) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {urls.map((url) => (
        <a
          key={url}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="block max-w-full"
        >
          <img
            src={url}
            alt="Message attachment"
            className="max-h-56 max-w-full border border-outline-variant/30 object-contain"
          />
        </a>
      ))}
    </div>
  );
}
