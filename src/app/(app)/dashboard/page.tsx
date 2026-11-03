import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { resolveBranchSelection } from "@/lib/branch";
import { formatRupiah, formatDate } from "@/lib/format";
import type { DailySummary, Visit } from "@/types/database";
import { FinanceChart, type FinancePoint } from "./finance-chart";

const CHART_DAYS = 90;

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "brand" | "positive" | "negative";
}) {
  return (
    <div className="stat-tile">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</p>
      <p
        className={`mt-1 text-2xl font-semibold ${
          tone === "brand"
            ? "text-orange-600 dark:text-orange-400"
            : tone === "positive"
              ? "text-emerald-600"
              : tone === "negative"
                ? "text-rose-600"
                : "text-zinc-900 dark:text-zinc-50"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

type VisitRow = Visit & {
  therapists: { name: string } | null;
  services: { name: string } | null;
  branches: { name: string } | null;
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ branch?: string }>;
}) {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const params = await searchParams;
  const selection = resolveBranchSelection(profile, params);
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const chartStart = new Date(`${today}T00:00:00Z`);
  chartStart.setUTCDate(chartStart.getUTCDate() - (CHART_DAYS - 1));
  const chartFrom = chartStart.toISOString().slice(0, 10);

  let summaryQuery = supabase.from("daily_summary").select("*").eq("transaction_date", today);
  let chartQuery = supabase
    .from("daily_summary")
    .select("transaction_date, total_qris, total_cash_masuk, total_pengeluaran")
    .gte("transaction_date", chartFrom)
    .lte("transaction_date", today);
  let visitsQuery = supabase
    .from("visits")
    .select("*, therapists(name), services(name), branches(name)")
    .eq("visit_date", today)
    .order("created_at", { ascending: false });

  if (selection.branchId) {
    summaryQuery = summaryQuery.eq("branch_id", selection.branchId);
    chartQuery = chartQuery.eq("branch_id", selection.branchId);
    visitsQuery = visitsQuery.eq("branch_id", selection.branchId);
  }

  const [{ data: summaryRows }, { data: visits }, { data: chartRows }] = await Promise.all([
    summaryQuery,
    visitsQuery,
    chartQuery,
  ]);

  // Satu titik per hari (semua cabang dijumlah), hari tanpa transaksi = 0
  const byDate = new Map<string, FinancePoint>();
  for (let i = 0; i < CHART_DAYS; i++) {
    const d = new Date(chartStart);
    d.setUTCDate(chartStart.getUTCDate() + i);
    const key = d.toISOString().slice(0, 10);
    byDate.set(key, { date: key, income: 0, expense: 0 });
  }
  for (const r of (chartRows ?? []) as Pick<
    DailySummary,
    "transaction_date" | "total_qris" | "total_cash_masuk" | "total_pengeluaran"
  >[]) {
    const point = byDate.get(r.transaction_date);
    if (!point) continue;
    point.income += Number(r.total_qris) + Number(r.total_cash_masuk);
    point.expense += Number(r.total_pengeluaran);
  }
  const chartData = Array.from(byDate.values());

  const rows = (summaryRows ?? []) as DailySummary[];
  const jumlahPasien = rows.reduce((sum, r) => sum + Number(r.jumlah_pasien), 0);
  const totalQris = rows.reduce((sum, r) => sum + Number(r.total_qris), 0);
  const totalCash = rows.reduce((sum, r) => sum + Number(r.total_cash_masuk), 0);
  const totalPengeluaran = rows.reduce((sum, r) => sum + Number(r.total_pengeluaran), 0);
  const saldo = totalQris + totalCash - totalPengeluaran;
  const jumlahIstimewa = rows.reduce((sum, r) => sum + Number(r.jumlah_pasien_istimewa), 0);
  const noPatientRows = rows.filter((r) => r.tidak_ada_pasien);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Dashboard Hari Ini</h1>
        <p className="text-sm text-zinc-500">{formatDate(today)}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Jumlah Pasien" value={String(jumlahPasien)} tone="brand" />
        <StatCard label="Qris" value={formatRupiah(totalQris)} />
        <StatCard label="Cash Masuk" value={formatRupiah(totalCash)} />
        <StatCard label="Pengeluaran" value={formatRupiah(totalPengeluaran)} tone="negative" />
        <StatCard label="Saldo" value={formatRupiah(saldo)} tone="positive" />
      </div>

      {(jumlahIstimewa > 0 || noPatientRows.length > 0) && (
        <div className="flex flex-wrap gap-2 text-xs">
          {jumlahIstimewa > 0 && <span className="badge badge-orange">{jumlahIstimewa} pasien istimewa hari ini</span>}
          {noPatientRows.map((r) => (
            <span key={r.branch_id} className="badge badge-muted">
              {r.branch_name}: tidak ada pasien
              {r.catatan_tidak_ada_pasien ? ` (${r.catatan_tidak_ada_pasien})` : ""}
            </span>
          ))}
        </div>
      )}

      <FinanceChart data={chartData} />

      {selection.isAll && rows.length > 0 && (
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
              {rows.map((r) => (
                <tr key={r.branch_id} className="table-row">
                  <td className="px-4 py-2">{r.branch_name}</td>
                  <td className="px-4 py-2 text-right">{r.jumlah_pasien}</td>
                  <td className="px-4 py-2 text-right">{formatRupiah(r.saldo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="table-wrap">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-orange-100 px-4 py-3 dark:border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Kunjungan Hari Ini</h2>
          <a href="/kunjungan" className="btn-primary shrink-0 px-3 py-1.5 text-xs">
            + Tambah Kunjungan
          </a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-head-row">
                {selection.isAll && <th className="px-4 py-2 font-medium">Cabang</th>}
                <th className="px-4 py-2 font-medium">Pasien</th>
                <th className="px-4 py-2 font-medium">Terapis</th>
                <th className="px-4 py-2 font-medium">Layanan</th>
                <th className="px-4 py-2 font-medium">Bayar</th>
                <th className="px-4 py-2 font-medium text-right">Harga</th>
              </tr>
            </thead>
            <tbody>
              {(visits ?? []).length === 0 && (
                <tr>
                  <td colSpan={selection.isAll ? 6 : 5} className="px-4 py-6 text-center text-zinc-400">
                    Belum ada kunjungan hari ini.
                  </td>
                </tr>
              )}
              {(visits as VisitRow[] | null)?.map((v) => (
                <tr key={v.id} className="table-row">
                  {selection.isAll && <td className="px-4 py-2 text-zinc-500">{v.branches?.name ?? "-"}</td>}
                  <td className="px-4 py-2">
                    {v.patient_name}
                    {v.is_special && <span className="badge badge-orange ml-2">Istimewa</span>}
                  </td>
                  <td className="px-4 py-2">{v.therapists?.name ?? "-"}</td>
                  <td className="px-4 py-2">{v.services?.name ?? "-"}</td>
                  <td className="px-4 py-2">
                    <span className={`badge ${v.payment_method === "qris" ? "badge-orange" : "badge-muted"}`}>
                      {v.payment_method}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">{formatRupiah(v.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
