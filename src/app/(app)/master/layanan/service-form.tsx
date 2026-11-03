"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Branch, Service, ServicePrice } from "@/types/database";
import { createService, updateService } from "./actions";

interface PriceField {
  price: string;
  commission: string;
}

// Dipakai untuk tambah layanan baru, dan untuk edit kalau `service` diisi.
export function ServiceForm({
  branches,
  service,
  prices = [],
  onDone,
}: {
  branches: Branch[];
  service?: Service;
  prices?: ServicePrice[];
  onDone?: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isEdit = Boolean(service);

  const [name, setName] = useState(service?.name ?? "");
  const [duration, setDuration] = useState(service?.duration_minutes ? String(service.duration_minutes) : "");
  const [priceFields, setPriceFields] = useState<Record<string, PriceField>>(() =>
    Object.fromEntries(
      branches.map((b) => {
        const existing = prices.find((p) => p.branch_id === b.id);
        return [
          b.id,
          {
            price: existing ? String(existing.price) : "",
            commission: existing ? String(existing.commission_amount) : "",
          },
        ];
      })
    )
  );
  const [error, setError] = useState<string | null>(null);

  function updatePriceField(branchId: string, patch: Partial<PriceField>) {
    setPriceFields((prev) => ({ ...prev, [branchId]: { ...prev[branchId], ...patch } }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    const input = {
      name: name.trim(),
      durationMinutes: duration ? Number(duration) : null,
      prices: branches.map((b) => {
        const field = priceFields[b.id];
        return {
          branchId: b.id,
          price: field.price === "" ? null : Number(field.price),
          commissionAmount: field.commission === "" ? 0 : Number(field.commission),
        };
      }),
    };

    if (input.prices.every((p) => p.price === null)) {
      setError("Isi harga minimal untuk satu cabang.");
      return;
    }
    setError(null);

    startTransition(async () => {
      const result = service ? await updateService(service.id, input) : await createService(input);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (!isEdit) {
        setName("");
        setDuration("");
        setPriceFields(Object.fromEntries(branches.map((b) => [b.id, { price: "", commission: "" }])));
      }
      router.refresh();
      onDone?.();
    });
  }

  return (
    <form onSubmit={handleSubmit} className={`flex flex-col gap-3 ${isEdit ? "" : "card p-4"}`}>
      {!isEdit && <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Tambah Jenis Layanan</h2>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
      </div>

      <div>
        <p className="field-label">Harga &amp; fee terapis per cabang</p>
        <p className="mb-2 text-xs text-zinc-500">Kosongkan harga kalau layanan ini tidak ada di cabang tersebut.</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {branches.map((b) => (
            <div
              key={b.id}
              className="rounded-xl border border-orange-100 bg-orange-50/40 p-3 dark:border-zinc-800 dark:bg-zinc-950"
            >
              <p className="mb-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300">{b.name}</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-zinc-500">Harga (Rp)</label>
                  <input
                    type="number"
                    min={0}
                    value={priceFields[b.id]?.price ?? ""}
                    onChange={(e) => updatePriceField(b.id, { price: e.target.value })}
                    placeholder="Tidak tersedia"
                    className="field-input bg-white px-2 py-1.5 dark:bg-zinc-900"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-zinc-500">Fee terapis (Rp)</label>
                  <input
                    type="number"
                    min={0}
                    value={priceFields[b.id]?.commission ?? ""}
                    onChange={(e) => updatePriceField(b.id, { commission: e.target.value })}
                    disabled={priceFields[b.id]?.price === ""}
                    className="field-input bg-white px-2 py-1.5 disabled:opacity-50 dark:bg-zinc-900"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:bg-rose-950/30 dark:text-rose-400">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <button type="submit" disabled={isPending} className="btn-primary">
          {isPending ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Tambah Layanan"}
        </button>
        {isEdit && (
          <button type="button" onClick={onDone} disabled={isPending} className="btn-secondary">
            Batal
          </button>
        )}
      </div>
    </form>
  );
}
