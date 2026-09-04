-- Izinkan Owner menambah cabang baru langsung dari aplikasi
-- (sebelumnya branches cuma bisa dibaca, tidak ada yang boleh insert).

create policy "owner insert branches" on branches for insert with check (fn_is_owner());
