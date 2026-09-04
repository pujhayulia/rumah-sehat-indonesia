"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Booking, BookingStatus } from "@/types/database";
import { updateBookingStatus } from "./actions";

const STATUS_LABEL: Record<BookingStatus, string> = {
  pending: "Menunggu",
  confirmed: "Dikonfirmasi",
  cancelled: "Dibatalkan",
  done: "Selesai",
};

const STATUS_BADGE: Record<BookingStatus, string> = {
  pending: "badge-orange",
  confirmed: "badge-active",
  cancelled: "badge-muted",
  done: "badge-active",
};

export type BookingRow = Booking & {
  services: { name: string } | null;
  branches: { name: string } | null;
};

export function BookingList({ bookings, showBranch }: { bookings: BookingRow[]; showBranch: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleUpdate(id: string, status: BookingStatus) {
    startTransition(async () => {
      await updateBookingStatus(id, status);
      router.refresh();
    });
  }

  function kunjunganLink(b: BookingRow) {
    const query = new URLSearchParams({ branch: b.branch_id, name: b.patient_name, bookingId: b.id });
    if (b.service_id) query.set("serviceId", b.service_id);
    return `/kunjungan?${query.toString()}`;
  }

  return (
    <div className="table-wrap">
      <table className="w-full text-sm">
        <thead>
          <tr className="table-head-row">
            <th className="px-4 py-2 font-medium">Tanggal</th>
            {showBranch && <th className="px-4 py-2 font-medium">Cabang</th>}
            <th className="px-4 py-2 font-medium">Pasien</th>
            <th className="px-4 py-2 font-medium">Kontak</th>
            <th className="px-4 py-2 font-medium">Layanan</th>
            <th className="px-4 py-2 font-medium">Status</th>
            <th className="px-4 py-2 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {bookings.length === 0 && (
            <tr>
              <td colSpan={showBranch ? 7 : 6} className="px-4 py-6 text-center text-zinc-400">
                Belum ada pendaftaran masuk.
              </td>
            </tr>
          )}
          {bookings.map((b) => (
            <tr key={b.id} className="table-row">
              <td className="px-4 py-2">{b.visit_date}</td>
              {showBranch && <td className="px-4 py-2 text-zinc-500">{b.branches?.name ?? "-"}</td>}
              <td className="px-4 py-2">
                {b.patient_name}
                {b.note && <span className="block text-xs text-zinc-400">{b.note}</span>}
              </td>
              <td className="px-4 py-2 text-zinc-500">{b.patient_phone}</td>
              <td className="px-4 py-2 text-zinc-500">{b.services?.name ?? "Bebas"}</td>
              <td className="px-4 py-2">
                <span className={`badge ${STATUS_BADGE[b.status]}`}>{STATUS_LABEL[b.status]}</span>
              </td>
              <td className="px-4 py-2 text-right">
                <div className="flex flex-wrap justify-end gap-2">
                  {b.status === "pending" && (
                    <>
                      <button
                        disabled={isPending}
                        onClick={() => handleUpdate(b.id, "confirmed")}
                        className="text-xs font-medium text-green-700 transition-colors hover:underline disabled:opacity-50 dark:text-green-400"
                      >
                        Konfirmasi
                      </button>
                      <button
                        disabled={isPending}
                        onClick={() => handleUpdate(b.id, "cancelled")}
                        className="btn-danger-text"
                      >
                        Batalkan
                      </button>
                    </>
                  )}
                  {b.status === "confirmed" && (
                    <>
                      <Link
                        href={kunjunganLink(b)}
                        className="text-xs font-medium text-orange-700 transition-colors hover:underline dark:text-orange-400"
                      >
                        Jadikan Kunjungan
                      </Link>
                      <button
                        disabled={isPending}
                        onClick={() => handleUpdate(b.id, "cancelled")}
                        className="btn-danger-text"
                      >
                        Batalkan
                      </button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
