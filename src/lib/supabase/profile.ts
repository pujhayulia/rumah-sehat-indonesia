import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/database";

export interface CurrentProfile {
  id: string;
  fullName: string;
  role: UserRole;
  branchId: string | null;
  branchName: string | null;
}

// cache(): layout & halaman di satu request berbagi hasil yang sama,
// jadi profil cukup diambil sekali per pindah menu.
export const getCurrentProfile = cache(async (): Promise<CurrentProfile | null> => {
  const supabase = await createClient();
  // getClaims memverifikasi token login; lebih ringan dari getUser
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (!userId) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, role, branch_id, branches(name)")
    .eq("id", userId)
    .maybeSingle();

  if (!data) return null;

  const branch = Array.isArray(data.branches) ? data.branches[0] : data.branches;

  return {
    id: data.id,
    fullName: data.full_name,
    role: data.role,
    branchId: data.branch_id,
    branchName: branch?.name ?? null,
  };
});
