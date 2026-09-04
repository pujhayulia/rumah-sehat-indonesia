import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { resolveBranchSelection } from "@/lib/branch";
import { ShareLink } from "./share-link";
import { BookingList, type BookingRow } from "./booking-list";

export default async function BookingPage({
  searchParams,
}: {
  searchParams: Promise<{ branch?: string }>;
}) {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const params = await searchParams;
  const selection = resolveBranchSelection(profile, params);
  const supabase = await createClient();

  let bookingsQuery = supabase
    .from("bookings")
    .select("*, services(name), branches(name)")
    .order("visit_date", { ascending: true });

  if (selection.branchId) {
    bookingsQuery = bookingsQuery.eq("branch_id", selection.branchId);
  }

  const { data: bookings } = await bookingsQuery;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Booking Masuk</h1>
        <p className="text-sm text-zinc-500">
          Pendaftaran dari pasien lewat link publik. Konfirmasi jam pasti lewat telepon/WhatsApp, lalu catat sebagai
          kunjungan biasa di menu Kunjungan saat pasien datang.
        </p>
      </div>

      <ShareLink />
      <BookingList bookings={(bookings ?? []) as BookingRow[]} showBranch={selection.isAll} />
    </div>
  );
}
