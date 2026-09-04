"use server";

import { createClient } from "@/lib/supabase/server";

export interface CreateBookingInput {
  branchId: string;
  patientName: string;
  patientPhone: string;
  visitDate: string;
  serviceId: string | null;
  note: string;
}

export async function createBooking(input: CreateBookingInput) {
  const patientName = input.patientName.trim();
  const patientPhone = input.patientPhone.trim();

  if (!input.branchId || !patientName || !patientPhone || !input.visitDate) {
    return { error: "Mohon lengkapi cabang, nama, no. HP, dan tanggal kedatangan." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_booking", {
    p_branch_id: input.branchId,
    p_patient_name: patientName,
    p_patient_phone: patientPhone,
    p_visit_date: input.visitDate,
    p_service_id: input.serviceId || null,
    p_note: input.note.trim() || null,
  });

  if (error) {
    return { error: "Gagal mengirim pendaftaran. Coba lagi sebentar lagi." };
  }

  return { error: null };
}
