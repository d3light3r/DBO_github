import ExcelJS from "exceljs";
import { NextResponse, type NextRequest } from "next/server";
import { requireStaffAdmin } from "@/lib/auth";
import { parseFilters, talonQuery, type TalonRow } from "@/lib/talon-query";
import { fmtDate, fmtDateTime, todayUB } from "@/lib/time";

const CHUNK = 1000; // Supabase нэг хүсэлтэд 1000 мөр буцаадаг
const MAX_ROWS = 200000;

export async function GET(req: NextRequest) {
  const me = await requireStaffAdmin();
  const f = parseFilters(Object.fromEntries(req.nextUrl.searchParams));

  const rows: TalonRow[] = [];
  for (let off = 0; off < MAX_ROWS; off += CHUNK) {
    const { data, error } = await talonQuery(me.organization_id, f).range(off, off + CHUNK - 1);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    rows.push(...((data ?? []) as unknown as TalonRow[]));
    if (!data || data.length < CHUNK) break;
  }

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Талон");
  ws.columns = [
    { header: "Төрөл (₮)", key: "type", width: 11 },
    { header: "Сериал", key: "serial", width: 13 },
    { header: "Харилцагч", key: "customer", width: 28 },
    { header: "Зарсан огноо", key: "sold", width: 13 },
    { header: "Оруулсан огноо", key: "redeemed", width: 14 },
    { header: "Салбар", key: "branch", width: 22 },
    { header: "Ажилтан", key: "emp", width: 22 },
    { header: "Бүртгэсэн цаг", key: "rec", width: 17 },
  ];
  ws.getRow(1).font = { bold: true };
  for (const r of rows) {
    ws.addRow({
      type: r.denomination,
      serial: r.serial,
      customer: r.customer?.name ?? "",
      sold: fmtDate(r.sold_date),
      redeemed: r.redeemed_date ? fmtDate(r.redeemed_date) : "",
      branch: r.branch?.name ?? "",
      emp: r.redeemer?.full_name ?? "",
      rec: r.redeemed_recorded_at ? fmtDateTime(r.redeemed_recorded_at) : "",
    });
  }
  ws.getColumn("type").numFmt = "#,##0";
  ws.views = [{ state: "frozen", ySplit: 1 }];

  const buf = await wb.xlsx.writeBuffer();
  return new NextResponse(buf as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="talon-${todayUB()}.xlsx"`,
    },
  });
}
