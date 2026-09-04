"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createBranch } from "./actions";

export function BranchForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setError(null);

    startTransition(async () => {
      const result = await createBranch({ name });
      if (result.error) {
        setError(result.error);
        return;
      }
      setName("");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
      <div className="flex-1">
        <label className="field-label">Nama Cabang</label>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="mis. Bintaro"
          className="field-input"
        />
      </div>
      {error && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:bg-rose-950/30 dark:text-rose-400">
          {error}
        </p>
      )}
      <button type="submit" disabled={isPending} className="btn-primary">
        {isPending ? "Menyimpan..." : "Tambah Cabang"}
      </button>
    </form>
  );
}
