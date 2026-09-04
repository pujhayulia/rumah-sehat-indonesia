"use client";

import { useState } from "react";

export function ShareLink() {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== "undefined" ? `${window.location.origin}/daftar` : "/daftar";

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard tidak tersedia — biarkan pengguna copy manual dari teksnya
    }
  }

  return (
    <div className="card flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Link Pendaftaran Publik</p>
        <p className="font-mono text-sm text-zinc-700 dark:text-zinc-300">{url}</p>
      </div>
      <button onClick={handleCopy} className="btn-secondary shrink-0">
        {copied ? "Tersalin!" : "Salin Link"}
      </button>
    </div>
  );
}
