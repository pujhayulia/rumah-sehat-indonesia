"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Branch } from "@/types/database";
import { createResepsionis } from "./actions";

function generatePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export function TeamForm({ branches }: { branches: Branch[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [branchId, setBranchId] = useState(branches[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ fullName: string; email: string; password: string } | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !password || !branchId) {
      setError("Semua kolom wajib diisi.");
      return;
    }
    setError(null);

    startTransition(async () => {
      const result = await createResepsionis({ fullName, email, password, branchId });
      if (result.error) {
        setError(result.error);
        return;
      }
      setCreated({ fullName, email, password });
      setFullName("");
      setEmail("");
      setPassword("");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={handleSubmit} className="card grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Tambah Akun Resepsionis</h2>
        </div>

        <div>
          <label className="field-label">Nama Lengkap</label>
          <input
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="field-input"
          />
        </div>

        <div>
          <label className="field-label">Cabang</label>
          <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className="field-input">
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="field-label">Email Login</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="resepsionis.cabang@rsehatindonesia.id"
            className="field-input"
          />
        </div>

        <div>
          <label className="field-label">Password</label>
          <div className="flex flex-col gap-2">
            <input
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              className="field-input min-w-0"
            />
            <button
              type="button"
              onClick={() => setPassword(generatePassword())}
              className="btn-secondary shrink-0 whitespace-nowrap"
            >
              Buat Otomatis
            </button>
          </div>
        </div>

        {error && (
          <p className="sm:col-span-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:bg-rose-950/30 dark:text-rose-400">
            {error}
          </p>
        )}

        <div className="sm:col-span-2">
          <button type="submit" disabled={isPending || branches.length === 0} className="btn-primary">
            {isPending ? "Membuat akun..." : "Buat Akun"}
          </button>
          {branches.length === 0 && (
            <p className="mt-2 text-sm text-zinc-500">Tambahkan cabang dulu di menu Cabang sebelum bikin akun.</p>
          )}
        </div>
      </form>

      {created && (
        <div className="rounded-2xl border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950/30">
          <p className="mb-2 text-sm font-semibold text-green-700 dark:text-green-300">
            Akun {created.fullName} berhasil dibuat
          </p>
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            Email: <span className="font-mono">{created.email}</span>
            <br />
            Password: <span className="font-mono">{created.password}</span>
          </p>
          <p className="mt-2 text-xs text-zinc-500">
            Simpan kredensial ini sekarang juga — password tidak akan ditampilkan lagi setelah halaman ini
            ditutup/refresh. Bagikan ke resepsionis yang bersangkutan lewat jalur pribadi (bukan grup terbuka).
          </p>
        </div>
      )}
    </div>
  );
}
