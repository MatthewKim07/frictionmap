/** Canonical FrictionMap taxonomy and economics (single source of truth). */

export const AVERAGE_HOURLY_COST = 50;

export const FRICTION_CATEGORIES = [
  "Access delay",
  "Approval bottleneck",
  "Manual data entry",
  "Tool confusion",
  "Missing documentation",
  "Duplicate work",
  "Waiting on another team",
  "Rework or error correction",
] as const;

export type FrictionCategory = (typeof FRICTION_CATEGORIES)[number];

export const TEAMS = [
  "Engineering",
  "Finance",
  "Sales",
  "Marketing",
  "Customer Support",
  "Operations",
  "HR",
  "Product",
] as const;

export type Team = (typeof TEAMS)[number];

export const FREQUENCIES = ["once", "monthly", "weekly", "daily"] as const;
export type Frequency = (typeof FREQUENCIES)[number];

export const SEVERITIES = ["low", "medium", "high", "critical"] as const;
export type Severity = (typeof SEVERITIES)[number];

export const REPORT_STATUSES = ["open", "reviewing", "planned", "resolved"] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

/** UI helpers — process / tool pick list (not an enum). */
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
  "Spreadsheets",
  "Vendor procurement",
  "Support dashboard",
  "Handoff notes",
  "Onboarding portal",
] as const;

export const ROADMAP_PRIORITY_LEVELS = ["Critical", "High", "Medium", "Low"] as const;
export type RoadmapPriorityLevel = (typeof ROADMAP_PRIORITY_LEVELS)[number];
