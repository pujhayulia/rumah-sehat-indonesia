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
  const [{ data: services }, { data: prices }, { data: branches }] = await Promise.all([
    supabase.from("services").select("*").order("name"),
    supabase.from("service_prices").select("*"),
    supabase.from("branches").select("*").order("name"),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Master Layanan</h1>
        <p className="text-sm text-zinc-500">Kelola jenis terapi, harga, dan fee terapis per cabang.</p>
      </div>

      <ServiceForm branches={branches ?? []} />
      <ServiceList services={services ?? []} prices={prices ?? []} branches={branches ?? []} />
    </div>
  );
}
