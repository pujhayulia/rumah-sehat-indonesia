import { getCurrentProfile } from "@/lib/supabase/profile";
import { resolveBranchSelection } from "@/lib/branch";
import { getReportData, resolveRange } from "../report-data";
import { buildExcel, buildPdf, reportFileName } from "../export-file";

// Download laporan: /laporan/export?format=pdf|xlsx&from=...&to=...&branch=...
// Resepsionis selalu dikunci ke cabangnya sendiri (parameter branch diabaikan).
export async function GET(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile) return new Response("Silakan login dulu.", { status: 401 });

  const url = new URL(request.url);
  const format = url.searchParams.get("format") === "xlsx" ? "xlsx" : "pdf";
  const selection = resolveBranchSelection(profile, { branch: url.searchParams.get("branch") ?? undefined });
  const range = resolveRange({
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
  });

  const data = await getReportData(selection, range);
  const body = format === "xlsx" ? await buildExcel(data) : buildPdf(data);

  return new Response(body, {
    headers: {
      "Content-Type":
        format === "xlsx"
          ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          : "application/pdf",
      "Content-Disposition": `attachment; filename="${reportFileName(data, format)}"`,
      "Cache-Control": "no-store",
    },
  });
}
