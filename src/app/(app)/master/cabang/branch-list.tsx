import type { Branch } from "@/types/database";

export function BranchList({ branches }: { branches: Branch[] }) {
  return (
    <div className="table-wrap">
      <table className="w-full text-sm">
        <thead>
          <tr className="table-head-row">
            <th className="px-4 py-2 font-medium">Cabang</th>
            <th className="px-4 py-2 font-medium">Dibuat</th>
          </tr>
        </thead>
        <tbody>
          {branches.length === 0 && (
            <tr>
              <td colSpan={2} className="px-4 py-6 text-center text-zinc-400">
                Belum ada cabang.
              </td>
            </tr>
          )}
          {branches.map((b) => (
            <tr key={b.id} className="table-row">
              <td className="px-4 py-2 font-medium">{b.name}</td>
              <td className="px-4 py-2 text-zinc-500">
                {new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(
                  new Date(b.created_at)
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
