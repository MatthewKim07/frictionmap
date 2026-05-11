/**
 * Core taxonomy + config. Types are derived so literals stay in sync with runtime arrays.
 */

export const BLENDED_HOURLY_USD = 85;

/** Assumed fraction of annual drag recoverable if prioritized fixes ship (demo narrative). */
export const ANNUAL_SAVINGS_CAPTURE_RATE = 0.62;

export const CATEGORY_DEFINITIONS = [
  { id: "access", label: "Access delay", color: "coral" as const },
  { id: "approval", label: "Approval bottleneck", color: "amber" as const },
  { id: "data-entry", label: "Manual data entry", color: "amber" as const },
  { id: "tool", label: "Tool confusion", color: "lime" as const },
  { id: "docs", label: "Missing documentation", color: "lime" as const },
  { id: "dupe", label: "Duplicate work", color: "coral" as const },
  { id: "waiting", label: "Waiting on another team", color: "amber" as const },
  { id: "rework", label: "Rework or error correction", color: "coral" as const },
] as const;

export type FrictionCategoryId = (typeof CATEGORY_DEFINITIONS)[number]["id"];

export const TEAMS = [
  "Engineering",
  "Marketing",
  "Finance",
  "Support",
  "Sales",
  "People Ops",
  "Design",
  "Data",
] as const;
export type Team = (typeof TEAMS)[number];

export const PROCESS_OPTIONS = [
  "Snowflake",
  "Jira",
  "Confluence",
  "Salesforce",
  "Notion",
  "Slack",
  "GitHub",
  "Looker",
  "NetSuite",
  "Workday",
] as const;

export const FREQUENCY_OPTIONS = ["Daily", "Weekly", "Monthly", "One-off"] as const;
export type Frequency = (typeof FREQUENCY_OPTIONS)[number];

/** Ordinal 1–4 — maps to labels in UI. */
export const SEVERITY_LEVELS = [1, 2, 3, 4] as const;
export type Severity = (typeof SEVERITY_LEVELS)[number];

export const SEVERITY_LABELS: Record<Severity, string> = {
  1: "Low",
  2: "Medium",
  3: "High",
  4: "Critical",
};

export const REPORT_STATUSES = ["open", "triaged", "in_progress", "resolved"] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export const ROADMAP_PRIORITIES = ["high", "medium", "low"] as const;
export type RoadmapPriority = (typeof ROADMAP_PRIORITIES)[number];
