"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface VisitItemInput {
  therapistId: string;
  serviceId: string;
  price: number;
  commissionAmount: number;
  paymentMethod: "qris" | "cash";
  note: string;
}

export interface CreateVisitsInput {
  branchId: string;
  patientName: string;
  age: number | null;
  complaint: string;
  recommendation: string;
  visitDate: string;
  isSpecial: boolean;
  items: VisitItemInput[];
  bookingId?: string;
}

export async function createVisits(input: CreateVisitsInput) {
  if (input.items.length === 0) {
    return { error: "Minimal harus ada 1 layanan." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const rows = input.items.map((item) => ({
    branch_id: input.branchId,
    visit_date: input.visitDate,
    patient_name: input.patientName,
    age: input.age,
    complaint: input.complaint || null,
    recommendation: input.recommendation || null,
    therapist_id: item.therapistId,
    service_id: item.serviceId,
    // pasien istimewa selalu Rp0, apa pun yang dikirim form
    price: input.isSpecial ? 0 : item.price,
    commission_amount: input.isSpecial ? 0 : item.commissionAmount,
    is_special: input.isSpecial,
    payment_method: item.paymentMethod,
    note: item.note || null,
    created_by: user?.id ?? null,
  }));

  const { error } = await supabase.from("visits").insert(rows);

  if (error) {
    return { error: error.message };
  }

  // Ada pasien -> tanda "tidak ada pasien" hari itu tidak berlaku lagi
  await supabase.from("no_patient_days").delete().eq("branch_id", input.branchId).eq("day", input.visitDate);

  if (input.bookingId) {
    // Booking otomatis ditandai selesai — kalau ini gagal, kunjungannya tetap tersimpan,
    // jadi tidak perlu digagalkan seluruhnya cuma karena langkah pelengkap ini.
    await supabase.from("bookings").update({ status: "done" }).eq("id", input.bookingId);
    revalidatePath("/booking");
  }

  revalidatePath("/kunjungan");
  revalidatePath("/dashboard");
  return { error: null };
}

export async function deleteVisit(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("visits").delete().eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/kunjungan");
  revalidatePath("/dashboard");
  return { error: null };
}

export async function markNoPatientDay(input: { branchId: string; day: string; note: string }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { count } = await supabase
    .from("visits")
    .select("id", { count: "exact", head: true })
    .eq("branch_id", input.branchId)
    .eq("visit_date", input.day);
  if (count && count > 0) {
    return { error: "Sudah ada kunjungan hari ini, jadi tidak bisa ditandai tanpa pasien." };
  }

  const { error } = await supabase.from("no_patient_days").upsert(
    {
      branch_id: input.branchId,
      day: input.day,
      note: input.note.trim() || null,
      created_by: user?.id ?? null,
    },
    { onConflict: "branch_id,day" }
  );

  if (error) return { error: error.message };
  revalidatePath("/kunjungan");
  revalidatePath("/dashboard");
  revalidatePath("/laporan");
  return { error: null };
}

export async function unmarkNoPatientDay(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("no_patient_days").delete().eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/kunjungan");
  revalidatePath("/dashboard");
  revalidatePath("/laporan");
  return { error: null };
}
