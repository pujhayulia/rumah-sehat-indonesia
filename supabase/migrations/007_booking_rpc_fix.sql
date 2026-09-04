-- Perbaikan akar masalah: PostgREST selalu melakukan INSERT ... RETURNING
-- di belakang layar, yang berarti butuh kebijakan SELECT juga supaya baris
-- yang baru diinsert "terlihat" -- padahal kita sengaja TIDAK mau anon bisa
-- SELECT data booking siapapun (nama & no. HP pasien lain).
--
-- Solusi: pasien daftar lewat function SECURITY DEFINER (submit_booking),
-- bukan insert langsung ke tabel. Function ini jalan dengan hak akses
-- pemiliknya sehingga tidak kena batasan RLS/RETURNING itu, dan cuma
-- mengembalikan status berhasil/gagal -- tidak membocorkan data booking
-- siapapun ke publik.

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

grant execute on function public.submit_booking(uuid, text, text, date, uuid, text) to anon, authenticated;

-- Sekarang insert langsung ke tabel dari luar tidak diperlukan lagi.
drop policy if exists "public insert bookings" on bookings;

-- Bersih-bersih function diagnostik yang dipakai buat debugging kemarin.
drop function if exists public.whoami();
