"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Branch } from "@/types/database";
import { createTherapist } from "./actions";

export function TherapistForm({ branches }: { branches: Branch[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [branchId, setBranchId] = useState(branches[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !branchId) return;
    setError(null);

    startTransition(async () => {
      const result = await createTherapist({ name, phone, branchId });
      if (result.error) {
        setError(result.error);
        return;
      }
      setName("");
      setPhone("");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
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
        {isPending ? "Menyimpan..." : "Tambah Terapis"}
      </button>
    </form>
  );
}
