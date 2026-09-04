"use client";

import Image from "next/image";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const FEATURES = [
  "Catat kunjungan & layanan pasien harian",
  "Kas masuk/keluar & komisi terapis otomatis",
  "Laporan per cabang, real-time",
];

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
      <path
        d="M4 6h16v12H4V6Zm0 0 8 7 8-7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
      <rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError("Email atau password salah.");
      setLoading(false);
      return;
    }

    // Hard navigation supaya cookie sesi yang baru di-set pasti sudah kepakai
    // saat server component pertama kali render /dashboard (hindari race dengan router.push).
    window.location.href = "/dashboard";
  }

  return (
    <div className="flex flex-1 dark:bg-zinc-950">
      {/* Panel branding — desktop saja */}
      <div className="relative hidden w-1/2 items-center justify-center overflow-hidden bg-gradient-to-br from-orange-500 via-orange-600 to-amber-600 p-12 lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage: "radial-gradient(currentColor 1.5px, transparent 1.5px)",
            backgroundSize: "22px 22px",
            color: "#ffffff",
          }}
        />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-green-400/25 blur-3xl" />
        <div className="pointer-events-none absolute -top-16 right-0 h-64 w-64 rounded-full bg-amber-300/30 blur-3xl" />

        <div className="relative z-10 max-w-sm text-white">
          <div className="mb-8 inline-flex rounded-2xl bg-white p-4 shadow-lg">
            <Image src="/logo-mark.png" alt="Rumah Sehat Indonesia" width={90} height={68} className="h-16 w-auto" priority />
          </div>
          <h1 className="text-2xl font-semibold leading-snug">
            Sistem digital untuk klinik Rumah Sehat Indonesia
          </h1>
          <p className="mt-3 text-sm text-orange-50/90">
            Gantikan pencatatan kertas resepsionis dengan satu sistem yang rapi dan real-time.
          </p>
          <ul className="mt-8 flex flex-col gap-3">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-3 text-sm text-orange-50/95">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/20">
                  <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3">
                    <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                {f}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Form login */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-gradient-to-b from-orange-50 via-white to-white px-4 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-950">
        <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-orange-300/40 blur-3xl dark:bg-orange-500/10 lg:left-auto lg:right-0 lg:translate-x-1/4" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-64 w-64 rounded-full bg-green-300/30 blur-3xl dark:bg-green-500/10" />

        <form
          onSubmit={handleSubmit}
          className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-orange-100 bg-white/95 shadow-xl shadow-orange-950/5 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/90"
        >
          <div className="h-1.5 w-full bg-gradient-to-r from-orange-500 via-amber-500 to-green-500" />

          <div className="p-8">
            <div className="mb-6 flex flex-col items-center text-center lg:hidden">
              <Image
                src="/logo-mark.png"
                alt="Rumah Sehat Indonesia"
                width={72}
                height={55}
                className="mb-3 h-16 w-auto"
                priority
              />
              <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Rumah Sehat Indonesia</h1>
            </div>
            <div className="mb-6 hidden lg:block">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Selamat datang kembali</h2>
            </div>
            <p className="-mt-4 mb-6 text-sm text-zinc-500 lg:hidden">Masuk untuk mengakses sistem klinik</p>
            <p className="-mt-4 mb-6 hidden text-sm text-zinc-500 lg:block">
              Masuk dengan akun yang sudah didaftarkan owner
            </p>

            <label className="field-label">Email</label>
            <div className="relative mb-4">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
                <MailIcon />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="field-input pl-9"
                placeholder="nama@rsehatindonesia.id"
              />
            </div>

            <label className="field-label">Password</label>
            <div className="relative mb-5">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
                <LockIcon />
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="field-input pl-9"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:bg-rose-950/30 dark:text-rose-400">
                {error}
              </p>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? "Memproses..." : "Masuk"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
