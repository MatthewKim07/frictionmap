import type { RoadmapPriorityLevel } from "@/constants/friction";

/** Mock ticket priority shown in generated Jira/Linear bodies (not sent to any API). */
export type MockTicketPriority = "Low" | "Medium" | "High" | "Critical";

export interface IntegrationSettings {
  slackIncludeCostEstimates: boolean;
  ticketIncludeRelatedReports: boolean;
  /** Maps roadmap Critical/High/... to mock tracker priority label. */
  defaultTicketPriority: MockTicketPriority;
  /** Jira Cloud project key (live create via Edge Function). */
  jiraProjectKey: string;
  /** Must match an issue type name in your Jira project (e.g. Task, Story, Bug). */
  jiraIssueTypeName: string;
  /** Linear team UUID (Settings → Teams in Linear, or API). */
  linearTeamId: string;
}

export function defaultIntegrationSettings(): IntegrationSettings {
  return {
    slackIncludeCostEstimates: true,
    ticketIncludeRelatedReports: true,
    defaultTicketPriority: "Medium",
    jiraProjectKey: "",
    jiraIssueTypeName: "Task",
    linearTeamId: "",
  };
}

export function sanitizeIntegrationSettings(raw: unknown): IntegrationSettings {
  const d = defaultIntegrationSettings();
  if (!raw || typeof raw !== "object") return d;
  const o = raw as Record<string, unknown>;
  return {
    slackIncludeCostEstimates: typeof o.slackIncludeCostEstimates === "boolean" ? o.slackIncludeCostEstimates : d.slackIncludeCostEstimates,
    ticketIncludeRelatedReports:
      typeof o.ticketIncludeRelatedReports === "boolean" ? o.ticketIncludeRelatedReports : d.ticketIncludeRelatedReports,
    defaultTicketPriority: isMockTicketPriority(o.defaultTicketPriority) ? o.defaultTicketPriority : d.defaultTicketPriority,
    jiraProjectKey: typeof o.jiraProjectKey === "string" ? o.jiraProjectKey.trim() : d.jiraProjectKey,
    jiraIssueTypeName: typeof o.jiraIssueTypeName === "string" && o.jiraIssueTypeName.trim() ? o.jiraIssueTypeName.trim() : d.jiraIssueTypeName,
    linearTeamId: typeof o.linearTeamId === "string" ? o.linearTeamId.trim() : d.linearTeamId,
  };
}

function isMockTicketPriority(v: unknown): v is MockTicketPriority {
  return v === "Low" || v === "Medium" || v === "High" || v === "Critical";
}

/** Suggested mock priority from roadmap rank (can be overridden by settings.defaultTicketPriority for demo). */
export function mockPriorityFromRoadmap(
  level: RoadmapPriorityLevel,
  fallback: MockTicketPriority,
): MockTicketPriority {
  if (level === "Critical") return "Critical";
  if (level === "High") return "High";
  if (level === "Medium") return "Medium";
  if (level === "Low") return "Low";
  return fallback;
}
