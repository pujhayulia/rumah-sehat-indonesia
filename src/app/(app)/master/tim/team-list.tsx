interface Row {
  id: string;
  fullName: string;
  email: string;
  branchName: string;
  createdAt: string;
}

export function TeamList({ rows }: { rows: Row[] }) {
  return (
    <div className="table-wrap">
      <table className="w-full text-sm">
        <thead>
          <tr className="table-head-row">
            <th className="px-4 py-2 font-medium">Nama</th>
            <th className="px-4 py-2 font-medium">Email</th>
            <th className="px-4 py-2 font-medium">Cabang</th>
            <th className="px-4 py-2 font-medium">Dibuat</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={4} className="px-4 py-6 text-center text-zinc-400">
                Belum ada akun resepsionis.
              </td>
            </tr>
          )}
          {rows.map((r) => (
            <tr key={r.id} className="table-row">
              <td className="px-4 py-2">{r.fullName}</td>
              <td className="px-4 py-2 text-zinc-500">{r.email}</td>
              <td className="px-4 py-2">
                <span className="badge badge-active">{r.branchName}</span>
              </td>
              <td className="px-4 py-2 text-zinc-500">
                {new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(
                  new Date(r.createdAt)
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
