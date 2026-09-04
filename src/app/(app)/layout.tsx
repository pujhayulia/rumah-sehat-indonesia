import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/profile";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/login");
  }

  const supabase = await createClient();
  const { data: branches } = await supabase.from("branches").select("*").order("name");

  return (
    <div className="min-h-full flex-1 bg-gradient-to-b from-orange-50/60 via-white to-white dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-950">
      <AppShell role={profile.role} fullName={profile.fullName} branchName={profile.branchName} branches={branches ?? []}>
        {children}
      </AppShell>
    </div>
  );
}
