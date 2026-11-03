"use client";

import { Fragment, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatRupiah } from "@/lib/format";
import type { Branch, Service, ServicePrice } from "@/types/database";
import { toggleServiceActive } from "./actions";
import { ServiceForm } from "./service-form";

export function ServiceList({
  services,
  prices,
  branches,
}: {
  services: Service[];
  prices: ServicePrice[];
  branches: Branch[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);

  function handleToggle(id: string, active: boolean) {
    startTransition(async () => {
      await toggleServiceActive(id, !active);
      router.refresh();
    });
  }

  const pricesFor = (serviceId: string) => prices.filter((p) => p.service_id === serviceId);
  const columnCount = 4 + branches.length;

  return (
    <div className="table-wrap">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="table-head-row">
              <th className="px-4 py-2 font-medium">Layanan</th>
              <th className="px-4 py-2 font-medium">Durasi</th>
              {branches.map((b) => (
                <th key={b.id} className="px-4 py-2 font-medium text-right">
                  {b.name}
                  <span className="block text-[11px] font-normal text-zinc-400">harga / fee</span>
                </th>
              ))}
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {services.map((s) => {
              const servicePrices = pricesFor(s.id);
              return (
                <Fragment key={s.id}>
                  <tr className="table-row">
                    <td className="px-4 py-2">{s.name}</td>
                    <td className="px-4 py-2 text-zinc-500">
                      {s.duration_minutes ? `${s.duration_minutes} menit` : "-"}
                    </td>
                    {branches.map((b) => {
                      const p = servicePrices.find((x) => x.branch_id === b.id);
                      return (
                        <td key={b.id} className="px-4 py-2 text-right whitespace-nowrap">
                          {p ? (
                            <>
                              {formatRupiah(p.price)}
                              <span className="block text-xs text-zinc-500">{formatRupiah(p.commission_amount)}</span>
                            </>
                          ) : (
                            <span className="text-xs text-zinc-400">Tidak tersedia</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-4 py-2">
                      <span className={`badge ${s.active ? "badge-active" : "badge-muted"}`}>
                        {s.active ? "Aktif" : "Non-aktif"}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right whitespace-nowrap">
                      <button
                        onClick={() => setEditingId(editingId === s.id ? null : s.id)}
                        className="mr-3 text-xs font-medium text-orange-700 hover:underline dark:text-orange-300"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleToggle(s.id, s.active)}
                        disabled={isPending}
                        className="text-xs font-medium text-zinc-500 transition-colors hover:text-orange-700 hover:underline disabled:opacity-50 dark:hover:text-orange-300"
                      >
                        {s.active ? "Nonaktifkan" : "Aktifkan"}
                      </button>
                    </td>
                  </tr>
                  {editingId === s.id && (
                    <tr>
                      <td colSpan={columnCount} className="bg-orange-50/30 px-4 py-4 dark:bg-zinc-950">
                        <ServiceForm
                          branches={branches}
                          service={s}
                          prices={servicePrices}
                          onDone={() => setEditingId(null)}
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
