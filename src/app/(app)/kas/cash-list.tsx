"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatRupiah } from "@/lib/format";
import type { CashTransaction } from "@/types/database";
import { deleteCashEntry } from "./actions";

const CATEGORY_LABEL: Record<string, string> = {
  service_income: "Pemasukan Layanan",
  commission_payout: "Komisi Terapis",
  meal_allowance: "Uang Makan",
  operational: "Operasional",
  other: "Lainnya",
};

type CashRow = CashTransaction & { therapists: { name: string } | null; branches: { name: string } | null };

export function CashList({
  entries,
  showBranch,
  showDate,
}: {
  entries: CashRow[];
  showBranch: boolean;
  showDate: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete(id: string) {
    if (!confirm("Hapus catatan kas ini?")) return;
    startTransition(async () => {
      await deleteCashEntry(id);
      router.refresh();
    });
  }

  return (
    <div className="table-wrap">
      <table className="w-full text-sm">
        <thead>
          <tr className="table-head-row">
            {showDate && <th className="px-4 py-2 font-medium">Tanggal</th>}
            {showBranch && <th className="px-4 py-2 font-medium">Cabang</th>}
            <th className="px-4 py-2 font-medium">Kategori</th>
            <th className="px-4 py-2 font-medium">Keterangan</th>
            <th className="px-4 py-2 font-medium">Terapis</th>
            <th className="px-4 py-2 font-medium text-right">Nominal</th>
            <th className="px-4 py-2 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {entries.length === 0 && (
            <tr>
              <td
                colSpan={5 + (showBranch ? 1 : 0) + (showDate ? 1 : 0)}
                className="px-4 py-6 text-center text-zinc-400"
              >
                Belum ada transaksi kas pada rentang ini.
              </td>
            </tr>
          )}
          {entries.map((e) => (
            <tr key={e.id} className="table-row">
              {showDate && <td className="px-4 py-2 text-zinc-500">{e.transaction_date}</td>}
              {showBranch && <td className="px-4 py-2 text-zinc-500">{e.branches?.name ?? "-"}</td>}
              <td className="px-4 py-2">{CATEGORY_LABEL[e.category] ?? e.category}</td>
              <td className="px-4 py-2 text-zinc-500">{e.description ?? "-"}</td>
              <td className="px-4 py-2">{e.therapists?.name ?? "-"}</td>
              <td className={`px-4 py-2 text-right font-medium ${e.type === "income" ? "text-emerald-600" : "text-rose-600"}`}>
                {e.type === "income" ? "+" : "-"} {formatRupiah(e.amount)}
              </td>
              <td className="px-4 py-2 text-right">
                {!e.visit_id && (
                  <button onClick={() => handleDelete(e.id)} disabled={isPending} className="btn-danger-text">
                    Hapus
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
