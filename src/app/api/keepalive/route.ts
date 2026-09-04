import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Dipanggil otomatis tiap hari oleh Vercel Cron (lihat vercel.json) supaya
 * project Supabase (paket Free) tidak dianggap "tidak aktif" dan di-pause
 * otomatis setelah 7 hari tanpa request — penting karena klinik cuma buka
 * hari kerja, dan libur panjang bisa lebih dari 7 hari.
 */
export async function GET() {
  const supabase = await createClient();
  const { error } = await supabase.from("branches").select("id").limit(1);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, checkedAt: new Date().toISOString() });
}
