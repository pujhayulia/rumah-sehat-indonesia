import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Library pembuat file laporan (Excel/PDF) dijalankan langsung oleh Node.js,
  // tidak dibundel ulang oleh Next.js, supaya lebih stabil.
  serverExternalPackages: ["exceljs", "jspdf", "jspdf-autotable"],
};

export default nextConfig;
