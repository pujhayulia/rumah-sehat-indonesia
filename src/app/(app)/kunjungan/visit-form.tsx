"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Branch, Service, ServicePrice, Therapist } from "@/types/database";
import { createVisits } from "./actions";

interface LineItem {
  key: string;
  therapistId: string;
  serviceId: string;
  paymentMethod: "cash" | "qris";
  note: string;
}

function makeLine(key: string, therapistId: string, serviceId: string): LineItem {
  return { key, therapistId, serviceId, paymentMethod: "cash", note: "" };
}

export function VisitForm({
  branches,
  lockedBranch,
  defaultBranchId,
  therapists,
  services,
  prices,
  initialPatientName,
  initialServiceId,
  bookingId,
  visitDate,
  maxDate,
}: {
  branches: Branch[];
  lockedBranch: { id: string; name: string } | null;
  defaultBranchId: string | null;
  therapists: Therapist[];
  services: Service[];
  prices: ServicePrice[];
  initialPatientName?: string;
  initialServiceId?: string;
  bookingId?: string;
  visitDate: string;
  maxDate: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const keyCounter = useRef(0);

  const [branchId, setBranchId] = useState(lockedBranch?.id ?? defaultBranchId ?? branches[0]?.id ?? "");
  const therapistsInBranch = useMemo(
    () => therapists.filter((t) => t.branch_id === branchId),
    [therapists, branchId]
  );

  // Harga & fee mengikuti cabang; layanan tanpa harga di cabang ini tidak ditampilkan.
  const priceByKey = useMemo(
    () => new Map(prices.map((p) => [`${p.branch_id}:${p.service_id}`, p])),
    [prices]
  );
  const servicesIn = (bId: string) => services.filter((s) => priceByKey.has(`${bId}:${s.id}`));
  const servicesInBranch = servicesIn(branchId);
  const priceOf = (serviceId: string) => priceByKey.get(`${branchId}:${serviceId}`);

  const [isSpecial, setIsSpecial] = useState(false);
  const [patientName, setPatientName] = useState(initialPatientName ?? "");
  const [age, setAge] = useState("");
  const [complaint, setComplaint] = useState("");
  const [recommendation, setRecommendation] = useState("");

  function nextKey() {
    keyCounter.current += 1;
    return `line-${keyCounter.current}`;
  }

  const [lines, setLines] = useState<LineItem[]>(() => [
    makeLine(
      "line-0",
      therapistsInBranch[0]?.id ?? "",
      servicesInBranch.some((s) => s.id === initialServiceId) ? initialServiceId! : servicesInBranch[0]?.id ?? ""
    ),
  ]);

  function handleBranchChange(value: string) {
    setBranchId(value);
    const firstTherapist = therapists.find((t) => t.branch_id === value);
    const available = servicesIn(value);
    setLines((prev) =>
      prev.map((line) => ({
        ...line,
        therapistId: firstTherapist?.id ?? "",
        serviceId: available.some((s) => s.id === line.serviceId) ? line.serviceId : available[0]?.id ?? "",
      }))
    );
  }

  function updateLine(key: string, patch: Partial<LineItem>) {
    setLines((prev) => prev.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  }

  function addLine() {
    setLines((prev) => [...prev, makeLine(nextKey(), therapistsInBranch[0]?.id ?? "", servicesInBranch[0]?.id ?? "")]);
  }

  function removeLine(key: string) {
    setLines((prev) => (prev.length > 1 ? prev.filter((line) => line.key !== key) : prev));
  }

  // Pasien istimewa: gratis untuk pasien, terapis juga tidak dapat fee.
  const lineAmounts = (serviceId: string) => {
    const p = priceOf(serviceId);
    if (!p || isSpecial) return { price: 0, commission: 0 };
    return { price: Number(p.price), commission: Number(p.commission_amount) };
  };
  const totalPrice = lines.reduce((sum, l) => sum + lineAmounts(l.serviceId).price, 0);
  const totalCommission = lines.reduce((sum, l) => sum + lineAmounts(l.serviceId).commission, 0);

  // Tanggal disimpan di URL, jadi daftar kunjungan di bawah ikut menampilkan tanggal itu
  function handleDateChange(value: string) {
    if (!value || value > maxDate) return;
    const next = new URLSearchParams(searchParams.toString());
    if (value === maxDate) next.delete("date");
    else next.set("date", value);
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  function resetForm() {
    setPatientName("");
    setAge("");
    setComplaint("");
    setRecommendation("");
    setIsSpecial(false);
    setLines([makeLine(nextKey(), therapistsInBranch[0]?.id ?? "", servicesInBranch[0]?.id ?? "")]);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!branchId) {
      setError("Pilih cabang terlebih dahulu.");
      return;
    }
    if (lines.some((l) => !l.therapistId || !l.serviceId || !priceOf(l.serviceId))) {
      setError("Setiap layanan harus punya terapis dan jenis layanan.");
      return;
    }
    setError(null);

    startTransition(async () => {
      const result = await createVisits({
        branchId,
        patientName,
        age: age ? Number(age) : null,
        complaint,
        recommendation,
        visitDate,
        isSpecial,
        items: lines.map((l) => {
          const amounts = lineAmounts(l.serviceId);
          return {
            therapistId: l.therapistId,
            serviceId: l.serviceId,
            price: amounts.price,
            commissionAmount: amounts.commission,
            paymentMethod: l.paymentMethod,
            note: l.note,
          };
        }),
        bookingId,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      if (bookingId) {
        router.push("/booking");
        router.refresh();
        return;
      }

      resetForm();
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="card flex flex-col gap-4 p-4">
      <div>
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Tambah Kunjungan</h2>
        {bookingId && (
          <p className="mt-1 text-xs text-green-700 dark:text-green-400">
            Diisi otomatis dari booking — lengkapi terapis &amp; metode bayar, lalu simpan.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="field-label">Cabang</label>
          {lockedBranch ? (
            <div className="rounded-lg border border-orange-100 bg-orange-50/60 px-3 py-2 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
              {lockedBranch.name}
            </div>
          ) : (
            <select value={branchId} onChange={(e) => handleBranchChange(e.target.value)} className="field-input">
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className="field-label">Tanggal Kunjungan</label>
          <input
            type="date"
            required
            max={maxDate}
            value={visitDate}
            onChange={(e) => handleDateChange(e.target.value)}
            className="field-input"
          />
          {visitDate !== maxDate && (
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
              Menginput data untuk tanggal yang sudah lewat.{" "}
              <button type="button" onClick={() => handleDateChange(maxDate)} className="font-medium underline">
                Kembali ke hari ini
              </button>
            </p>
          )}
        </div>

        <div>
          <label className="field-label">Nama Pasien</label>
          <input
            required
            value={patientName}
            onChange={(e) => setPatientName(e.target.value)}
            className="field-input"
          />
        </div>

        <div>
          <label className="field-label">Umur</label>
          <input
            type="number"
            min={0}
            value={age}
            onChange={(e) => setAge(e.target.value)}
            className="field-input"
          />
        </div>

        <div>
          <label className="field-label">Penyakit / Keluhan</label>
          <input value={complaint} onChange={(e) => setComplaint(e.target.value)} className="field-input" />
        </div>

        <div>
          <label className="field-label">Rekomendasi</label>
          <input
            value={recommendation}
            onChange={(e) => setRecommendation(e.target.value)}
            className="field-input"
          />
        </div>

        <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-orange-100 bg-orange-50/40 px-3 py-2 text-sm sm:col-span-2 dark:border-zinc-800 dark:bg-zinc-950">
          <input
            type="checkbox"
            checked={isSpecial}
            onChange={(e) => setIsSpecial(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-orange-600"
          />
          <span>
            <span className="font-medium text-zinc-800 dark:text-zinc-200">Pasien Istimewa (gratis)</span>
            <span className="block text-xs text-zinc-500">
              Biaya terapi Rp0 dan terapis tidak mendapat fee untuk kunjungan ini.
            </span>
          </span>
        </label>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="field-label mb-0">Layanan ({lines.length})</label>
          <button type="button" onClick={addLine} className="btn-secondary shrink-0 px-2 py-1 text-xs">
            + Tambah Layanan
          </button>
        </div>

        {lines.map((line, index) => {
          const amounts = lineAmounts(line.serviceId);
          return (
            <div
              key={line.key}
              className="grid grid-cols-1 gap-2 rounded-xl border border-orange-100 bg-orange-50/40 p-3 dark:border-zinc-800 dark:bg-zinc-950 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto_auto]"
            >
              <div>
                <label className="mb-1 block text-[11px] font-medium text-zinc-500">Terapis #{index + 1}</label>
                <select
                  value={line.therapistId}
                  onChange={(e) => updateLine(line.key, { therapistId: e.target.value })}
                  className="field-input bg-white px-2 py-1.5 dark:bg-zinc-900"
                >
                  {therapistsInBranch.length === 0 && <option value="">Belum ada terapis</option>}
                  {therapistsInBranch.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-medium text-zinc-500">Layanan</label>
                <select
                  value={line.serviceId}
                  onChange={(e) => updateLine(line.key, { serviceId: e.target.value })}
                  className="field-input bg-white px-2 py-1.5 dark:bg-zinc-900"
                >
                  {servicesInBranch.length === 0 && <option value="">Belum ada layanan di cabang ini</option>}
                  {servicesInBranch.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} — Rp {Number(priceOf(s.id)?.price ?? 0).toLocaleString("id-ID")}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-medium text-zinc-500">Bayar</label>
                <div className="flex gap-1">
                  {(["cash", "qris"] as const).map((method) => (
                    <button
                      type="button"
                      key={method}
                      onClick={() => updateLine(line.key, { paymentMethod: method })}
                      className={`toggle-btn px-2 py-1.5 text-xs ${
                        line.paymentMethod === method ? "toggle-btn-active" : "toggle-btn-inactive"
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-end justify-between gap-2 sm:flex-col sm:items-end">
                {line.serviceId && (
                  <span className="text-[11px] text-zinc-500">
                    Fee Rp {amounts.commission.toLocaleString("id-ID")}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => removeLine(line.key)}
                  disabled={lines.length === 1}
                  className="btn-danger-text"
                >
                  Hapus
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-lg bg-orange-50/60 px-3 py-2 text-xs text-zinc-600 dark:bg-orange-950/20 dark:text-zinc-400">
        <span>
          Total harga: Rp {totalPrice.toLocaleString("id-ID")}
          {isSpecial && <span className="badge badge-orange ml-2">Pasien Istimewa</span>}
        </span>
        <span>Total komisi terapis: Rp {totalCommission.toLocaleString("id-ID")}</span>
      </div>

      {error && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:bg-rose-950/30 dark:text-rose-400">
          {error}
        </p>
      )}

      <div>
        <button type="submit" disabled={isPending} className="btn-primary">
          {isPending ? "Menyimpan..." : `Simpan Kunjungan (${lines.length} layanan)`}
        </button>
      </div>
    </form>
  );
}
