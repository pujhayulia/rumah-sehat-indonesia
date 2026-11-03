// Tampil langsung saat pindah menu, sementara data halaman diambil dari server.
export default function Loading() {
  return (
    <div className="flex animate-pulse flex-col gap-6" aria-busy="true" aria-label="Memuat halaman">
      <div className="flex flex-col gap-2">
        <div className="h-6 w-48 rounded-lg bg-orange-100/80 dark:bg-zinc-800" />
        <div className="h-4 w-72 max-w-full rounded-lg bg-orange-50 dark:bg-zinc-900" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="stat-tile h-20" />
        ))}
      </div>
      <div className="card h-64" />
    </div>
  );
}
