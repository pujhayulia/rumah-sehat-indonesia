import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/database";

export interface CurrentProfile {
  id: string;
  fullName: string;
  role: UserRole;
  branchId: string | null;
  branchName: string | null;
}

export async function getCurrentProfile(): Promise<CurrentProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, role, branch_id, branches(name)")
    .eq("id", user.id)
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
}
