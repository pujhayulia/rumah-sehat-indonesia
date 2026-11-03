"use client";

import { Fragment, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Branch, Therapist } from "@/types/database";
import { toggleTherapistActive } from "./actions";
import { TherapistForm } from "./therapist-form";

export function TherapistList({ therapists, branches }: { therapists: Therapist[]; branches: Branch[] }) {
  const branchName = (id: string) => branches.find((b) => b.id === id)?.name ?? "-";
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);

  function handleToggle(id: string, active: boolean) {
    startTransition(async () => {
      await toggleTherapistActive(id, !active);
      router.refresh();
    });
  }

  return (
    <div className="table-wrap">
      <table className="w-full text-sm">
        <thead>
          <tr className="table-head-row">
            <th className="px-4 py-2 font-medium">Nama</th>
            <th className="px-4 py-2 font-medium">Cabang</th>
            <th className="px-4 py-2 font-medium">No. HP</th>
            <th className="px-4 py-2 font-medium">Status</th>
            <th className="px-4 py-2 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {therapists.map((t) => (
            <Fragment key={t.id}>
            <tr className="table-row">
              <td className="px-4 py-2">{t.name}</td>
              <td className="px-4 py-2 text-zinc-500">{branchName(t.branch_id)}</td>
              <td className="px-4 py-2 text-zinc-500">{t.phone ?? "-"}</td>
              <td className="px-4 py-2">
                <span className={`badge ${t.active ? "badge-active" : "badge-muted"}`}>
                  {t.active ? "Aktif" : "Non-aktif"}
                </span>
              </td>
              <td className="px-4 py-2 text-right whitespace-nowrap">
                <button
                  onClick={() => setEditingId(editingId === t.id ? null : t.id)}
                  className="mr-3 text-xs font-medium text-orange-700 hover:underline dark:text-orange-300"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleToggle(t.id, t.active)}
                  disabled={isPending}
                  className="text-xs font-medium text-zinc-500 transition-colors hover:text-orange-700 hover:underline disabled:opacity-50 dark:hover:text-orange-300"
                >
                  {t.active ? "Nonaktifkan" : "Aktifkan"}
                </button>
              </td>
            </tr>
            {editingId === t.id && (
              <tr>
                <td colSpan={5} className="bg-orange-50/30 px-4 py-4 dark:bg-zinc-950">
                  <TherapistForm branches={branches} therapist={t} onDone={() => setEditingId(null)} />
                </td>
              </tr>
            )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
