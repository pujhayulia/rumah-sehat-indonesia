"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface BranchPriceInput {
  branchId: string;
  // null = layanan tidak tersedia di cabang ini
  price: number | null;
  commissionAmount: number;
}

export interface ServiceInput {
  name: string;
  durationMinutes: number | null;
  prices: BranchPriceInput[];
}

function revalidateServicePages() {
  revalidatePath("/master/layanan");
  revalidatePath("/kunjungan");
  revalidatePath("/daftar");
}

async function savePrices(serviceId: string, prices: BranchPriceInput[]) {
  const supabase = await createClient();

  const available = prices.filter((p) => p.price !== null);
  const unavailable = prices.filter((p) => p.price === null).map((p) => p.branchId);

  if (available.length > 0) {
    const { error } = await supabase.from("service_prices").upsert(
      available.map((p) => ({
        service_id: serviceId,
        branch_id: p.branchId,
        price: p.price,
        commission_amount: p.commissionAmount,
      }))
    );
    if (error) return error.message;
  }

  if (unavailable.length > 0) {
    const { error } = await supabase
      .from("service_prices")
      .delete()
      .eq("service_id", serviceId)
      .in("branch_id", unavailable);
    if (error) return error.message;
  }

  return null;
}

export async function createService(input: ServiceInput) {
  const supabase = await createClient();
  const first = input.prices.find((p) => p.price !== null);

  const { data, error } = await supabase
    .from("services")
    .insert({
      name: input.name,
      duration_minutes: input.durationMinutes,
      // kolom lama, wajib diisi di database tapi tidak dipakai lagi
      price: first?.price ?? 0,
      commission_amount: first?.commissionAmount ?? 0,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  const priceError = await savePrices(data.id, input.prices);
  if (priceError) return { error: priceError };

  revalidateServicePages();
  return { error: null };
}

export async function updateService(id: string, input: ServiceInput) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("services")
    .update({ name: input.name, duration_minutes: input.durationMinutes })
    .eq("id", id);

  if (error) return { error: error.message };

  const priceError = await savePrices(id, input.prices);
  if (priceError) return { error: priceError };

  revalidateServicePages();
  return { error: null };
}

export async function toggleServiceActive(id: string, active: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from("services").update({ active }).eq("id", id);

  if (error) return { error: error.message };
  revalidateServicePages();
  return { error: null };
}
