import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { BranchForm } from "./branch-form";
import { BranchList } from "./branch-list";

export default async function CabangPage() {
  const profile = await getCurrentProfile();
  if (!profile) return null;
  if (profile.role !== "owner") redirect("/dashboard");

  const supabase = await createClient();
  const { data: branches } = await supabase.from("branches").select("*").order("created_at");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Master Cabang</h1>
        <p className="text-sm text-zinc-500">
          Kelola daftar cabang klinik. Cabang baru langsung muncul di semua pilihan cabang di aplikasi.
        </p>
      </div>

      <BranchForm />
      <BranchList branches={branches ?? []} />
    </div>
  );
}
