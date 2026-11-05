import { getCurrentProfile } from "@/lib/supabase/profile";
import { resolveBranchSelection } from "@/lib/branch";
import { formatRupiah } from "@/lib/format";
import { getReportData, resolveRange } from "./report-data";

export default async function LaporanPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; branch?: string }>;
}) {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const params = await searchParams;
  const selection = resolveBranchSelection(profile, params);
  const { from, to } = resolveRange(params);
  const data = await getReportData(selection, { from, to });

  const rows = data.rows;
  const totalPasien = data.totals.pasien;
  const totalIstimewa = data.totals.istimewa;
  const totalQris = data.totals.qris;
  const totalCash = data.totals.cash;
  const totalPengeluaran = data.totals.pengeluaran;
  const totalSaldo = data.totals.saldo;
  const perBranch = new Map(data.perBranch.map((b) => [b.name, { pasien: b.pasien, saldo: b.saldo }]));
  const commissionByTherapist = new Map(data.commissionByTherapist.map((c) => [c.name, c.total]));

  // Link download memakai filter yang sama dengan yang sedang tampil
  const exportQuery = (format: "pdf" | "xlsx") => {
    const q = new URLSearchParams({ format, from, to });
    if (selection.branchId) q.set("branch", selection.branchId);
    return `/laporan/export?${q.toString()}`;
  };

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
        {params.branch && <input type="hidden" name="branch" value={params.branch} />}
        <button type="submit" className="btn-primary">
          Tampilkan
        </button>
        <div className="flex flex-wrap gap-2 sm:ml-auto">
          <a href={exportQuery("pdf")} className="btn-secondary" download>
            Download PDF
          </a>
          <a href={exportQuery("xlsx")} className="btn-secondary" download>
            Download Excel
          </a>
        </div>
      </form>
      <p className="-mt-3 text-xs text-zinc-500">
        File berisi laporan {data.branchLabel} untuk rentang tanggal di atas. Klik &ldquo;Tampilkan&rdquo; dulu kalau
        tanggalnya baru diubah.
      </p>

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
