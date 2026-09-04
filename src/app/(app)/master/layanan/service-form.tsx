"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createService } from "./actions";

export function ServiceForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [duration, setDuration] = useState("");
  const [price, setPrice] = useState("");
  const [commission, setCommission] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !price) return;
    setError(null);

    startTransition(async () => {
      const result = await createService({
        name,
        durationMinutes: duration ? Number(duration) : null,
        price: Number(price),
        commissionAmount: commission ? Number(commission) : 0,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setName("");
      setDuration("");
      setPrice("");
      setCommission("");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="card grid grid-cols-1 gap-3 p-4 sm:grid-cols-4">
      <div className="sm:col-span-4">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Tambah Jenis Layanan</h2>
      </div>
      <div>
        <label className="field-label">Nama Layanan</label>
        <input required value={name} onChange={(e) => setName(e.target.value)} className="field-input" />
      </div>
      <div>
        <label className="field-label">Durasi (menit)</label>
        <input
          type="number"
          min={0}
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          className="field-input"
        />
      </div>
      <div>
        <label className="field-label">Harga (Rp)</label>
        <input
          type="number"
          min={0}
          required
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="field-input"
        />
      </div>
      <div>
        <label className="field-label">Komisi Terapis (Rp)</label>
        <input
          type="number"
          min={0}
          value={commission}
          onChange={(e) => setCommission(e.target.value)}
          className="field-input"
        />
      </div>
      {error && (
        <p className="sm:col-span-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:bg-rose-950/30 dark:text-rose-400">
          {error}
        </p>
      )}
      <div className="sm:col-span-4">
        <button type="submit" disabled={isPending} className="btn-primary">
          {isPending ? "Menyimpan..." : "Tambah Layanan"}
        </button>
      </div>
    </form>
  );
}
