"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createBranch(input: { name: string }) {
  const name = input.name.trim();
  if (!name) return { error: "Nama cabang tidak boleh kosong." };

  const supabase = await createClient();
  const { error } = await supabase.from("branches").insert({ name });

  if (error) {
    if (error.code === "23505") return { error: "Cabang dengan nama itu sudah ada." };
    return { error: error.message };
  }

  revalidatePath("/master/cabang");
  revalidatePath("/kunjungan");
  revalidatePath("/kas");
  revalidatePath("/dashboard");
  revalidatePath("/laporan");
  return { error: null };
}
