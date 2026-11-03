"use client";

import { useState, useTransition } from "react";
import type { Branch, Service, ServicePrice } from "@/types/database";
import { createBooking } from "./actions";

function toDateInput(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function BookingForm({
  branches,
  services,
  prices,
}: {
  branches: Branch[];
  services: Service[];
  prices: ServicePrice[];
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const [branchId, setBranchId] = useState(branches[0]?.id ?? "");
  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [visitDate, setVisitDate] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [note, setNote] = useState("");

  const today = toDateInput(new Date());

  // hanya tampilkan layanan yang tersedia di cabang terpilih, dengan harga cabang itu
  const servicesInBranch = services.flatMap((service) => {
    const p = prices.find((x) => x.service_id === service.id && x.branch_id === branchId);
    return p ? [{ service, price: p.price }] : [];
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await createBooking({
        branchId,
        patientName,
        patientPhone,
        visitDate,
        serviceId: serviceId || null,
        note,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      setDone(true);
    });
  }

  if (done) {
    return (
      <div className="card p-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
          <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
            <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Pendaftaran Terkirim</h2>
        <p className="mt-2 text-sm text-zinc-500">
          Terima kasih, {patientName}. Tim kami akan menghubungi Anda lewat WhatsApp/telepon ke nomor{" "}
          <span className="font-medium text-zinc-700 dark:text-zinc-300">{patientPhone}</span> untuk konfirmasi jam
          kedatangan.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
      <div>
        <label className="field-label">Cabang</label>
        <select
          required
          value={branchId}
          onChange={(e) => {
            setBranchId(e.target.value);
            setServiceId("");
          }}
          className="field-input"
        >
          {branches.length === 0 && <option value="">Belum ada cabang</option>}
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="field-label">Tanggal Kedatangan</label>
        <input
          type="date"
          required
          min={today}
          value={visitDate}
          onChange={(e) => setVisitDate(e.target.value)}
          className="field-input"
        />
      </div>

      <div>
        <label className="field-label">Nama Lengkap</label>
        <input required value={patientName} onChange={(e) => setPatientName(e.target.value)} className="field-input" />
      </div>

      <div>
        <label className="field-label">No. WhatsApp / Telepon</label>
        <input
          type="tel"
          required
          value={patientPhone}
          onChange={(e) => setPatientPhone(e.target.value)}
          placeholder="08xxxxxxxxxx"
          className="field-input"
        />
      </div>

      <div className="sm:col-span-2">
        <label className="field-label">Layanan yang Diinginkan (opsional)</label>
        <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} className="field-input">
          <option value="">Belum tahu / bebas</option>
          {servicesInBranch.map(({ service: s, price }) => (
            <option key={s.id} value={s.id}>
              {s.name} — Rp {Number(price).toLocaleString("id-ID")}
            </option>
          ))}
        </select>
      </div>

      <div className="sm:col-span-2">
        <label className="field-label">Catatan Tambahan (opsional)</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="mis. keluhan, jam yang disukai, dll"
          className="field-input"
        />
      </div>

      {error && (
        <p className="sm:col-span-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:bg-rose-950/30 dark:text-rose-400">
          {error}
        </p>
      )}

      <div className="sm:col-span-2">
        <button type="submit" disabled={isPending || branches.length === 0} className="btn-primary w-full">
          {isPending ? "Mengirim..." : "Daftar Sekarang"}
        </button>
      </div>
    </form>
  );
}
