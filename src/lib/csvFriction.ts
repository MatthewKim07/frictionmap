import { FRICTION_CATEGORIES, FREQUENCIES, SEVERITIES } from "@/constants/friction";
import type { FrictionCategory, Frequency, FrictionReport, Severity, Team } from "@/types";

const CAT = new Set<string>(FRICTION_CATEGORIES);
const FREQ = new Set<string>(FREQUENCIES);
const SEV = new Set<string>(SEVERITIES);

const CSV_HEADER =
  "title,description,category,team,process,timeLostHours,frequency,severity,suggestion,status";

export function frictionReportsCsvTemplate(): string {
  return [
    CSV_HEADER,
    "Example: Waiting on vendor PO approval,Finance waits 2+ days for PO numbers before invoicing,Approval bottleneck,Finance,Vendor procurement,2,weekly,high,Batch low-value POs weekly,open",
  ].join("\n");
}

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function exportFrictionReportsToCsv(reports: FrictionReport[]): string {
  const lines = [CSV_HEADER];
  for (const r of reports) {
    lines.push(
      [
        escapeCsvCell(r.title),
        escapeCsvCell(r.description),
        escapeCsvCell(r.category),
        escapeCsvCell(r.team),
        escapeCsvCell(r.process),
        String(r.timeLostHours),
        escapeCsvCell(r.frequency),
        escapeCsvCell(r.severity),
        escapeCsvCell(r.suggestion ?? ""),
        escapeCsvCell(r.status),
      ].join(","),
    );
  }
  return lines.join("\n");
}

/** Minimal roadmap export for spreadsheets. */
export function exportRoadmapSummaryCsv(
  rows: {
    problemTitle: string;
    category: string;
    process: string;
    priorityLevel: string;
    monthlyHours: number;
    monthlyCost: number;
    relatedCount: number;
    suggestedFix: string;
    firstStep: string;
  }[],
): string {
  const h = "problemTitle,category,process,priorityLevel,monthlyHours,monthlyCost,relatedReports,suggestedFix,firstStep";
  const lines = [h];
  for (const r of rows) {
    lines.push(
      [
        escapeCsvCell(r.problemTitle),
        escapeCsvCell(r.category),
        escapeCsvCell(r.process),
        escapeCsvCell(r.priorityLevel),
        String(Math.round(r.monthlyHours * 10) / 10),
        String(Math.round(r.monthlyCost)),
        String(r.relatedCount),
        escapeCsvCell(r.suggestedFix),
        escapeCsvCell(r.firstStep),
      ].join(","),
    );
  }
  return lines.join("\n");
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i]!;
    if (c === '"') {
      if (inQ && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQ = !inQ;
      }
    } else if (c === "," && !inQ) {
      out.push(cur.trim());
      cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur.trim());
  return out;
}

export interface CsvImportRowResult {
  rowIndex: number;
  report: FrictionReport | null;
  errors: string[];
}

export interface CsvImportOutcome {
  rows: CsvImportRowResult[];
  valid: FrictionReport[];
}

function normHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, "");
}

/**
 * Parses pasted CSV. First row must be headers (template-compatible).
 * Returns per-row errors; valid rows are FrictionReport-shaped with new ids and open status unless status column valid.
 */
export function parseFrictionReportsCsv(
  text: string,
  newId: () => string,
): CsvImportOutcome {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter((l) => l.length > 0);
  if (lines.length < 2) {
    return {
      rows: [{ rowIndex: 0, report: null, errors: ["Need a header row plus at least one data row."] }],
      valid: [],
    };
  }

  const headerCells = parseCsvLine(lines[0]!).map(normHeader);
  const idx = (name: string) => headerCells.indexOf(normHeader(name));

  const ti = idx("title");
  const di = idx("description");
  const ci = idx("category");
  const tei = idx("team");
  const pi = idx("process");
  const hi = idx("timelosthours");
  const fi = idx("frequency");
  const si = idx("severity");
  const sui = idx("suggestion");
  const sti = idx("status");

  const need = ["title", "description", "category", "team", "process", "timelosthours", "frequency", "severity"];
  const missing = need.filter((n) => idx(n) < 0);
  if (missing.length) {
    return {
      rows: [
        {
          rowIndex: 0,
          report: null,
          errors: [`Missing required columns: ${missing.join(", ")}. Expected: ${CSV_HEADER}`],
        },
      ],
      valid: [],
    };
  }

  const rows: CsvImportRowResult[] = [];
  const valid: FrictionReport[] = [];

  for (let r = 1; r < lines.length; r++) {
    const cells = parseCsvLine(lines[r]!);
    const err: string[] = [];

    const pick = (i: number) => (i >= 0 && i < cells.length ? cells[i]! : "").trim();

    const title = pick(ti);
    const description = pick(di);
    const categoryRaw = pick(ci);
    const teamRaw = pick(tei);
    const process = pick(pi);
    const hoursRaw = pick(hi);
    const frequencyRaw = pick(fi);
    const severityRaw = pick(si);
    const suggestion = sui >= 0 ? pick(sui) : "";
    const statusRaw = sti >= 0 ? pick(sti) : "open";

    if (!title) err.push("title is empty");
    if (!description) err.push("description is empty");
    if (!process) err.push("process is empty");

    let category = categoryRaw;
    if (!CAT.has(category)) err.push(`invalid category "${categoryRaw}"`);

    let team = teamRaw.trim();
    if (!team) err.push(`invalid team "${teamRaw}"`);
    if (team.length > 120) err.push("team label too long (max 120 chars)");

    const hours = Number(hoursRaw);
    if (!Number.isFinite(hours) || hours <= 0) err.push(`invalid timeLostHours "${hoursRaw}"`);

    let frequency = frequencyRaw;
    if (!FREQ.has(frequency)) err.push(`invalid frequency "${frequencyRaw}"`);

    let severity = severityRaw;
    if (!SEV.has(severity)) err.push(`invalid severity "${severityRaw}"`);

    let status = statusRaw;
    if (status && status !== "open" && status !== "reviewing" && status !== "planned" && status !== "resolved") {
      err.push(`invalid status "${statusRaw}"`);
      status = "open";
    }

    if (err.length) {
      rows.push({ rowIndex: r + 1, report: null, errors: err });
      continue;
    }

    const report: FrictionReport = {
      id: newId(),
      title,
      description,
      category: category as FrictionCategory,
      team: team as Team,
      process,
      timeLostHours: Math.min(120, Math.max(0.1, hours)),
      frequency: frequency as Frequency,
      severity: severity as Severity,
      suggestion: suggestion || "",
      status: (status || "open") as FrictionReport["status"],
      createdAt: new Date().toISOString(),
    };
    valid.push(report);
    rows.push({ rowIndex: r + 1, report, errors: [] });
  }

  return { rows, valid };
}
