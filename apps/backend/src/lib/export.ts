import type { Response } from "express";
import { badRequest } from "./errors";
import { xlsxBuffer } from "./xlsx";

export type Column<T> = { header: string; value: (row: T) => string | number | null | undefined };
export type ExportFormat = "csv" | "xlsx";

export const parseFormat = (v: unknown): ExportFormat => {
  if (v === undefined || v === "csv") return "csv";
  if (v === "xlsx") return "xlsx";
  throw badRequest("Export format must be csv or xlsx.");
};

/** CSV cell: quoted when needed, and formula-injection safe (=, +, -, @ get a leading '). */
function csvCell(v: string | number | null | undefined) {
  if (v === null || v === undefined) return "";
  let s = String(v);
  if (typeof v === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv<T>(columns: Column<T>[], rows: T[]) {
  const lines = [columns.map((c) => csvCell(c.header)).join(",")];
  for (const row of rows) lines.push(columns.map((c) => csvCell(c.value(row))).join(","));
  return "﻿" + lines.join("\r\n") + "\r\n"; // BOM so Excel reads ₹ and Tamil correctly
}

/** Sends a table as a CSV or Excel download. `name` has no extension. */
export function sendTable<T>(res: Response, format: ExportFormat, name: string, columns: Column<T>[], rows: T[]) {
  const safe = name.replace(/[^\w.-]+/g, "-").slice(0, 80);
  if (format === "xlsx") {
    const buf = xlsxBuffer(
      safe,
      columns.map((c) => c.header),
      rows.map((r) => columns.map((c) => c.value(r) ?? null)),
    );
    res.set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.set("Content-Disposition", `attachment; filename="${safe}.xlsx"`);
    res.send(buf);
    return;
  }
  res.set("Content-Type", "text/csv; charset=utf-8");
  res.set("Content-Disposition", `attachment; filename="${safe}.csv"`);
  res.send(toCsv(columns, rows));
}
