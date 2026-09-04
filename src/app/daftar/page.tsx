import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { BookingForm } from "./booking-form";

export default async function DaftarPage() {
  const supabase = await createClient();
  const [{ data: branches }, { data: services }] = await Promise.all([
    supabase.from("branches").select("*").order("name"),
    supabase.from("services").select("*").eq("active", true).order("name"),
  ]);

  return (
    <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-gradient-to-b from-orange-50 via-white to-white px-4 py-10 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-950">
      <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-orange-300/30 blur-3xl dark:bg-orange-500/10" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-64 w-64 rounded-full bg-green-300/25 blur-3xl dark:bg-green-500/10" />

      <div className="relative w-full max-w-lg">
        <div className="mb-6 flex flex-col items-center text-center">
          <Image
            src="/logo-mark.png"
            alt="Rumah Sehat Indonesia"
            width={72}
            height={55}
            className="mb-3 h-16 w-auto"
            priority
          />
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Daftar Kunjungan</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Isi form di bawah untuk mendaftar kunjungan ke klinik Rumah Sehat Indonesia. Tim kami akan menghubungi
            untuk konfirmasi jam pasti.
          </p>
        </div>

        <BookingForm branches={branches ?? []} services={services ?? []} />
      </div>
    </div>
  );
}
