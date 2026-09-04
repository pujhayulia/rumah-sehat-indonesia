"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { TransactionCategory, TransactionType } from "@/types/database";

export interface CreateCashEntryInput {
  branchId: string;
  type: TransactionType;
  category: TransactionCategory;
  amount: number;
  description: string;
  therapistId: string | null;
}

export async function createCashEntry(input: CreateCashEntryInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("cash_transactions").insert({
    branch_id: input.branchId,
    transaction_date: new Date().toISOString().slice(0, 10),
    type: input.type,
    category: input.category,
    amount: input.amount,
    description: input.description || null,
    therapist_id: input.therapistId,
    payment_method: input.type === "expense" ? "cash" : null,
    created_by: user?.id ?? null,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/kas");
  revalidatePath("/dashboard");
  return { error: null };
}

export async function deleteCashEntry(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("cash_transactions").delete().eq("id", id).is("visit_id", null);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/kas");
  revalidatePath("/dashboard");
  return { error: null };
}
