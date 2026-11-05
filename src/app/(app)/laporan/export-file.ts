import "server-only";
import ExcelJS from "exceljs";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { formatRupiah } from "@/lib/format";
import type { ReportData } from "./report-data";

const BRAND: [number, number, number] = [234, 88, 12]; // oranye RSI
const RUPIAH_FMT = '"Rp" #,##0';

function formatTanggal(date: string) {
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${date}T00:00:00Z`)
  );
}

export function reportFileName(data: ReportData, ext: "pdf" | "xlsx") {
  const branch = data.branchLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return `laporan-rsi-${branch}-${data.from}-sd-${data.to}.${ext}`;
}

function dailyNote(r: ReportData["rows"][number]) {
  const notes: string[] = [];
  if (r.tidak_ada_pasien) {
    notes.push(`Tidak ada pasien${r.catatan_tidak_ada_pasien ? ` (${r.catatan_tidak_ada_pasien})` : ""}`);
  }
  if (Number(r.jumlah_pasien_istimewa) > 0) notes.push(`${r.jumlah_pasien_istimewa} pasien istimewa`);
  return notes.join("; ");
}

// =========================================================
// EXCEL
// =========================================================
export async function buildExcel(data: ReportData): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Sistem Resepsionis RSI";
  wb.created = new Date();

  const headerStyle = (row: ExcelJS.Row) => {
    row.font = { bold: true, color: { argb: "FFFFFFFF" } };
    row.eachCell((c) => {
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEA580C" } };
      c.alignment = { vertical: "middle" };
    });
  };

  // --- Ringkasan
  const ws = wb.addWorksheet("Ringkasan");
  ws.columns = [{ width: 28 }, { width: 22 }];
  ws.addRow(["Laporan Rumah Sehat Indonesia"]).font = { bold: true, size: 14 };
  ws.addRow(["Cabang", data.branchLabel]);
  ws.addRow(["Periode", `${formatTanggal(data.from)} s/d ${formatTanggal(data.to)}`]);
  ws.addRow([]);
  headerStyle(ws.addRow(["Keterangan", "Jumlah"]));
  ws.addRow(["Jumlah Pasien", data.totals.pasien]);
  ws.addRow(["Pasien Istimewa (gratis)", data.totals.istimewa]);
  for (const [label, value] of [
    ["Qris", data.totals.qris],
    ["Cash Masuk", data.totals.cash],
    ["Pengeluaran", data.totals.pengeluaran],
    ["Saldo", data.totals.saldo],
  ] as const) {
    const row = ws.addRow([label, value]);
    row.getCell(2).numFmt = RUPIAH_FMT;
    if (label === "Saldo") row.font = { bold: true };
  }

  if (data.isAll && data.perBranch.length > 0) {
    ws.addRow([]);
    ws.getColumn(3).width = 22;
    headerStyle(ws.addRow(["Cabang", "Pasien", "Saldo"]));
    for (const b of data.perBranch) {
      ws.addRow([b.name, b.pasien, b.saldo]).getCell(3).numFmt = RUPIAH_FMT;
    }
  }

  // --- Rekap Harian
  const daily = wb.addWorksheet("Rekap Harian");
  daily.columns = [
    { header: "Tanggal", key: "tanggal", width: 14 },
    ...(data.isAll ? [{ header: "Cabang", key: "cabang", width: 16 }] : []),
    { header: "Pasien", key: "pasien", width: 9 },
    { header: "Qris", key: "qris", width: 16, style: { numFmt: RUPIAH_FMT } },
    { header: "Cash", key: "cash", width: 16, style: { numFmt: RUPIAH_FMT } },
    { header: "Pengeluaran", key: "pengeluaran", width: 16, style: { numFmt: RUPIAH_FMT } },
    { header: "Saldo", key: "saldo", width: 16, style: { numFmt: RUPIAH_FMT } },
    { header: "Catatan", key: "catatan", width: 36 },
  ];
  headerStyle(daily.getRow(1));
  for (const r of [...data.rows].reverse()) {
    daily.addRow({
      tanggal: r.transaction_date,
      cabang: r.branch_name,
      pasien: Number(r.jumlah_pasien),
      qris: Number(r.total_qris),
      cash: Number(r.total_cash_masuk),
      pengeluaran: Number(r.total_pengeluaran),
      saldo: Number(r.saldo),
      catatan: dailyNote(r),
    });
  }
  daily.views = [{ state: "frozen", ySplit: 1 }];

  // --- Komisi Terapis
  const komisi = wb.addWorksheet("Komisi Terapis");
  komisi.columns = [
    { header: "Terapis", key: "name", width: 28 },
    { header: "Total Komisi", key: "total", width: 18, style: { numFmt: RUPIAH_FMT } },
  ];
  headerStyle(komisi.getRow(1));
  for (const c of data.commissionByTherapist) komisi.addRow(c);

  // --- Detail Kunjungan
  const detail = wb.addWorksheet("Detail Kunjungan");
  detail.columns = [
    { header: "Tanggal", key: "visit_date", width: 12 },
    { header: "Cabang", key: "branch_name", width: 14 },
    { header: "Pasien", key: "patient_name", width: 22 },
    { header: "Umur", key: "age", width: 7 },
    { header: "Keluhan", key: "complaint", width: 22 },
    { header: "Terapis", key: "therapist_name", width: 20 },
    { header: "Layanan", key: "service_name", width: 16 },
    { header: "Bayar", key: "payment_method", width: 8 },
    { header: "Harga", key: "price", width: 14, style: { numFmt: RUPIAH_FMT } },
    { header: "Komisi", key: "commission_amount", width: 14, style: { numFmt: RUPIAH_FMT } },
    { header: "Istimewa", key: "istimewa", width: 10 },
  ];
  headerStyle(detail.getRow(1));
  for (const v of data.visits) {
    detail.addRow({ ...v, payment_method: v.payment_method.toUpperCase(), istimewa: v.is_special ? "Ya" : "" });
  }
  detail.views = [{ state: "frozen", ySplit: 1 }];

  return (await wb.xlsx.writeBuffer()) as ArrayBuffer;
}

// =========================================================
// PDF
// =========================================================
export function buildPdf(data: ReportData): ArrayBuffer {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 40;

  // Kepala laporan
  doc.setFillColor(...BRAND);
  doc.rect(0, 0, pageW, 70, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Laporan Rumah Sehat Indonesia", margin, 32);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`${data.branchLabel}  |  ${formatTanggal(data.from)} s/d ${formatTanggal(data.to)}`, margin, 52);

  const tableBase = {
    margin: { left: margin, right: margin },
    styles: { fontSize: 9, cellPadding: 4, textColor: [38, 33, 15] as [number, number, number] },
    headStyles: { fillColor: BRAND, textColor: 255, fontStyle: "bold" as const },
    alternateRowStyles: { fillColor: [255, 247, 237] as [number, number, number] },
  };
  const lastY = () => (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  const section = (title: string, y: number) => {
    doc.setTextColor(38, 33, 15);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(title, margin, y);
    return y + 6;
  };

  // Ringkasan
  autoTable(doc, {
    ...tableBase,
    startY: section("Ringkasan", 95),
    head: [["Keterangan", "Jumlah"]],
    body: [
      ["Jumlah Pasien", String(data.totals.pasien)],
      ["Pasien Istimewa (gratis)", String(data.totals.istimewa)],
      ["Qris", formatRupiah(data.totals.qris)],
      ["Cash Masuk", formatRupiah(data.totals.cash)],
      ["Pengeluaran", formatRupiah(data.totals.pengeluaran)],
      ["Saldo", formatRupiah(data.totals.saldo)],
    ],
    columnStyles: { 1: { halign: "right" } },
    tableWidth: 300,
  });

  if (data.isAll && data.perBranch.length > 0) {
    autoTable(doc, {
      ...tableBase,
      startY: section("Per Cabang", lastY() + 24),
      head: [["Cabang", "Pasien", "Saldo"]],
      body: data.perBranch.map((b) => [b.name, String(b.pasien), formatRupiah(b.saldo)]),
      columnStyles: { 1: { halign: "right" }, 2: { halign: "right" } },
      tableWidth: 300,
    });
  }

  // Rekap harian
  autoTable(doc, {
    ...tableBase,
    startY: section("Rekap per Hari", lastY() + 24),
    head: [["Tanggal", ...(data.isAll ? ["Cabang"] : []), "Pasien", "Qris", "Cash", "Pengeluaran", "Saldo", "Catatan"]],
    body:
      data.rows.length === 0
        ? [[{ content: "Tidak ada data pada rentang ini.", colSpan: data.isAll ? 8 : 7 }]]
        : [...data.rows].reverse().map((r) => [
            r.transaction_date,
            ...(data.isAll ? [r.branch_name] : []),
            String(r.jumlah_pasien),
            formatRupiah(Number(r.total_qris)),
            formatRupiah(Number(r.total_cash_masuk)),
            formatRupiah(Number(r.total_pengeluaran)),
            formatRupiah(Number(r.saldo)),
            dailyNote(r),
          ]),
    columnStyles: data.isAll
      ? { 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" }, 5: { halign: "right" }, 6: { halign: "right" } }
      : { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" }, 5: { halign: "right" } },
  });

  // Komisi terapis
  autoTable(doc, {
    ...tableBase,
    startY: section("Rekap Komisi per Terapis", lastY() + 24),
    head: [["Terapis", "Total Komisi"]],
    body:
      data.commissionByTherapist.length === 0
        ? [[{ content: "Tidak ada data pada rentang ini.", colSpan: 2 }]]
        : data.commissionByTherapist.map((c) => [c.name, formatRupiah(c.total)]),
    columnStyles: { 1: { halign: "right" } },
    tableWidth: 300,
  });

  // Nomor halaman & tanggal cetak
  const pages = doc.getNumberOfPages();
  const printed = new Intl.DateTimeFormat("id-ID", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date());
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 140);
    const h = doc.internal.pageSize.getHeight();
    doc.text(`Dicetak ${printed} WIB`, margin, h - 20);
    doc.text(`Hal. ${i} / ${pages}`, pageW - margin, h - 20, { align: "right" });
  }

  return doc.output("arraybuffer");
}
