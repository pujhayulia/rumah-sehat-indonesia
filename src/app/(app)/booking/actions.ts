"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { BookingStatus } from "@/types/database";

export async function updateBookingStatus(id: string, status: BookingStatus) {
  const supabase = await createClient();
  const { error } = await supabase.from("bookings").update({ status }).eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/booking");
  return { error: null };
}
