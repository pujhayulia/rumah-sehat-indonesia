# Rumah Sehat Indonesia — Sistem Resepsionis Klinik

Aplikasi web (PWA-ready) untuk menggantikan pencatatan manual laporan harian
Klinik RSI Ciledug: kunjungan pasien, kas harian, dan komisi terapis.

Fase 1 (modul yang sudah ada): Kunjungan, Kas, Laporan, Master Terapis & Layanan.
Fase 2 (rencana lanjutan): RSI Mart (POS produk), keanggotaan/member, rekam medis.

## Setup

1. Buat project baru di [supabase.com](https://supabase.com).
2. Buka **SQL Editor** di dashboard Supabase, jalankan isi file [`supabase/schema.sql`](./supabase/schema.sql).
   Ini akan membuat semua tabel, trigger auto-pencatatan kas, view rekap, RLS, dan seed data
   layanan (Totok/Bekam/Itera/Biolite) + terapis yang sudah berjalan.
3. Buat user login pertama lewat **Authentication > Users > Add user** di Supabase
   (email + password untuk resepsionis/owner), lalu tambahkan barisnya di tabel `profiles`.
4. Salin `.env.local.example` menjadi `.env.local`, isi dengan **Project URL** dan **anon public key**
   dari Supabase (Settings > API).
5. Jalankan:

   ```bash
   npm install
   npm run dev
   ```

   Buka [http://localhost:3000](http://localhost:3000).

## Struktur Data

Lihat [`supabase/schema.sql`](./supabase/schema.sql) untuk skema lengkap. Ringkasnya:

- `therapists`, `services` — master terapis & jenis layanan (harga + komisi).
- `patients`, `visits` — kunjungan harian pasien (pengganti baris di kertas laporan).
- `cash_transactions` — buku kas satu pintu; baris pemasukan layanan & komisi terapis
  otomatis dibuat oleh trigger saat ada kunjungan baru, baris lain (uang makan, operasional)
  diinput manual dari halaman **Kas**.
- `daily_summary` — view rekap harian (jumlah pasien, Qris, cash, pengeluaran, saldo),
  dipakai di halaman **Dashboard** dan **Laporan**.

## Deploy

Direkomendasikan deploy ke [Vercel](https://vercel.com/new) — tinggal hubungkan repo,
isi env var `NEXT_PUBLIC_SUPABASE_URL` & `NEXT_PUBLIC_SUPABASE_ANON_KEY` yang sama.
