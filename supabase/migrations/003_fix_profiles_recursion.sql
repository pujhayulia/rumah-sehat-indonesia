-- Perbaikan: infinite recursion pada RLS tabel profiles.
--
-- Penyebab: kebijakan "owner read all profiles" / "owner update all profiles"
-- melakukan subquery ke tabel profiles itu sendiri untuk mengecek role user
-- saat ini. Subquery itu ikut kena RLS lagi, yang di dalamnya ada kebijakan
-- yang sama lagi → Postgres mendeteksi loop tak berujung dan menolak query
-- ("infinite recursion detected in policy for relation profiles"). Ini juga
-- ikut merusak akses ke visits/cash_transactions/therapists/services karena
-- kebijakan di tabel-tabel itu juga melakukan subquery ke profiles.
--
-- Solusi: pindahkan pengecekan role/cabang ke function SECURITY DEFINER.
-- Function seperti ini dieksekusi dengan hak akses pemiliknya (bukan user
-- yang login), sehingga query di dalamnya tidak lagi kena RLS — jadi tidak
-- ada lagi loop.

create or replace function fn_is_owner()
returns boolean as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'owner');
$$ language sql security definer stable;

create or replace function fn_current_branch_id()
returns uuid as $$
  select branch_id from profiles where id = auth.uid();
$$ language sql security definer stable;

-- profiles
drop policy if exists "owner read all profiles" on profiles;
create policy "owner read all profiles" on profiles for select using (fn_is_owner());

drop policy if exists "owner update all profiles" on profiles;
create policy "owner update all profiles" on profiles for update using (fn_is_owner());

-- therapists
drop policy if exists "owner insert therapists" on therapists;
create policy "owner insert therapists" on therapists for insert with check (fn_is_owner());
drop policy if exists "owner update therapists" on therapists;
create policy "owner update therapists" on therapists for update using (fn_is_owner());
drop policy if exists "owner delete therapists" on therapists;
create policy "owner delete therapists" on therapists for delete using (fn_is_owner());

-- services
drop policy if exists "owner insert services" on services;
create policy "owner insert services" on services for insert with check (fn_is_owner());
drop policy if exists "owner update services" on services;
create policy "owner update services" on services for update using (fn_is_owner());
drop policy if exists "owner delete services" on services;
create policy "owner delete services" on services for delete using (fn_is_owner());

-- visits
drop policy if exists "owner full access visits" on visits;
create policy "owner full access visits" on visits for all
  using (fn_is_owner()) with check (fn_is_owner());
drop policy if exists "resepsionis own branch visits" on visits;
create policy "resepsionis own branch visits" on visits for all
  using (fn_current_branch_id() = branch_id) with check (fn_current_branch_id() = branch_id);

-- cash_transactions
drop policy if exists "owner full access cash_transactions" on cash_transactions;
create policy "owner full access cash_transactions" on cash_transactions for all
  using (fn_is_owner()) with check (fn_is_owner());
drop policy if exists "resepsionis own branch cash_transactions" on cash_transactions;
create policy "resepsionis own branch cash_transactions" on cash_transactions for all
  using (fn_current_branch_id() = branch_id) with check (fn_current_branch_id() = branch_id);
