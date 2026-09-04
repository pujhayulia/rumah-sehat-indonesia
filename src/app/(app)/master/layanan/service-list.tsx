"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatRupiah } from "@/lib/format";
import type { Service } from "@/types/database";
import { toggleServiceActive } from "./actions";

export function ServiceList({ services }: { services: Service[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleToggle(id: string, active: boolean) {
    startTransition(async () => {
      await toggleServiceActive(id, !active);
      router.refresh();
    });
  }

  return (
    <div className="table-wrap">
      <table className="w-full text-sm">
        <thead>
          <tr className="table-head-row">
            <th className="px-4 py-2 font-medium">Layanan</th>
            <th className="px-4 py-2 font-medium">Durasi</th>
            <th className="px-4 py-2 font-medium text-right">Harga</th>
            <th className="px-4 py-2 font-medium text-right">Komisi</th>
            <th className="px-4 py-2 font-medium">Status</th>
            <th className="px-4 py-2 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {services.map((s) => (
            <tr key={s.id} className="table-row">
              <td className="px-4 py-2">{s.name}</td>
              <td className="px-4 py-2 text-zinc-500">{s.duration_minutes ? `${s.duration_minutes} menit` : "-"}</td>
              <td className="px-4 py-2 text-right">{formatRupiah(s.price)}</td>
              <td className="px-4 py-2 text-right text-zinc-500">{formatRupiah(s.commission_amount)}</td>
              <td className="px-4 py-2">
                <span className={`badge ${s.active ? "badge-active" : "badge-muted"}`}>
                  {s.active ? "Aktif" : "Non-aktif"}
                </span>
              </td>
              <td className="px-4 py-2 text-right">
                <button
                  onClick={() => handleToggle(s.id, s.active)}
                  disabled={isPending}
                  className="text-xs font-medium text-zinc-500 transition-colors hover:text-orange-700 hover:underline disabled:opacity-50 dark:hover:text-orange-300"
                >
                  {s.active ? "Nonaktifkan" : "Aktifkan"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
