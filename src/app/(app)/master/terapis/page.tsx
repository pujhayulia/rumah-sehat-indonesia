import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { TherapistForm } from "./therapist-form";
import { TherapistList } from "./therapist-list";

export default async function TerapisPage() {
  const profile = await getCurrentProfile();
  if (!profile) return null;
  if (profile.role !== "owner") redirect("/dashboard");

  const supabase = await createClient();
  const [{ data: therapists }, { data: branches }] = await Promise.all([
    supabase.from("therapists").select("*").order("name"),
    supabase.from("branches").select("*").order("name"),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Master Terapis</h1>
        <p className="text-sm text-zinc-500">Kelola daftar terapis yang aktif praktik di tiap cabang.</p>
      </div>

      <TherapistForm branches={branches ?? []} />
      <TherapistList therapists={therapists ?? []} branches={branches ?? []} />
    </div>
  );
}
