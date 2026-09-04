-- Rumah Sehat Indonesia (RSI) — skema database Fase 1
-- Modul: resepsionis harian (kunjungan, kas, komisi terapis), multi-cabang
--
-- Jalankan file ini di Supabase SQL editor pada project BARU (kosong).
-- Kalau project kamu sudah pernah menjalankan versi lama schema.sql ini
-- (tanpa cabang), jangan jalankan file ini lagi — pakai
-- supabase/migrations/002_branches_and_roles.sql saja.

create extension if not exists "pgcrypto";

-- =========================================================
-- 1. CABANG
-- =========================================================
create table branches (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

-- =========================================================
-- 2. PROFIL & PERAN PENGGUNA
--    owner       : lihat & kelola semua cabang, satu-satunya yang boleh ubah
--                  master data (terapis, layanan) dan lihat semua akun.
--    resepsionis : hanya bisa lihat & input data kunjungan/kas di cabangnya
--                  sendiri (branch_id wajib diisi).
--    Terapis TIDAK punya akun login — mereka cuma data master di tabel
--    therapists, dikelola oleh owner.
-- =========================================================
create type user_role as enum ('owner', 'resepsionis');

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  role user_role not null default 'resepsionis',
  branch_id uuid references branches (id),
  created_at timestamptz not null default now(),
  constraint profiles_branch_required_for_non_owner check (role = 'owner' or branch_id is not null)
);

-- =========================================================
-- 3. MASTER DATA: TERAPIS & LAYANAN
-- =========================================================
create table therapists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  branch_id uuid not null references branches (id),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table services (
  id uuid primary key default gen_random_uuid(),
  name text not null,               -- Totok Punggung, Bekam, Itera, Biolite, ...
  description text,
  duration_minutes int,
  price numeric(12, 2) not null,        -- tarif ke pasien
  commission_amount numeric(12, 2) not null, -- komisi/bagi hasil terapis per sesi
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- spesialisasi: terapis mana yang boleh melayani layanan apa
create table therapist_services (
  therapist_id uuid not null references therapists (id) on delete cascade,
  service_id uuid not null references services (id) on delete cascade,
  primary key (therapist_id, service_id)
);

-- =========================================================
-- 4. PASIEN (master ringan, bisa berkembang jadi rekam medis)
-- =========================================================
create table patients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  age int,
  phone text,
  created_at timestamptz not null default now()
);

-- =========================================================
-- 5. KUNJUNGAN HARIAN — pengganti baris di kertas laporan harian
-- =========================================================
create type payment_method as enum ('qris', 'cash');

create table visits (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references branches (id),
  visit_date date not null default current_date,
  patient_id uuid references patients (id) on delete set null,
  patient_name text not null,        -- snapshot nama, tetap ada walau master pasien belum lengkap
  age int,
  complaint text,                    -- Penyakit
  recommendation text,               -- Rekomendasi
  therapist_id uuid not null references therapists (id),
  service_id uuid not null references services (id),
  note text,                         -- Keterangan tambahan (mis. "itera" tambahan setelah totok)
  price numeric(12, 2) not null,         -- tarif aktual saat transaksi (bisa beda dari master jika ada diskon)
  commission_amount numeric(12, 2) not null,
  payment_method payment_method not null,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now()
);

create index visits_visit_date_idx on visits (visit_date);
create index visits_therapist_id_idx on visits (therapist_id);
create index visits_branch_id_idx on visits (branch_id);

-- =========================================================
-- 6. BUKU KAS — satu ledger untuk semua pemasukan & pengeluaran
--    Baris income dari visit (harga layanan) dan expense komisi
--    dibuat otomatis oleh trigger di bawah. Baris manual (uang
--    makan, ATK, operasional lain) diinput langsung oleh resepsionis.
-- =========================================================
create type transaction_type as enum ('income', 'expense');
create type transaction_category as enum (
  'service_income',   -- pemasukan dari layanan (auto dari visits)
  'commission_payout', -- komisi terapis (auto dari visits)
  'meal_allowance',    -- uang makan terapis
  'operational',        -- ATK, kebersihan, dll
  'other'
);

create table cash_transactions (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references branches (id),
  transaction_date date not null default current_date,
  type transaction_type not null,
  category transaction_category not null,
  amount numeric(12, 2) not null,
  payment_method payment_method,          -- relevan untuk income; null utk sebagian expense (dianggap cash)
  description text,
  visit_id uuid references visits (id) on delete cascade,
  therapist_id uuid references therapists (id) on delete set null,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now()
);

create index cash_transactions_date_idx on cash_transactions (transaction_date);
create index cash_transactions_branch_id_idx on cash_transactions (branch_id);

-- auto-generate income + commission expense setiap ada kunjungan baru
create or replace function fn_visit_to_transactions()
returns trigger as $$
begin
  insert into cash_transactions (transaction_date, type, category, amount, payment_method, description, visit_id, therapist_id, branch_id, created_by)
  values (new.visit_date, 'income', 'service_income', new.price, new.payment_method,
          'Pemasukan layanan: ' || new.patient_name, new.id, new.therapist_id, new.branch_id, new.created_by);

  insert into cash_transactions (transaction_date, type, category, amount, payment_method, description, visit_id, therapist_id, branch_id, created_by)
  values (new.visit_date, 'expense', 'commission_payout', new.commission_amount, 'cash',
          'Komisi terapis untuk: ' || new.patient_name, new.id, new.therapist_id, new.branch_id, new.created_by);

  return new;
end;
$$ language plpgsql security definer;

create trigger trg_visit_to_transactions
  after insert on visits
  for each row execute function fn_visit_to_transactions();

-- kalau kunjungan dihapus, transaksi terkait ikut terhapus (on delete cascade sudah menangani)

-- =========================================================
-- 7. VIEW REKAP HARIAN PER CABANG — mirror kolom di laporan kertas
--    (Jumlah Pasien, Pemasukan Cash, Qris, Pengeluaran, Saldo)
-- =========================================================
create view daily_summary as
select
  d.transaction_date,
  d.branch_id,
  b.name as branch_name,
  count(distinct v.id) filter (where v.visit_date = d.transaction_date and v.branch_id = d.branch_id) as jumlah_pasien,
  coalesce(sum(d.amount) filter (where d.type = 'income' and d.payment_method = 'qris'), 0) as total_qris,
  coalesce(sum(d.amount) filter (where d.type = 'income' and d.payment_method = 'cash'), 0) as total_cash_masuk,
  coalesce(sum(d.amount) filter (where d.type = 'expense'), 0) as total_pengeluaran,
  coalesce(sum(d.amount) filter (where d.type = 'income'), 0) - coalesce(sum(d.amount) filter (where d.type = 'expense'), 0) as saldo
from cash_transactions d
join branches b on b.id = d.branch_id
left join visits v on v.visit_date = d.transaction_date and v.branch_id = d.branch_id
group by d.transaction_date, d.branch_id, b.name
order by d.transaction_date desc;

-- =========================================================
-- 7B. BOOKING PUBLIK — pendaftaran dari link publik (tanpa login),
--     masuk ke daftar "Booking Masuk" resepsionis. Belum ada slot jam
--     praktik, jadi pasien cukup minta tanggal kedatangan.
-- =========================================================
create type booking_status as enum ('pending', 'confirmed', 'cancelled', 'done');

create table bookings (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references branches (id),
  patient_name text not null,
  patient_phone text not null,
  visit_date date not null,
  service_id uuid references services (id),
  note text,
  status booking_status not null default 'pending',
  created_at timestamptz not null default now()
);

create index bookings_branch_id_idx on bookings (branch_id);
create index bookings_visit_date_idx on bookings (visit_date);

-- Pasien mendaftar lewat function ini (bukan insert langsung ke tabel).
-- Alasannya: PostgREST selalu melakukan INSERT ... RETURNING di belakang
-- layar, yang mengharuskan ada kebijakan SELECT juga supaya baris yang
-- baru diinsert "terlihat" oleh pengirimnya — padahal anon TIDAK boleh
-- SELECT data booking siapapun (nama & no. HP pasien lain). Function
-- SECURITY DEFINER ini jalan dengan hak akses pemiliknya sehingga lolos
-- dari batasan itu, dan cuma mengembalikan berhasil/gagal tanpa membocorkan
-- data booking siapapun ke publik.
create or replace function public.submit_booking(
  p_branch_id uuid,
  p_patient_name text,
  p_patient_phone text,
  p_visit_date date,
  p_service_id uuid default null,
  p_note text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into bookings (branch_id, patient_name, patient_phone, visit_date, service_id, note)
  values (p_branch_id, p_patient_name, p_patient_phone, p_visit_date, p_service_id, p_note);
end;
$$;

-- =========================================================
-- 8. ROW LEVEL SECURITY
-- =========================================================
alter table branches enable row level security;
alter table profiles enable row level security;
alter table therapists enable row level security;
alter table services enable row level security;
alter table therapist_services enable row level security;
alter table patients enable row level security;
alter table visits enable row level security;
alter table cash_transactions enable row level security;
alter table bookings enable row level security;

create policy "authenticated read branches" on branches for select using (auth.role() = 'authenticated');
create policy "public read branches" on branches for select using (true);

-- Function SECURITY DEFINER untuk cek role/cabang user saat ini. WAJIB lewat
-- function begini (bukan subquery langsung ke profiles di dalam kebijakan
-- profiles itu sendiri) karena subquery langsung akan memicu infinite
-- recursion: subquery ke profiles ikut kena RLS profiles lagi, yang di
-- dalamnya ada kebijakan yang sama lagi. Function SECURITY DEFINER berjalan
-- dengan hak akses pemiliknya sehingga tidak kena RLS, jadi tidak ada loop.
create or replace function fn_is_owner()
returns boolean as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'owner');
$$ language sql security definer stable;

create or replace function fn_current_branch_id()
returns uuid as $$
  select branch_id from profiles where id = auth.uid();
$$ language sql security definer stable;

create policy "profiles: user lihat profil sendiri"
  on profiles for select using (auth.uid() = id);
create policy "profiles: user update profil sendiri"
  on profiles for update using (auth.uid() = id);
create policy "owner read all profiles" on profiles for select using (fn_is_owner());
create policy "owner update all profiles" on profiles for update using (fn_is_owner());
create policy "owner insert branches" on branches for insert with check (fn_is_owner());

-- cegah resepsionis menaikkan role/cabang dirinya sendiri lewat update biasa
create or replace function fn_prevent_self_privilege_escalation()
returns trigger as $$
begin
  if not exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'owner') then
    if new.role is distinct from old.role or new.branch_id is distinct from old.branch_id then
      raise exception 'Hanya owner yang bisa mengubah role atau cabang';
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger trg_prevent_self_privilege_escalation
  before update on profiles
  for each row execute function fn_prevent_self_privilege_escalation();

-- Master data: semua yang login boleh baca (perlu untuk dropdown form),
-- hanya owner yang boleh tambah/ubah/hapus.
create policy "authenticated read therapists" on therapists for select using (auth.role() = 'authenticated');
create policy "owner insert therapists" on therapists for insert with check (fn_is_owner());
create policy "owner update therapists" on therapists for update using (fn_is_owner());
create policy "owner delete therapists" on therapists for delete using (fn_is_owner());

create policy "authenticated read services" on services for select using (auth.role() = 'authenticated');
create policy "public read services" on services for select using (true);
create policy "owner insert services" on services for insert with check (fn_is_owner());
create policy "owner update services" on services for update using (fn_is_owner());
create policy "owner delete services" on services for delete using (fn_is_owner());

create policy "authenticated read therapist_services" on therapist_services for select using (auth.role() = 'authenticated');
create policy "authenticated write therapist_services" on therapist_services for all using (auth.role() = 'authenticated');

create policy "authenticated read patients" on patients for select using (auth.role() = 'authenticated');
create policy "authenticated write patients" on patients for all using (auth.role() = 'authenticated');

-- Kunjungan & kas: owner akses semua cabang, resepsionis hanya cabangnya sendiri.
create policy "owner full access visits" on visits for all
  using (fn_is_owner()) with check (fn_is_owner());
create policy "resepsionis own branch visits" on visits for all
  using (fn_current_branch_id() = branch_id) with check (fn_current_branch_id() = branch_id);

create policy "owner full access cash_transactions" on cash_transactions for all
  using (fn_is_owner()) with check (fn_is_owner());
create policy "resepsionis own branch cash_transactions" on cash_transactions for all
  using (fn_current_branch_id() = branch_id) with check (fn_current_branch_id() = branch_id);

-- Booking: pendaftaran publik lewat function submit_booking() (lihat bagian 7B),
-- bukan insert langsung ke tabel — tidak perlu kebijakan insert di sini.
create policy "owner full access bookings" on bookings for all
  using (fn_is_owner()) with check (fn_is_owner());
create policy "resepsionis read own branch bookings" on bookings for select
  using (fn_current_branch_id() = branch_id);
create policy "resepsionis update own branch bookings" on bookings for update
  using (fn_current_branch_id() = branch_id) with check (fn_current_branch_id() = branch_id);

grant execute on function public.submit_booking(uuid, text, text, date, uuid, text) to anon, authenticated;

-- =========================================================
-- 9. SEED DATA — cabang, tarif & terapis yang sudah berjalan (Ciledug)
-- =========================================================
insert into branches (name) values ('Ciledug'), ('Pasar Minggu');

insert into services (name, duration_minutes, price, commission_amount) values
  ('Totok Punggung', 45, 100000, 50000),
  ('Bekam', 45, 125000, 75000),
  ('Itera', 30, 75000, 25000),
  ('Biolite', 30, 75000, 20000);

insert into therapists (name, branch_id) values
  ('Jundi Al Adly', (select id from branches where name = 'Ciledug')),
  ('Ali Saputra', (select id from branches where name = 'Ciledug')),
  ('Arum Muhaiminul Muna', (select id from branches where name = 'Ciledug')),
  ('Ijhawati', (select id from branches where name = 'Ciledug'));
