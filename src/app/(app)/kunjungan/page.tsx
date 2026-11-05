import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { resolveBranchSelection } from "@/lib/branch";
import { formatDate } from "@/lib/format";
import type { NoPatientDay } from "@/types/database";
import { VisitForm } from "./visit-form";
import { VisitList, type VisitRow } from "./visit-list";
import { NoPatientCard } from "./no-patient-card";

export default async function KunjunganPage({
  searchParams,
}: {
  searchParams: Promise<{ branch?: string; name?: string; serviceId?: string; bookingId?: string; date?: string }>;
}) {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const params = await searchParams;
  const selection = resolveBranchSelection(profile, params);
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  // Tanggal yang sedang diinput/dilihat; bisa mundur untuk input data hari sebelumnya
  const visitDate =
    params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date) && params.date <= today ? params.date : today;
  const isToday = visitDate === today;

  let visitsQuery = supabase
    .from("visits")
    .select("*, therapists(name), services(name), branches(name)")
    .eq("visit_date", visitDate)
    .order("created_at", { ascending: false });

  let noPatientQuery = supabase.from("no_patient_days").select("*").eq("day", visitDate);

  if (selection.branchId) {
    visitsQuery = visitsQuery.eq("branch_id", selection.branchId);
    noPatientQuery = noPatientQuery.eq("branch_id", selection.branchId);
  }

  const [
    { data: branches },
    { data: therapists },
    { data: services },
    { data: prices },
    { data: visits },
    { data: noPatientDays },
  ] = await Promise.all([
    supabase.from("branches").select("*").order("name"),
    supabase.from("therapists").select("*").eq("active", true).order("name"),
    supabase.from("services").select("*").eq("active", true).order("name"),
    supabase.from("service_prices").select("*"),
    visitsQuery,
    noPatientQuery,
  ]);

  const lockedBranch =
    profile.role === "resepsionis" && profile.branchId
      ? { id: profile.branchId, name: profile.branchName ?? "" }
      : null;

  // Tanda "tidak ada pasien" hanya bisa dipakai kalau satu cabang dipilih
  // dan memang belum ada kunjungan hari ini di cabang itu.
  const markBranchId = lockedBranch?.id ?? selection.branchId;
  const markBranchName = lockedBranch?.name ?? branches?.find((b) => b.id === markBranchId)?.name ?? "";
  const existingMark = ((noPatientDays ?? []) as NoPatientDay[]).find((n) => n.branch_id === markBranchId) ?? null;
  const showNoPatientCard = Boolean(markBranchId) && (visits ?? []).length === 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          {isToday ? "Kunjungan Hari Ini" : `Kunjungan ${formatDate(visitDate)}`}
        </h1>
        <p className="text-sm text-zinc-500">
          Input pasien yang datang — pemasukan & komisi terapis otomatis tercatat di Kas.
        </p>
      </div>

      {showNoPatientCard && markBranchId && (
        <NoPatientCard branchId={markBranchId} branchName={markBranchName} day={visitDate} isToday={isToday} existing={existingMark} />
      )}

      <VisitForm
        branches={branches ?? []}
        lockedBranch={lockedBranch}
        defaultBranchId={selection.branchId}
        therapists={therapists ?? []}
        services={services ?? []}
        prices={prices ?? []}
        initialPatientName={params.name}
        initialServiceId={params.serviceId}
        bookingId={params.bookingId}
        visitDate={visitDate}
        maxDate={today}
      />
      <VisitList
        visits={(visits ?? []) as VisitRow[]}
        showBranch={selection.isAll}
        emptyText={isToday ? "Belum ada kunjungan hari ini." : "Belum ada kunjungan pada tanggal ini."}
      />
    </div>
  );
}
