-- Perbaikan: policy "public insert bookings" ternyata masih menolak insert
-- dari anon. Bikin ulang lebih eksplisit dengan target role anon &
-- authenticated (bukan mengandalkan default "berlaku untuk semua role").

drop policy if exists "public insert bookings" on bookings;

create policy "public insert bookings" on bookings
  for insert
  to anon, authenticated
  with check (true);

-- Sekalian pastikan role anon punya izin dasar (privilege) insert ke tabel
-- ini — RLS policy saja tidak cukup kalau grant dasarnya belum ada.
grant insert on bookings to anon;
grant select on branches to anon;
grant select on services to anon;
