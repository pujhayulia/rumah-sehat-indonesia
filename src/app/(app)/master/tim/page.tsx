import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { createAdminClient } from "@/lib/supabase/admin";
import { TeamForm } from "./team-form";
import { TeamList } from "./team-list";

export default async function TimPage() {
  const profile = await getCurrentProfile();
  if (!profile) return null;
  if (profile.role !== "owner") redirect("/dashboard");

  const supabase = await createClient();
  const [{ data: resepsionisProfiles }, { data: branches }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, branch_id, created_at")
      .eq("role", "resepsionis")
      .order("created_at"),
    supabase.from("branches").select("*").order("name"),
  ]);

  const admin = createAdminClient();
  const { data: usersData } = await admin.auth.admin.listUsers({ perPage: 200 });
  const emailById = new Map(usersData?.users.map((u) => [u.id, u.email ?? "-"]) ?? []);
  const branchNameById = new Map((branches ?? []).map((b) => [b.id, b.name]));

  const rows = (resepsionisProfiles ?? []).map((p) => ({
    id: p.id,
    fullName: p.full_name,
    email: emailById.get(p.id) ?? "-",
    branchName: (p.branch_id && branchNameById.get(p.branch_id)) ?? "-",
    createdAt: p.created_at,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Tim Resepsionis</h1>
        <p className="text-sm text-zinc-500">
          Buat akun login untuk resepsionis di tiap cabang. Terapis tidak perlu akun — cukup didaftarkan di menu
          Terapis.
        </p>
      </div>

      <TeamForm branches={branches ?? []} />
      <TeamList rows={rows} />
    </div>
  );
}
