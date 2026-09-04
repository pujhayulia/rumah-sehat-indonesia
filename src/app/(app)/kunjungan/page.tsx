import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { resolveBranchSelection } from "@/lib/branch";
import { VisitForm } from "./visit-form";
import { VisitList, type VisitRow } from "./visit-list";

export default async function KunjunganPage({
  searchParams,
}: {
  searchParams: Promise<{ branch?: string; name?: string; serviceId?: string; bookingId?: string }>;
}) {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const params = await searchParams;
  const selection = resolveBranchSelection(profile, params);
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  let visitsQuery = supabase
    .from("visits")
    .select("*, therapists(name), services(name), branches(name)")
    .eq("visit_date", today)
    .order("created_at", { ascending: false });

  if (selection.branchId) {
    visitsQuery = visitsQuery.eq("branch_id", selection.branchId);
  }

  const [{ data: branches }, { data: therapists }, { data: services }, { data: visits }] = await Promise.all([
    supabase.from("branches").select("*").order("name"),
    supabase.from("therapists").select("*").eq("active", true).order("name"),
    supabase.from("services").select("*").eq("active", true).order("name"),
    visitsQuery,
  ]);

  const lockedBranch =
    profile.role === "resepsionis" && profile.branchId
      ? { id: profile.branchId, name: profile.branchName ?? "" }
      : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Kunjungan Hari Ini</h1>
        <p className="text-sm text-zinc-500">
          Input pasien yang datang — pemasukan & komisi terapis otomatis tercatat di Kas.
        </p>
      </div>

      <VisitForm
        branches={branches ?? []}
        lockedBranch={lockedBranch}
        defaultBranchId={selection.branchId}
        therapists={therapists ?? []}
        services={services ?? []}
        initialPatientName={params.name}
        initialServiceId={params.serviceId}
        bookingId={params.bookingId}
      />
      <VisitList visits={(visits ?? []) as VisitRow[]} showBranch={selection.isAll} />
    </div>
  );
}
