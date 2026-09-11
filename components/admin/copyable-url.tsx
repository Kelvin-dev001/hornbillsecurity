"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

/**
 * The image URL, with one-tap copy.
 *
 * The whole workflow is "upload a photo, paste its URL into an item" — asking
 * the owner to select a long URL by hand on a phone is where that workflow
 * stops. Falls back to a selectable input when the clipboard API is unavailable,
 * which it is on http origins other than localhost.
 */
export function CopyableUrl({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // No clipboard permission. The input below is still selectable.
    }
  }

  return (
    <div className="flex items-center gap-1">
      <input
        readOnly
        value={url}
        onFocus={(event) => event.currentTarget.select()}
        aria-label="Image URL"
        className="min-w-0 flex-1 rounded-control border border-line-control bg-paper-warm px-2 py-1 font-mono text-[0.7rem] text-muted-foreground"
      />
      <button
        type="button"
        onClick={copy}
        aria-label="Copy the image URL"
        className="flex size-8 shrink-0 items-center justify-center rounded-control border border-line text-muted-foreground transition-colors hover:border-ink hover:text-ink"
      >
        {copied ? (
          <Check className="size-3.5 text-success" aria-hidden="true" />
        ) : (
          <Copy className="size-3.5" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
