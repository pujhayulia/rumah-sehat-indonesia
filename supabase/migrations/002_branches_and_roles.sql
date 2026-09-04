-- Migrasi: multi-cabang (Ciledug & Pasar Minggu) + akses berbasis role
-- Jalankan SEKALI di SQL Editor Supabase pada project yang sudah menjalankan schema.sql.
--
-- Aturan akses baru:
--   - owner       : lihat & kelola semua cabang, satu-satunya yang boleh ubah master data
--                    (terapis, layanan) dan lihat semua akun.
--   - resepsionis : hanya bisa lihat & input data kunjungan/kas di cabangnya sendiri
--                    (ditentukan oleh profiles.branch_id).
--   - terapis tidak pernah login, jadi tidak perlu akses apapun (tetap tersimpan
--    sebagai data master, bukan akun).

-- =========================================================
-- 1. TABEL CABANG
-- =========================================================
create table if not exists branches (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

insert into branches (name)
  select 'Ciledug' where not exists (select 1 from branches where name = 'Ciledug');
insert into branches (name)
  select 'Pasar Minggu' where not exists (select 1 from branches where name = 'Pasar Minggu');

-- =========================================================
-- 2. KOLOM branch_id — data lama otomatis dianggap milik Ciledug
-- =========================================================
alter table profiles add column if not exists branch_id uuid references branches (id);

alter table therapists add column if not exists branch_id uuid references branches (id);
update therapists set branch_id = (select id from branches where name = 'Ciledug') where branch_id is null;
alter table therapists alter column branch_id set not null;

alter table visits add column if not exists branch_id uuid references branches (id);
update visits set branch_id = (select id from branches where name = 'Ciledug') where branch_id is null;
alter table visits alter column branch_id set not null;

alter table cash_transactions add column if not exists branch_id uuid references branches (id);
update cash_transactions set branch_id = (select id from branches where name = 'Ciledug') where branch_id is null;
alter table cash_transactions alter column branch_id set not null;

create index if not exists visits_branch_id_idx on visits (branch_id);
create index if not exists cash_transactions_branch_id_idx on cash_transactions (branch_id);

-- owner tidak butuh cabang (lihat semua), resepsionis wajib punya cabang
alter table profiles drop constraint if exists profiles_branch_required_for_non_owner;
alter table profiles add constraint profiles_branch_required_for_non_owner
  check (role = 'owner' or branch_id is not null);

-- =========================================================
-- 3. TRIGGER auto-transaksi ikut bawa branch_id
-- =========================================================
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

-- =========================================================
-- 4. VIEW rekap harian, sekarang per cabang
-- =========================================================
drop view if exists daily_summary;
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
-- 5. RLS
-- =========================================================
alter table branches enable row level security;
create policy "authenticated read branches" on branches for select using (auth.role() = 'authenticated');

-- Master data (terapis & layanan): semua yang login boleh baca (perlu untuk dropdown
-- form), tapi hanya owner yang boleh tambah/ubah/hapus.
drop policy if exists "authenticated write therapists" on therapists;
create policy "owner insert therapists" on therapists for insert with check (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'owner')
);
create policy "owner update therapists" on therapists for update using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'owner')
);
create policy "owner delete therapists" on therapists for delete using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'owner')
);

drop policy if exists "authenticated write services" on services;
create policy "owner insert services" on services for insert with check (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'owner')
);
create policy "owner update services" on services for update using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'owner')
);
create policy "owner delete services" on services for delete using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'owner')
);

-- Kunjungan & kas: owner akses semua cabang, resepsionis hanya cabangnya sendiri.
drop policy if exists "authenticated read visits" on visits;
drop policy if exists "authenticated write visits" on visits;
create policy "owner full access visits" on visits for all using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'owner')
) with check (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'owner')
);
create policy "resepsionis own branch visits" on visits for all using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'resepsionis' and p.branch_id = visits.branch_id)
) with check (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'resepsionis' and p.branch_id = visits.branch_id)
);

drop policy if exists "authenticated read cash_transactions" on cash_transactions;
drop policy if exists "authenticated write cash_transactions" on cash_transactions;
create policy "owner full access cash_transactions" on cash_transactions for all using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'owner')
) with check (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'owner')
);
create policy "resepsionis own branch cash_transactions" on cash_transactions for all using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'resepsionis' and p.branch_id = cash_transactions.branch_id)
) with check (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'resepsionis' and p.branch_id = cash_transactions.branch_id)
);

-- Owner boleh lihat & kelola semua akun (untuk atur resepsionis per cabang)
create policy "owner read all profiles" on profiles for select using (
  exists (select 1 from profiles p2 where p2.id = auth.uid() and p2.role = 'owner')
);
create policy "owner update all profiles" on profiles for update using (
  exists (select 1 from profiles p2 where p2.id = auth.uid() and p2.role = 'owner')
);

-- Cegah resepsionis menaikkan role/cabang dirinya sendiri lewat update biasa
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

drop trigger if exists trg_prevent_self_privilege_escalation on profiles;
create trigger trg_prevent_self_privilege_escalation
  before update on profiles
  for each row execute function fn_prevent_self_privilege_escalation();
