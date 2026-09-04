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
    price: item.price,
    commission_amount: item.commissionAmount,
    payment_method: item.paymentMethod,
    note: item.note || null,
    created_by: user?.id ?? null,
  }));

  const { error } = await supabase.from("visits").insert(rows);

  if (error) {
    return { error: error.message };
  }

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
