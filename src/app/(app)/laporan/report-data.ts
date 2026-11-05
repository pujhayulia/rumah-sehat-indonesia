import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { BranchSelection } from "@/lib/branch";
import type { DailySummary } from "@/types/database";

function toDateInput(d: Date) {
  return d.toISOString().slice(0, 10);
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Rentang default: 7 hari terakhir
export function resolveRange(params: { from?: string; to?: string }) {
  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(today.getDate() - 6);
  return {
    from: params.from && DATE_RE.test(params.from) ? params.from : toDateInput(weekAgo),
    to: params.to && DATE_RE.test(params.to) ? params.to : toDateInput(today),
  };
}

export interface VisitDetail {
  visit_date: string;
  branch_name: string;
  patient_name: string;
  age: number | null;
  complaint: string | null;
  therapist_name: string;
  service_name: string;
  payment_method: string;
  price: number;
  commission_amount: number;
  is_special: boolean;
}

export interface ReportData {
  from: string;
  to: string;
  branchLabel: string;
  isAll: boolean;
  rows: DailySummary[];
  totals: {
    pasien: number;
    istimewa: number;
    qris: number;
    cash: number;
    pengeluaran: number;
    saldo: number;
  };
  perBranch: { name: string; pasien: number; saldo: number }[];
  commissionByTherapist: { name: string; total: number }[];
  visits: VisitDetail[];
}

type Joined = { name: string } | { name: string }[] | null;
const nameOf = (j: Joined) => (Array.isArray(j) ? j[0]?.name : j?.name) ?? "-";

// Dipakai halaman Laporan dan file download (PDF/Excel), supaya angkanya selalu sama.
// Resepsionis otomatis hanya mendapat data cabangnya (lewat selection + RLS database).
export async function getReportData(
  selection: BranchSelection,
  range: { from: string; to: string }
): Promise<ReportData> {
  const supabase = await createClient();
  const { from, to } = range;

  let summaryQuery = supabase
    .from("daily_summary")
    .select("*")
    .gte("transaction_date", from)
    .lte("transaction_date", to)
    .order("transaction_date", { ascending: false });

  let visitsQuery = supabase
    .from("visits")
    .select(
      "visit_date, patient_name, age, complaint, payment_method, price, commission_amount, is_special, therapists(name), services(name), branches(name)"
    )
    .gte("visit_date", from)
    .lte("visit_date", to)
    .order("visit_date", { ascending: true })
    .order("created_at", { ascending: true });

  if (selection.branchId) {
    summaryQuery = summaryQuery.eq("branch_id", selection.branchId);
    visitsQuery = visitsQuery.eq("branch_id", selection.branchId);
  }

  const [{ data: summaryRows }, { data: visitRows }, { data: branch }] = await Promise.all([
    summaryQuery,
    visitsQuery,
    selection.branchId
      ? supabase.from("branches").select("name").eq("id", selection.branchId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const rows = (summaryRows ?? []) as DailySummary[];
  const qris = rows.reduce((s, r) => s + Number(r.total_qris), 0);
  const cash = rows.reduce((s, r) => s + Number(r.total_cash_masuk), 0);
  const pengeluaran = rows.reduce((s, r) => s + Number(r.total_pengeluaran), 0);

  const perBranchMap = new Map<string, { pasien: number; saldo: number }>();
  for (const r of rows) {
    const e = perBranchMap.get(r.branch_name) ?? { pasien: 0, saldo: 0 };
    e.pasien += Number(r.jumlah_pasien);
    e.saldo += Number(r.saldo);
    perBranchMap.set(r.branch_name, e);
  }

  const visits: VisitDetail[] = ((visitRows ?? []) as unknown as (Omit<
    VisitDetail,
    "therapist_name" | "service_name" | "branch_name"
  > & { therapists: Joined; services: Joined; branches: Joined })[]).map((v) => ({
    visit_date: v.visit_date,
    branch_name: nameOf(v.branches),
    patient_name: v.patient_name,
    age: v.age,
    complaint: v.complaint,
    therapist_name: nameOf(v.therapists),
    service_name: nameOf(v.services),
    payment_method: v.payment_method,
    price: Number(v.price),
    commission_amount: Number(v.commission_amount),
    is_special: v.is_special,
  }));

  const commissionMap = new Map<string, number>();
  for (const v of visits) {
    commissionMap.set(v.therapist_name, (commissionMap.get(v.therapist_name) ?? 0) + v.commission_amount);
  }

  return {
    from,
    to,
    branchLabel: selection.branchId ? (branch as { name: string } | null)?.name ?? "-" : "Semua Cabang",
    isAll: selection.isAll,
    rows,
    totals: {
      pasien: rows.reduce((s, r) => s + Number(r.jumlah_pasien), 0),
      istimewa: rows.reduce((s, r) => s + Number(r.jumlah_pasien_istimewa), 0),
      qris,
      cash,
      pengeluaran,
      saldo: qris + cash - pengeluaran,
    },
    perBranch: Array.from(perBranchMap.entries()).map(([name, v]) => ({ name, ...v })),
    commissionByTherapist: Array.from(commissionMap.entries())
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total),
    visits,
  };
}
