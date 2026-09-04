import type { CurrentProfile } from "@/lib/supabase/profile";

export interface BranchSelection {
  branchId: string | null; // null = semua cabang (khusus owner)
  isAll: boolean;
}

export function resolveBranchSelection(
  profile: CurrentProfile,
  searchParams: { branch?: string }
): BranchSelection {
  if (profile.role === "resepsionis") {
    return { branchId: profile.branchId, isAll: false };
  }

  const requested = searchParams.branch;
  if (!requested || requested === "all") {
    return { branchId: null, isAll: true };
  }
  return { branchId: requested, isAll: false };
}
