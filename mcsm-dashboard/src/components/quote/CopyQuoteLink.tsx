"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";

export default function CopyQuoteLink({ token }: { token: string }) {
  const path = `/quote/${token}`;
  const [shown, setShown] = useState(path);
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  async function copy() {
    const full = `${window.location.origin}${path}`;
    setShown(full);
    try {
      await navigator.clipboard.writeText(full);
      setCopied(true);
      setFailed(false);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setFailed(true);
    }
  }

  return (
    <div className="mt-4 flex flex-col gap-1">
      <label htmlFor={`link-${token}`} className="text-sm font-medium">
        Customer link
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <input
          id={`link-${token}`}
          readOnly
          value={shown}
          onFocus={(e) => e.currentTarget.select()}
          className="min-w-0 flex-1 rounded-md border border-input bg-muted px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={copy}
          className="flex cursor-pointer items-center gap-2 rounded-md border border-input px-3 py-2 text-sm hover:border-primary"
        >
          {copied ? (
            <Check size={16} aria-hidden="true" />
          ) : (
            <Copy size={16} aria-hidden="true" />
          )}
          {copied ? "Copied" : "Copy link"}
        </button>
        <a
          href={path}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-md border border-input px-3 py-2 text-sm hover:border-primary"
        >
          <ExternalLink size={16} aria-hidden="true" />
          Open
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      </div>
      {failed && (
        <p role="alert" className="text-sm text-destructive">
          Could not copy automatically. Select the link above and copy it
          manually.
        </p>
      )}
    </div>
  );
}
