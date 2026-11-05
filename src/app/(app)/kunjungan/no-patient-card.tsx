"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { NoPatientDay } from "@/types/database";
import { markNoPatientDay, unmarkNoPatientDay } from "./actions";

// Untuk hari tanpa pasien sama sekali: resepsionis menandainya supaya
// laporan bisa membedakan "memang sepi" dengan "lupa diisi".
export function NoPatientCard({
  branchId,
  branchName,
  day,
  isToday,
  existing,
}: {
  branchId: string;
  branchName: string;
  day: string;
  isToday: boolean;
  existing: NoPatientDay | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleMark(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await markNoPatientDay({ branchId, day, note });
      if (result.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
      setNote("");
      router.refresh();
    });
  }

  function handleUnmark() {
    if (!existing) return;
    startTransition(async () => {
      const result = await unmarkNoPatientDay(existing.id);
      if (result.error) setError(result.error);
      router.refresh();
    });
  }

  if (existing) {
    return (
      <div className="card flex flex-wrap items-center justify-between gap-3 border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
        <div>
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
            {isToday ? "Hari ini" : "Tanggal ini"} ditandai: tidak ada pasien ({branchName})
          </p>
          <p className="text-xs text-amber-700/80 dark:text-amber-400/80">
            {existing.note ? `Catatan: ${existing.note}` : "Tanpa catatan."} Tanda ini otomatis hilang kalau ada
            kunjungan yang disimpan.
          </p>
        </div>
        <button onClick={handleUnmark} disabled={isPending} className="btn-secondary shrink-0 px-3 py-1.5 text-xs">
          {isPending ? "Memproses..." : "Batalkan tanda"}
        </button>
        {error && <p className="w-full text-sm text-rose-600">{error}</p>}
      </div>
    );
  }

  if (!open) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-dashed border-orange-200 px-4 py-3 text-sm text-zinc-500 dark:border-zinc-800">
        <span>Belum ada pasien di {branchName} {isToday ? "hari ini" : "pada tanggal ini"}?</span>
        <button onClick={() => setOpen(true)} className="btn-secondary shrink-0 px-3 py-1.5 text-xs">
          Tandai: tidak ada pasien {isToday ? "hari ini" : "tanggal ini"}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleMark} className="card flex flex-col gap-3 p-4">
      <div>
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Tidak ada pasien {isToday ? "hari ini" : "tanggal ini"}
        </h2>
        <p className="text-xs text-zinc-500">Tanggal ini tetap tercatat di laporan {branchName} dengan 0 pasien.</p>
      </div>
      <div>
        <label className="field-label">Catatan (opsional)</label>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="mis. hujan deras, libur, terapis sakit"
          className="field-input"
        />
      </div>
      {error && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:bg-rose-950/30 dark:text-rose-400">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button type="submit" disabled={isPending} className="btn-primary">
          {isPending ? "Menyimpan..." : "Simpan"}
        </button>
        <button type="button" onClick={() => setOpen(false)} disabled={isPending} className="btn-secondary">
          Batal
        </button>
      </div>
    </form>
  );
}
