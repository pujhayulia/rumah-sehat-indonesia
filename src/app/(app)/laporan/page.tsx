import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { resolveBranchSelection } from "@/lib/branch";
import { formatRupiah } from "@/lib/format";
import type { DailySummary } from "@/types/database";

function toDateInput(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default async function LaporanPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; branch?: string }>;
}) {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const params = await searchParams;
  const selection = resolveBranchSelection(profile, params);

  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(today.getDate() - 6);

  const from = params.from || toDateInput(weekAgo);
  const to = params.to || toDateInput(today);

  const supabase = await createClient();

  let summaryQuery = supabase
    .from("daily_summary")
    .select("*")
    .gte("transaction_date", from)
    .lte("transaction_date", to)
    .order("transaction_date", { ascending: false });

  let commissionQuery = supabase
    .from("visits")
    .select("commission_amount, therapists(name)")
    .gte("visit_date", from)
    .lte("visit_date", to);

  if (selection.branchId) {
    summaryQuery = summaryQuery.eq("branch_id", selection.branchId);
    commissionQuery = commissionQuery.eq("branch_id", selection.branchId);
  }

  const [{ data: summaryRows }, { data: commissionRows }] = await Promise.all([summaryQuery, commissionQuery]);

  const rows = (summaryRows ?? []) as DailySummary[];
  const totalPasien = rows.reduce((sum, r) => sum + Number(r.jumlah_pasien), 0);
  const totalIstimewa = rows.reduce((sum, r) => sum + Number(r.jumlah_pasien_istimewa), 0);
  const totalQris = rows.reduce((sum, r) => sum + Number(r.total_qris), 0);
  const totalCash = rows.reduce((sum, r) => sum + Number(r.total_cash_masuk), 0);
  const totalPengeluaran = rows.reduce((sum, r) => sum + Number(r.total_pengeluaran), 0);
  const totalSaldo = totalQris + totalCash - totalPengeluaran;

  const perBranch = new Map<string, { pasien: number; saldo: number }>();
  for (const r of rows) {
    const existing = perBranch.get(r.branch_name) ?? { pasien: 0, saldo: 0 };
    existing.pasien += Number(r.jumlah_pasien);
    existing.saldo += Number(r.saldo);
    perBranch.set(r.branch_name, existing);
  }

  const commissionByTherapist = new Map<string, number>();
  for (const row of (commissionRows ?? []) as unknown as {
    commission_amount: number;
    therapists: { name: string } | { name: string }[] | null;
  }[]) {
    const therapist = Array.isArray(row.therapists) ? row.therapists[0] : row.therapists;
    const name = therapist?.name ?? "Tanpa nama";
    commissionByTherapist.set(name, (commissionByTherapist.get(name) ?? 0) + Number(row.commission_amount));
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Laporan Periode</h1>
        <p className="text-sm text-zinc-500">Rekap pemasukan, pengeluaran, dan komisi terapis per rentang tanggal.</p>
      </div>

      <form className="card flex flex-wrap items-end gap-3 p-4">
        <div>
          <label className="field-label">Dari</label>
          <input type="date" name="from" defaultValue={from} className="field-input" />
        </div>
        <div>
          <label className="field-label">Sampai</label>
          <input type="date" name="to" defaultValue={to} className="field-input" />
        </div>
        <button type="submit" className="btn-primary">
          Tampilkan
        </button>
      </form>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="stat-tile">
          <p className="text-xs uppercase text-zinc-500">Jumlah Pasien</p>
          <p className="mt-1 text-lg font-semibold text-orange-600 dark:text-orange-400">{totalPasien}</p>
          {totalIstimewa > 0 && <p className="text-xs text-zinc-500">{totalIstimewa} pasien istimewa</p>}
        </div>
        <div className="stat-tile">
          <p className="text-xs uppercase text-zinc-500">Qris</p>
          <p className="mt-1 text-lg font-semibold">{formatRupiah(totalQris)}</p>
        </div>
        <div className="stat-tile">
          <p className="text-xs uppercase text-zinc-500">Cash Masuk</p>
          <p className="mt-1 text-lg font-semibold">{formatRupiah(totalCash)}</p>
        </div>
        <div className="stat-tile">
          <p className="text-xs uppercase text-zinc-500">Pengeluaran</p>
          <p className="mt-1 text-lg font-semibold text-rose-600">{formatRupiah(totalPengeluaran)}</p>
        </div>
        <div className="stat-tile">
          <p className="text-xs uppercase text-zinc-500">Saldo</p>
          <p className="mt-1 text-lg font-semibold text-emerald-600">{formatRupiah(totalSaldo)}</p>
        </div>
      </div>

      {selection.isAll && perBranch.size > 0 && (
        <div className="table-wrap">
          <div className="border-b border-orange-100 px-4 py-3 dark:border-zinc-800">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Per Cabang</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="table-head-row">
                <th className="px-4 py-2 font-medium">Cabang</th>
                <th className="px-4 py-2 font-medium text-right">Pasien</th>
                <th className="px-4 py-2 font-medium text-right">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {Array.from(perBranch.entries()).map(([name, v]) => (
                <tr key={name} className="table-row">
                  <td className="px-4 py-2">{name}</td>
                  <td className="px-4 py-2 text-right">{v.pasien}</td>
                  <td className="px-4 py-2 text-right">{formatRupiah(v.saldo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="table-wrap">
        <div className="border-b border-orange-100 px-4 py-3 dark:border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Rekap per Hari</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="table-head-row">
              <th className="px-4 py-2 font-medium">Tanggal</th>
              {selection.isAll && <th className="px-4 py-2 font-medium">Cabang</th>}
              <th className="px-4 py-2 font-medium text-right">Pasien</th>
              <th className="px-4 py-2 font-medium text-right">Qris</th>
              <th className="px-4 py-2 font-medium text-right">Cash</th>
              <th className="px-4 py-2 font-medium text-right">Pengeluaran</th>
              <th className="px-4 py-2 font-medium text-right">Saldo</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={selection.isAll ? 7 : 6} className="px-4 py-6 text-center text-zinc-400">
                  Tidak ada data pada rentang ini.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={`${r.transaction_date}-${r.branch_id}`} className="table-row">
                <td className="px-4 py-2">
                  {r.transaction_date}
                  {r.tidak_ada_pasien && (
                    <span className="block text-xs text-amber-700 dark:text-amber-400">
                      Tidak ada pasien{r.catatan_tidak_ada_pasien ? ` — ${r.catatan_tidak_ada_pasien}` : ""}
                    </span>
                  )}
                </td>
                {selection.isAll && <td className="px-4 py-2 text-zinc-500">{r.branch_name}</td>}
                <td className="px-4 py-2 text-right">
                  {r.jumlah_pasien}
                  {Number(r.jumlah_pasien_istimewa) > 0 && (
                    <span className="block text-xs text-zinc-500">{r.jumlah_pasien_istimewa} istimewa</span>
                  )}
                </td>
                <td className="px-4 py-2 text-right">{formatRupiah(r.total_qris)}</td>
                <td className="px-4 py-2 text-right">{formatRupiah(r.total_cash_masuk)}</td>
                <td className="px-4 py-2 text-right text-rose-600">{formatRupiah(r.total_pengeluaran)}</td>
                <td className="px-4 py-2 text-right font-medium">{formatRupiah(r.saldo)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="table-wrap">
        <div className="border-b border-orange-100 px-4 py-3 dark:border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Rekap Komisi per Terapis</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="table-head-row">
              <th className="px-4 py-2 font-medium">Terapis</th>
              <th className="px-4 py-2 font-medium text-right">Total Komisi</th>
            </tr>
          </thead>
          <tbody>
            {commissionByTherapist.size === 0 && (
              <tr>
                <td colSpan={2} className="px-4 py-6 text-center text-zinc-400">
                  Tidak ada data pada rentang ini.
                </td>
              </tr>
            )}
            {Array.from(commissionByTherapist.entries()).map(([name, total]) => (
              <tr key={name} className="table-row">
                <td className="px-4 py-2">{name}</td>
                <td className="px-4 py-2 text-right font-medium text-orange-600 dark:text-orange-400">
                  {formatRupiah(total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
