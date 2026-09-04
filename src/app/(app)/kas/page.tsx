import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { resolveBranchSelection } from "@/lib/branch";
import { formatRupiah } from "@/lib/format";
import { CashForm } from "./cash-form";
import { CashList } from "./cash-list";

function toDateInput(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default async function KasPage({
  searchParams,
}: {
  searchParams: Promise<{ branch?: string; from?: string; to?: string }>;
}) {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const params = await searchParams;
  const selection = resolveBranchSelection(profile, params);
  const supabase = await createClient();

  const today = new Date();
  const todayStr = toDateInput(today);
  const from = params.from || todayStr;
  const to = params.to || todayStr;
  const isSingleDay = from === to;

  let entriesQuery = supabase
    .from("cash_transactions")
    .select("*, therapists(name), branches(name)")
    .gte("transaction_date", from)
    .lte("transaction_date", to)
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (selection.branchId) {
    entriesQuery = entriesQuery.eq("branch_id", selection.branchId);
  }

  const [{ data: branches }, { data: therapists }, { data: entries }] = await Promise.all([
    supabase.from("branches").select("*").order("name"),
    supabase.from("therapists").select("*").eq("active", true).order("name"),
    entriesQuery,
  ]);

  const lockedBranch =
    profile.role === "resepsionis" && profile.branchId
      ? { id: profile.branchId, name: profile.branchName ?? "" }
      : null;

  const totalIncome = (entries ?? [])
    .filter((e) => e.type === "income")
    .reduce((sum, e) => sum + Number(e.amount), 0);
  const totalExpense = (entries ?? [])
    .filter((e) => e.type === "expense")
    .reduce((sum, e) => sum + Number(e.amount), 0);

  const branchQuery = selection.branchId ? `&branch=${selection.branchId}` : "";
  const firstOfMonth = toDateInput(new Date(today.getFullYear(), today.getMonth(), 1));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          {isSingleDay && from === todayStr ? "Kas Hari Ini" : "Kas"}
        </h1>
        <p className="text-sm text-zinc-500">
          Pemasukan &amp; komisi dari kunjungan tercatat otomatis. Tambahkan uang makan atau
          pengeluaran operasional di sini — entri baru selalu tercatat untuk hari ini.
        </p>
      </div>

      <div className="card flex flex-wrap items-end gap-3 p-4">
        <div className="flex gap-2">
          <Link
            href={`/kas?from=${todayStr}&to=${todayStr}${branchQuery}`}
            className={`toggle-btn normal-case ${
              from === todayStr && to === todayStr ? "toggle-btn-active" : "toggle-btn-inactive"
            }`}
          >
            Hari Ini
          </Link>
          <Link
            href={`/kas?from=${firstOfMonth}&to=${todayStr}${branchQuery}`}
            className={`toggle-btn normal-case ${
              from === firstOfMonth && to === todayStr ? "toggle-btn-active" : "toggle-btn-inactive"
            }`}
          >
            Bulan Ini
          </Link>
        </div>

        <form className="flex flex-wrap items-end gap-3">
          {selection.branchId && <input type="hidden" name="branch" value={selection.branchId} />}
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
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="stat-tile">
          <p className="text-xs uppercase text-zinc-500">Total Masuk</p>
          <p className="mt-1 text-lg font-semibold text-emerald-600">{formatRupiah(totalIncome)}</p>
        </div>
        <div className="stat-tile">
          <p className="text-xs uppercase text-zinc-500">Total Keluar</p>
          <p className="mt-1 text-lg font-semibold text-rose-600">{formatRupiah(totalExpense)}</p>
        </div>
        <div className="stat-tile">
          <p className="text-xs uppercase text-zinc-500">Saldo</p>
          <p className="mt-1 text-lg font-semibold text-orange-600 dark:text-orange-400">
            {formatRupiah(totalIncome - totalExpense)}
          </p>
        </div>
      </div>

      <CashForm
        branches={branches ?? []}
        lockedBranch={lockedBranch}
        defaultBranchId={selection.branchId}
        therapists={therapists ?? []}
      />
      <CashList entries={entries ?? []} showBranch={selection.isAll} showDate={!isSingleDay} />
    </div>
  );
}
