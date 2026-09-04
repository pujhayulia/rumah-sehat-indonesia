"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Branch, Therapist, TransactionCategory, TransactionType } from "@/types/database";
import { createCashEntry } from "./actions";

const EXPENSE_CATEGORIES: { value: TransactionCategory; label: string }[] = [
  { value: "meal_allowance", label: "Uang Makan Terapis" },
  { value: "operational", label: "Operasional (ATK, kebersihan, dll)" },
  { value: "other", label: "Lainnya" },
];

const INCOME_CATEGORIES: { value: TransactionCategory; label: string }[] = [
  { value: "other", label: "Pemasukan Lainnya" },
];

export function CashForm({
  branches,
  lockedBranch,
  defaultBranchId,
  therapists,
}: {
  branches: Branch[];
  lockedBranch: { id: string; name: string } | null;
  defaultBranchId: string | null;
  therapists: Therapist[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [branchId, setBranchId] = useState(lockedBranch?.id ?? defaultBranchId ?? branches[0]?.id ?? "");
  const therapistsInBranch = useMemo(
    () => therapists.filter((t) => t.branch_id === branchId),
    [therapists, branchId]
  );

  const [type, setType] = useState<TransactionType>("expense");
  const [category, setCategory] = useState<TransactionCategory>("meal_allowance");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [therapistId, setTherapistId] = useState("");

  const categories = type === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount || Number(amount) <= 0 || !branchId) {
      setError("Cabang dan nominal harus diisi.");
      return;
    }
    setError(null);

    startTransition(async () => {
      const result = await createCashEntry({
        branchId,
        type,
        category,
        amount: Number(amount),
        description,
        therapistId: therapistId || null,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      setAmount("");
      setDescription("");
      setTherapistId("");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="card grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Catat Kas Manual</h2>
      </div>

      <div className="sm:col-span-2">
        <label className="field-label">Cabang</label>
        {lockedBranch ? (
          <div className="rounded-lg border border-orange-100 bg-orange-50/60 px-3 py-2 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
            {lockedBranch.name}
          </div>
        ) : (
          <select
            value={branchId}
            onChange={(e) => {
              setBranchId(e.target.value);
              setTherapistId("");
            }}
            className="field-input"
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div>
        <label className="field-label">Jenis</label>
        <div className="flex gap-2">
          {(["expense", "income"] as const).map((t) => (
            <button
              type="button"
              key={t}
              onClick={() => {
                setType(t);
                setCategory(t === "expense" ? "meal_allowance" : "other");
              }}
              className={`toggle-btn flex-1 normal-case ${
                type === t ? "toggle-btn-active" : "toggle-btn-inactive"
              }`}
            >
              {t === "expense" ? "Pengeluaran" : "Pemasukan"}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="field-label">Kategori</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as TransactionCategory)}
          className="field-input"
        >
          {categories.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {category === "meal_allowance" && (
        <div>
          <label className="field-label">Terapis</label>
          <select value={therapistId} onChange={(e) => setTherapistId(e.target.value)} className="field-input">
            <option value="">Pilih terapis</option>
            {therapistsInBranch.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="field-label">Nominal (Rp)</label>
        <input
          type="number"
          min={0}
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="field-input"
        />
      </div>

      <div className="sm:col-span-2">
        <label className="field-label">Keterangan</label>
        <input value={description} onChange={(e) => setDescription(e.target.value)} className="field-input" />
      </div>

      {error && (
        <p className="sm:col-span-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:bg-rose-950/30 dark:text-rose-400">
          {error}
        </p>
      )}

      <div className="sm:col-span-2">
        <button type="submit" disabled={isPending} className="btn-primary">
          {isPending ? "Menyimpan..." : "Simpan"}
        </button>
      </div>
    </form>
  );
}
