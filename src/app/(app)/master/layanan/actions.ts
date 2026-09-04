"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createService(input: {
  name: string;
  durationMinutes: number | null;
  price: number;
  commissionAmount: number;
}) {
  const supabase = await createClient();
  const { error } = await supabase.from("services").insert({
    name: input.name,
    duration_minutes: input.durationMinutes,
    price: input.price,
    commission_amount: input.commissionAmount,
  });

  if (error) return { error: error.message };
  revalidatePath("/master/layanan");
  return { error: null };
}

export async function toggleServiceActive(id: string, active: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from("services").update({ active }).eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/master/layanan");
  return { error: null };
}
