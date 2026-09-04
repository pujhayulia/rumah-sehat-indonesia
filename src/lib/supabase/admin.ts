import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Client dengan hak akses penuh (service role) — hanya boleh dipakai di
 * Server Action / Server Component, TIDAK PERNAH di file "use client".
 * `import "server-only"` di atas akan membuat build gagal kalau file ini
 * ketarik ke bundle client secara tidak sengaja.
 */
export function createAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
