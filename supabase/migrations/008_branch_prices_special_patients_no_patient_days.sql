-- Migrasi 008:
--   1. Harga & fee layanan per cabang (tabel service_prices)
--   2. Pasien istimewa (gratis: harga & fee terapis Rp0) -> kolom visits.is_special
--   3. Hari tanpa pasien (tabel no_patient_days) supaya tetap ada rekapnya
--   4. Perbaikan view daily_summary (sebelumnya total uang bisa berlipat ganda
--      kalau ada lebih dari 1 kunjungan di hari yang sama)
--   5. Data harga Ciledug & Pasar Minggu + terapis Pasar Minggu
--
-- Jalankan SEKALI di SQL Editor Supabase. Aman dijalankan ulang.

-- =========================================================
-- 1. HARGA PER CABANG
--    Kalau layanan tidak punya baris harga untuk suatu cabang, berarti
--    layanan itu tidak tersedia di cabang tersebut.
--    Kolom services.price / commission_amount lama tidak dipakai lagi oleh app.
-- =========================================================
create table if not exists service_prices (
  service_id uuid not null references services (id) on delete cascade,
  branch_id uuid not null references branches (id) on delete cascade,
  price numeric(12, 2) not null,
  commission_amount numeric(12, 2) not null default 0,
  primary key (service_id, branch_id)
);

alter table service_prices enable row level security;

drop policy if exists "public read service_prices" on service_prices;
create policy "public read service_prices" on service_prices for select using (true);
drop policy if exists "owner write service_prices" on service_prices;
create policy "owner write service_prices" on service_prices for all
  using (fn_is_owner()) with check (fn_is_owner());

-- Pastikan semua layanan yang dibutuhkan ada
insert into services (name, duration_minutes, price, commission_amount)
  select 'Itera (Paket)', 30, 75000, 25000
  where not exists (select 1 from services where name = 'Itera (Paket)');
insert into services (name, duration_minutes, price, commission_amount)
  select 'Totok Punggung', 45, 100000, 50000
  where not exists (select 1 from services where name = 'Totok Punggung');
insert into services (name, duration_minutes, price, commission_amount)
  select 'Bekam', 45, 135000, 75000
  where not exists (select 1 from services where name = 'Bekam');
insert into services (name, duration_minutes, price, commission_amount)
  select 'Itera', 30, 100000, 25000
  where not exists (select 1 from services where name = 'Itera');
insert into services (name, duration_minutes, price, commission_amount)
  select 'Biolite', 30, 75000, 25000
  where not exists (select 1 from services where name = 'Biolite');

-- Harga per cabang sesuai data dari klinik
insert into service_prices (service_id, branch_id, price, commission_amount)
select s.id, b.id, p.price, p.fee
from (values
  ('Ciledug',      'Totok Punggung', 125000, 75000),
  ('Ciledug',      'Itera',          100000, 25000),
  ('Ciledug',      'Itera (Paket)',   75000, 25000),
  ('Ciledug',      'Biolite',         75000, 25000),
  ('Ciledug',      'Bekam',          135000, 75000),
  ('Pasar Minggu', 'Totok Punggung', 100000, 50000),
  ('Pasar Minggu', 'Bekam',          150000, 75000),
  ('Pasar Minggu', 'Itera',           75000, 25000)
) as p (branch_name, service_name, price, fee)
join branches b on b.name = p.branch_name
join services s on s.name = p.service_name
on conflict (service_id, branch_id) do update
  set price = excluded.price, commission_amount = excluded.commission_amount;

-- Layanan lain yang sudah ada (di luar daftar di atas) tetap tersedia di semua
-- cabang dengan harga lamanya, supaya tidak hilang dari form.
insert into service_prices (service_id, branch_id, price, commission_amount)
select s.id, b.id, s.price, s.commission_amount
from services s cross join branches b
where s.name not in ('Totok Punggung', 'Itera', 'Itera (Paket)', 'Biolite', 'Bekam')
on conflict (service_id, branch_id) do nothing;

-- =========================================================
-- 2. TERAPIS PASAR MINGGU
-- =========================================================
insert into therapists (name, branch_id)
select t.name, b.id
from (values ('Racmawanti'), ('Rofi''ah'), ('Ghofar'), ('Yoppy')) as t (name)
join branches b on b.name = 'Pasar Minggu'
where not exists (
  select 1 from therapists x where lower(x.name) = lower(t.name) and x.branch_id = b.id
);

-- =========================================================
-- 3. PASIEN ISTIMEWA — harga & fee terapis Rp0
-- =========================================================
alter table visits add column if not exists is_special boolean not null default false;

-- Transaksi kas Rp0 tidak perlu dicatat (pasien istimewa)
create or replace function fn_visit_to_transactions()
returns trigger as $$
begin
  if new.price > 0 then
    insert into cash_transactions (transaction_date, type, category, amount, payment_method, description, visit_id, therapist_id, branch_id, created_by)
    values (new.visit_date, 'income', 'service_income', new.price, new.payment_method,
            'Pemasukan layanan: ' || new.patient_name, new.id, new.therapist_id, new.branch_id, new.created_by);
  end if;

  if new.commission_amount > 0 then
    insert into cash_transactions (transaction_date, type, category, amount, payment_method, description, visit_id, therapist_id, branch_id, created_by)
    values (new.visit_date, 'expense', 'commission_payout', new.commission_amount, 'cash',
            'Komisi terapis untuk: ' || new.patient_name, new.id, new.therapist_id, new.branch_id, new.created_by);
  end if;

  return new;
end;
$$ language plpgsql security definer;

-- =========================================================
-- 4. HARI TANPA PASIEN
-- =========================================================
create table if not exists no_patient_days (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references branches (id),
  day date not null,
  note text,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now(),
  unique (branch_id, day)
);

alter table no_patient_days enable row level security;

drop policy if exists "owner full access no_patient_days" on no_patient_days;
create policy "owner full access no_patient_days" on no_patient_days for all
  using (fn_is_owner()) with check (fn_is_owner());
drop policy if exists "resepsionis own branch no_patient_days" on no_patient_days;
create policy "resepsionis own branch no_patient_days" on no_patient_days for all
  using (fn_current_branch_id() = branch_id) with check (fn_current_branch_id() = branch_id);

-- =========================================================
-- 5. VIEW REKAP HARIAN (diperbaiki)
--    Uang dan jumlah pasien dihitung terpisah lalu digabung, jadi tidak
--    berlipat ganda. Hari tanpa pasien ikut muncul dengan catatannya.
--    security_invoker: view ikut aturan akses (RLS) user yang membuka.
-- =========================================================
drop view if exists daily_summary;
create view daily_summary with (security_invoker = true) as
with keys as (
  select transaction_date as day, branch_id from cash_transactions
  union
  select visit_date, branch_id from visits
  union
  select day, branch_id from no_patient_days
),
cash as (
  select
    transaction_date as day,
    branch_id,
    coalesce(sum(amount) filter (where type = 'income' and payment_method = 'qris'), 0) as total_qris,
    coalesce(sum(amount) filter (where type = 'income' and payment_method = 'cash'), 0) as total_cash_masuk,
    coalesce(sum(amount) filter (where type = 'expense'), 0) as total_pengeluaran
  from cash_transactions
  group by transaction_date, branch_id
),
vis as (
  select
    visit_date as day,
    branch_id,
    count(*) as jumlah_pasien,
    count(*) filter (where is_special) as jumlah_pasien_istimewa
  from visits
  group by visit_date, branch_id
)
select
  k.day as transaction_date,
  k.branch_id,
  b.name as branch_name,
  coalesce(v.jumlah_pasien, 0) as jumlah_pasien,
  coalesce(v.jumlah_pasien_istimewa, 0) as jumlah_pasien_istimewa,
  coalesce(c.total_qris, 0) as total_qris,
  coalesce(c.total_cash_masuk, 0) as total_cash_masuk,
  coalesce(c.total_pengeluaran, 0) as total_pengeluaran,
  coalesce(c.total_qris, 0) + coalesce(c.total_cash_masuk, 0) - coalesce(c.total_pengeluaran, 0) as saldo,
  (n.id is not null) as tidak_ada_pasien,
  n.note as catatan_tidak_ada_pasien
from keys k
join branches b on b.id = k.branch_id
left join cash c on c.day = k.day and c.branch_id = k.branch_id
left join vis v on v.day = k.day and v.branch_id = k.branch_id
left join no_patient_days n on n.day = k.day and n.branch_id = k.branch_id
order by k.day desc;
