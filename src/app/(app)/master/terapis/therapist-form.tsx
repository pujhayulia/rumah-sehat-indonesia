"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Branch, Therapist } from "@/types/database";
import { createTherapist, updateTherapist } from "./actions";

// Dipakai untuk tambah terapis baru, dan untuk edit kalau `therapist` diisi.
export function TherapistForm({
  branches,
  therapist,
  onDone,
}: {
  branches: Branch[];
  therapist?: Therapist;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(therapist?.name ?? "");
  const [phone, setPhone] = useState(therapist?.phone ?? "");
  const [branchId, setBranchId] = useState(therapist?.branch_id ?? branches[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !branchId) return;
    setError(null);

    startTransition(async () => {
      const input = { name: name.trim(), phone, branchId };
      const result = therapist ? await updateTherapist(therapist.id, input) : await createTherapist(input);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (!therapist) {
        setName("");
        setPhone("");
      }
      router.refresh();
      onDone?.();
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`flex flex-col gap-3 sm:flex-row sm:items-end ${therapist ? "" : "card p-4"}`}
    >
      <div className="flex-1">
        <label className="field-label">Nama Terapis</label>
        <input required value={name} onChange={(e) => setName(e.target.value)} className="field-input" />
      </div>
      <div className="flex-1">
        <label className="field-label">Cabang</label>
        <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className="field-input">
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex-1">
        <label className="field-label">No. HP (opsional)</label>
        <input value={phone} onChange={(e) => setPhone(e.target.value)} className="field-input" />
      </div>
      {error && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:bg-rose-950/30 dark:text-rose-400">
          {error}
        </p>
      )}
      <button type="submit" disabled={isPending} className="btn-primary">
        {isPending ? "Menyimpan..." : therapist ? "Simpan" : "Tambah Terapis"}
      </button>
      {therapist && (
        <button type="button" onClick={onDone} disabled={isPending} className="btn-secondary">
          Batal
        </button>
      )}
    </form>
  );
}
