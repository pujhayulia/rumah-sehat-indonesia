-- Fitur: pendaftaran/booking publik (link tanpa login) yang masuk ke
-- daftar "Booking Masuk" resepsionis. Pasien pilih cabang & tanggal
-- kedatangan yang diinginkan; resepsionis lihat & konfirmasi manual
-- (belum ada slot jam praktik, jadi cukup tanggal saja).

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

alter table bookings enable row level security;

-- Siapa saja (termasuk yang belum login / anon) boleh daftar lewat form publik.
create policy "public insert bookings" on bookings for insert with check (true);

-- Owner lihat & kelola semua booking; resepsionis cuma booking cabangnya sendiri.
create policy "owner full access bookings" on bookings for all
  using (fn_is_owner()) with check (fn_is_owner());
create policy "resepsionis read own branch bookings" on bookings for select
  using (fn_current_branch_id() = branch_id);
create policy "resepsionis update own branch bookings" on bookings for update
  using (fn_current_branch_id() = branch_id) with check (fn_current_branch_id() = branch_id);

-- Form publik perlu baca daftar cabang & layanan tanpa login.
create policy "public read branches" on branches for select using (true);
create policy "public read services" on services for select using (true);
