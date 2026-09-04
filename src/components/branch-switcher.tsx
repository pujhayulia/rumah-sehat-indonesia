"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Branch } from "@/types/database";

export function BranchSwitcher({ branches }: { branches: Branch[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get("branch") ?? "all";

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete("branch");
    } else {
      params.set("branch", value);
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <select
      value={current}
      onChange={(e) => handleChange(e.target.value)}
      className="rounded-lg border border-orange-200 bg-orange-50 px-2 py-1.5 text-sm font-medium text-orange-700 outline-none transition-colors focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 dark:border-orange-900 dark:bg-orange-950/40 dark:text-orange-300"
    >
      <option value="all">Semua Cabang</option>
      {branches.map((b) => (
        <option key={b.id} value={b.id}>
          {b.name}
        </option>
      ))}
    </select>
  );
}
