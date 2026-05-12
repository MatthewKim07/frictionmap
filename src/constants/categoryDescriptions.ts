import type { FrictionCategory } from "@/constants/friction";

/** Short copy so employees pick the right taxonomy bucket. */
export const FRICTION_CATEGORY_DESCRIPTIONS: Record<FrictionCategory, string> = {
  "Access delay": "Waiting for permissions, account setup, credentials, or system access.",
  "Approval bottleneck": "Stuck in review queues, sign-offs, or unclear approvers.",
  "Manual data entry": "Re-typing, copy-paste between systems, or spreadsheet work that could be automated.",
  "Tool confusion": "Unclear UI, wrong tool for the job, or hunting for the right feature or workflow.",
  "Missing documentation": "No runbook, outdated wiki, or unclear steps so people guess or ask around.",
  "Duplicate work": "Same task done twice (or more) because ownership or handoffs are unclear.",
  "Waiting on another team": "Blocked on another group’s queue, response, or dependency.",
  "Rework or error correction": "Fixing mistakes, reversing bad data, or redoing work after a failed first pass.",
};
