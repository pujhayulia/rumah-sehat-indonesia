"use client";

import { useEffect, useRef, useState } from "react";
import { formatRupiah } from "@/lib/format";

export interface FinancePoint {
  date: string; // YYYY-MM-DD
  income: number;
  expense: number;
}

const RANGES = [7, 30, 90] as const;
const HEIGHT = 240;
const PAD = { top: 16, right: 12, bottom: 28, left: 56 };

function shortRupiah(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} jt`;
  if (n >= 1_000) return `${Math.round(n / 1_000)} rb`;
  return String(n);
}

function shortDate(date: string) {
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", timeZone: "UTC" }).format(
    new Date(`${date}T00:00:00Z`)
  );
}

// Batas atas sumbu Y yang "bulat" supaya garis bantunya enak dibaca
function niceMax(value: number) {
  if (value <= 0) return 100_000;
  const exp = Math.pow(10, Math.floor(Math.log10(value)));
  const steps = [1, 2, 2.5, 5, 10];
  const step = steps.find((s) => s * exp >= value) ?? 10;
  return step * exp;
}

export function FinanceChart({ data }: { data: FinancePoint[] }) {
  const [range, setRange] = useState<(typeof RANGES)[number]>(30);
  const [hover, setHover] = useState<number | null>(null);
  const [width, setWidth] = useState(640);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(280, entry.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const points = data.slice(-range);
  const totalIncome = points.reduce((s, p) => s + p.income, 0);
  const totalExpense = points.reduce((s, p) => s + p.expense, 0);

  const plotW = width - PAD.left - PAD.right;
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const yMax = niceMax(Math.max(0, ...points.map((p) => Math.max(p.income, p.expense))));
  const x = (i: number) => PAD.left + (points.length <= 1 ? plotW / 2 : (i / (points.length - 1)) * plotW);
  const y = (v: number) => PAD.top + plotH - (v / yMax) * plotH;
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * yMax);
  const xLabelEvery = Math.max(1, Math.ceil(points.length / Math.max(2, Math.floor(plotW / 70))));

  const path = (key: "income" | "expense") =>
    points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p[key]).toFixed(1)}`).join(" ");

  function handlePointer(e: React.PointerEvent<SVGRectElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const ratio = points.length <= 1 ? 0 : px / rect.width;
    setHover(Math.min(points.length - 1, Math.max(0, Math.round(ratio * (points.length - 1)))));
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowRight") setHover((h) => Math.min(points.length - 1, (h ?? -1) + 1));
    if (e.key === "ArrowLeft") setHover((h) => Math.max(0, (h ?? points.length) - 1));
    if (e.key === "Escape") setHover(null);
  }

  const hovered = hover !== null ? points[hover] : null;
  const tooltipLeft = hover !== null ? Math.min(Math.max(x(hover) - 80, 0), width - 168) : 0;

  return (
    <div className="card viz-root flex flex-col gap-3 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Grafik Keuangan</h2>
          <p className="text-xs text-zinc-500">Pemasukan dan pengeluaran per hari, {range} hari terakhir</p>
        </div>
        <div className="flex gap-1" role="group" aria-label="Rentang waktu">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => {
                setRange(r);
                setHover(null);
              }}
              aria-pressed={range === r}
              className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
                range === r
                  ? "border-orange-500 bg-orange-50 text-orange-700 dark:border-orange-400 dark:bg-orange-950/30 dark:text-orange-300"
                  : "border-zinc-200 text-zinc-500 hover:border-orange-300 dark:border-zinc-700 dark:text-zinc-400"
              }`}
            >
              {r} hari
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-zinc-600 dark:text-zinc-400">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 rounded" style={{ background: "var(--viz-income)" }} />
          Pemasukan <strong className="text-zinc-900 dark:text-zinc-100">{formatRupiah(totalIncome)}</strong>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 rounded" style={{ background: "var(--viz-expense)" }} />
          Pengeluaran <strong className="text-zinc-900 dark:text-zinc-100">{formatRupiah(totalExpense)}</strong>
        </span>
        <span>
          Saldo{" "}
          <strong className="text-zinc-900 dark:text-zinc-100">{formatRupiah(totalIncome - totalExpense)}</strong>
        </span>
      </div>

      <div ref={wrapRef} className="relative w-full overflow-hidden">
        <svg
          width={width}
          height={HEIGHT}
          role="img"
          aria-label={`Grafik pemasukan dan pengeluaran ${range} hari terakhir`}
          tabIndex={0}
          onKeyDown={handleKey}
          onBlur={() => setHover(null)}
          className="block outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
        >
          {yTicks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--viz-grid)" strokeWidth={1} />
              <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill="var(--viz-axis)">
                {shortRupiah(t)}
              </text>
            </g>
          ))}

          {points.map((p, i) =>
            i % xLabelEvery === 0 || i === points.length - 1 ? (
              <text
                key={p.date}
                x={x(i)}
                y={HEIGHT - 8}
                textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"}
                fontSize={11}
                fill="var(--viz-axis)"
              >
                {shortDate(p.date)}
              </text>
            ) : null
          )}

          {hover !== null && (
            <line
              x1={x(hover)}
              x2={x(hover)}
              y1={PAD.top}
              y2={PAD.top + plotH}
              stroke="var(--viz-axis)"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
          )}

          <path d={path("expense")} fill="none" stroke="var(--viz-expense)" strokeWidth={2} strokeLinejoin="round" />
          <path d={path("income")} fill="none" stroke="var(--viz-income)" strokeWidth={2} strokeLinejoin="round" />

          {hovered && hover !== null && (
            <>
              <circle cx={x(hover)} cy={y(hovered.expense)} r={4.5} fill="var(--viz-expense)" stroke="var(--viz-surface)" strokeWidth={2} />
              <circle cx={x(hover)} cy={y(hovered.income)} r={4.5} fill="var(--viz-income)" stroke="var(--viz-surface)" strokeWidth={2} />
            </>
          )}

          <rect
            x={PAD.left}
            y={PAD.top}
            width={plotW}
            height={plotH}
            fill="transparent"
            onPointerMove={handlePointer}
            onPointerDown={handlePointer}
            onPointerLeave={() => setHover(null)}
          />
        </svg>

        {hovered && (
          <div
            className="pointer-events-none absolute top-2 w-40 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs shadow-md dark:border-zinc-700 dark:bg-zinc-900"
            style={{ left: tooltipLeft }}
          >
            <p className="mb-1 text-zinc-500">{shortDate(hovered.date)}</p>
            <p className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-zinc-500">
                <span className="inline-block h-0.5 w-3 rounded" style={{ background: "var(--viz-income)" }} />
                Masuk
              </span>
              <strong className="text-zinc-900 dark:text-zinc-100">{formatRupiah(hovered.income)}</strong>
            </p>
            <p className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-zinc-500">
                <span className="inline-block h-0.5 w-3 rounded" style={{ background: "var(--viz-expense)" }} />
                Keluar
              </span>
              <strong className="text-zinc-900 dark:text-zinc-100">{formatRupiah(hovered.expense)}</strong>
            </p>
            <p className="mt-1 flex items-center justify-between gap-2 border-t border-zinc-100 pt-1 dark:border-zinc-800">
              <span className="text-zinc-500">Saldo</span>
              <strong className="text-zinc-900 dark:text-zinc-100">
                {formatRupiah(hovered.income - hovered.expense)}
              </strong>
            </p>
          </div>
        )}
      </div>

      <details className="text-xs text-zinc-500">
        <summary className="cursor-pointer select-none hover:text-orange-700 dark:hover:text-orange-300">
          Lihat dalam tabel
        </summary>
        <div className="mt-2 max-h-64 overflow-y-auto">
          <table className="w-full">
            <thead>
              <tr className="table-head-row">
                <th className="px-2 py-1 font-medium">Tanggal</th>
                <th className="px-2 py-1 text-right font-medium">Pemasukan</th>
                <th className="px-2 py-1 text-right font-medium">Pengeluaran</th>
                <th className="px-2 py-1 text-right font-medium">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {[...points].reverse().map((p) => (
                <tr key={p.date} className="table-row">
                  <td className="px-2 py-1">{shortDate(p.date)}</td>
                  <td className="px-2 py-1 text-right">{formatRupiah(p.income)}</td>
                  <td className="px-2 py-1 text-right">{formatRupiah(p.expense)}</td>
                  <td className="px-2 py-1 text-right">{formatRupiah(p.income - p.expense)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
