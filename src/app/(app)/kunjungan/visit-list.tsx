"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatRupiah } from "@/lib/format";
import type { Visit } from "@/types/database";
import { deleteVisit } from "./actions";

export type VisitRow = Visit & {
  therapists: { name: string } | null;
  services: { name: string } | null;
  branches: { name: string } | null;
};

export function VisitList({
  visits,
  showBranch,
  emptyText = "Belum ada kunjungan hari ini.",
}: {
  visits: VisitRow[];
  showBranch: boolean;
  emptyText?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete(id: string) {
    if (!confirm("Hapus kunjungan ini? Pemasukan & komisi terkait juga akan terhapus.")) return;
    startTransition(async () => {
      await deleteVisit(id);
      router.refresh();
    });
  }

  return (
    <div className="table-wrap">
      <table className="w-full text-sm">
        <thead>
          <tr className="table-head-row">
            {showBranch && <th className="px-4 py-2 font-medium">Cabang</th>}
            <th className="px-4 py-2 font-medium">Pasien</th>
            <th className="px-4 py-2 font-medium">Umur</th>
            <th className="px-4 py-2 font-medium">Terapis</th>
            <th className="px-4 py-2 font-medium">Layanan</th>
            <th className="px-4 py-2 font-medium">Bayar</th>
            <th className="px-4 py-2 font-medium text-right">Harga</th>
            <th className="px-4 py-2 font-medium text-right">Komisi</th>
            <th className="px-4 py-2 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {visits.length === 0 && (
            <tr>
              <td colSpan={showBranch ? 9 : 8} className="px-4 py-6 text-center text-zinc-400">
                {emptyText}
              </td>
            </tr>
          )}
          {visits.map((v) => (
            <tr key={v.id} className="table-row">
              {showBranch && <td className="px-4 py-2 text-zinc-500">{v.branches?.name ?? "-"}</td>}
              <td className="px-4 py-2">
                {v.patient_name}
                {v.is_special && <span className="badge badge-orange ml-2">Istimewa</span>}
              </td>
              <td className="px-4 py-2">{v.age ?? "-"}</td>
              <td className="px-4 py-2">{v.therapists?.name ?? "-"}</td>
              <td className="px-4 py-2">
                {v.services?.name ?? "-"}
                {v.note && <span className="block text-xs text-zinc-400">{v.note}</span>}
              </td>
              <td className="px-4 py-2">
                <span className={`badge ${v.payment_method === "qris" ? "badge-orange" : "badge-muted"}`}>
                  {v.payment_method}
                </span>
              </td>
              <td className="px-4 py-2 text-right">{formatRupiah(v.price)}</td>
              <td className="px-4 py-2 text-right text-zinc-500">{formatRupiah(v.commission_amount)}</td>
              <td className="px-4 py-2 text-right">
                <button onClick={() => handleDelete(v.id)} disabled={isPending} className="btn-danger-text">
                  Hapus
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
