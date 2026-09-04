"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { createAdminClient } from "@/lib/supabase/admin";

export interface CreateResepsionisInput {
  fullName: string;
  email: string;
  password: string;
  branchId: string;
}

export async function createResepsionis(input: CreateResepsionisInput) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "owner") {
    return { error: "Hanya owner yang bisa menambah akun." };
  }

  const fullName = input.fullName.trim();
  const email = input.email.trim().toLowerCase();

  if (!fullName || !email || !input.branchId) {
    return { error: "Nama, email, dan cabang wajib diisi." };
  }
  if (input.password.length < 6) {
    return { error: "Password minimal 6 karakter." };
  }

  const admin = createAdminClient();

  const { data: userData, error: userError } = await admin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
  });

  if (userError || !userData.user) {
    return { error: userError?.message ?? "Gagal membuat akun." };
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: userData.user.id,
    full_name: fullName,
    role: "resepsionis",
    branch_id: input.branchId,
  });

  if (profileError) {
    // Rollback biar tidak ada akun auth "nyangkut" tanpa profil.
    await admin.auth.admin.deleteUser(userData.user.id);
    return { error: profileError.message };
  }

  revalidatePath("/master/tim");
  return { error: null };
}
