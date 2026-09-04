import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { ServiceForm } from "./service-form";
import { ServiceList } from "./service-list";

export default async function LayananPage() {
  const profile = await getCurrentProfile();
  if (!profile) return null;
  if (profile.role !== "owner") redirect("/dashboard");

  const supabase = await createClient();
  const { data: services } = await supabase.from("services").select("*").order("name");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Master Layanan</h1>
        <p className="text-sm text-zinc-500">Kelola jenis terapi, tarif, dan komisi per sesi.</p>
      </div>

      <ServiceForm />
      <ServiceList services={services ?? []} />
    </div>
  );
}
