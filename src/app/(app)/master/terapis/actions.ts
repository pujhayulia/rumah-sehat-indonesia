"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createTherapist(input: { name: string; phone: string; branchId: string }) {
  const supabase = await createClient();
  const { error } = await supabase.from("therapists").insert({
    name: input.name,
    phone: input.phone || null,
    branch_id: input.branchId,
  });

  if (error) return { error: error.message };
  revalidatePath("/master/terapis");
  return { error: null };
}

export async function toggleTherapistActive(id: string, active: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from("therapists").update({ active }).eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/master/terapis");
  return { error: null };
}
