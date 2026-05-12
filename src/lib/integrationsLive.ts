import { getSupabaseClient } from "@/lib/supabase";

export type LiveIntegrationResult =
  | { ok: true; url?: string; key?: string; identifier?: string }
  | { ok: false; error: string };

function readEdgePayload(data: unknown): {
  ok?: boolean;
  error?: string;
  url?: string;
  key?: string;
  identifier?: string;
} {
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return data as Record<string, unknown>;
  }
  return {};
}

/** Post plain text to Slack Incoming Webhook via Edge Function `post-slack-webhook`. */
export async function livePostSlackSummary(text: string): Promise<LiveIntegrationResult> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { ok: false, error: "Add Supabase URL and anon key to use live Slack. Copy/paste still works without them." };
  }
  const { data, error } = await supabase.functions.invoke("post-slack-webhook", { body: { text } });
  if (error) return { ok: false, error: error.message };
  const p = readEdgePayload(data);
  if (p.error) return { ok: false, error: String(p.error) };
  if (!p.ok) return { ok: false, error: "Slack function returned an unexpected payload. Is it deployed?" };
  return { ok: true };
}

/** Create Jira issue via `create-jira-issue` (secrets: JIRA_DOMAIN, JIRA_EMAIL, JIRA_API_TOKEN). */
export async function liveCreateJiraIssue(input: {
  projectKey: string;
  issueTypeName: string;
  summary: string;
  description: string;
}): Promise<LiveIntegrationResult> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { ok: false, error: "Supabase is not configured." };
  }
  const { data, error } = await supabase.functions.invoke("create-jira-issue", { body: input });
  if (error) return { ok: false, error: error.message };
  const p = readEdgePayload(data);
  if (p.error) return { ok: false, error: String(p.error) };
  if (!p.ok) return { ok: false, error: "Jira function returned an unexpected payload. Is it deployed?" };
  return { ok: true, key: p.key, url: p.url };
}

/** Create Linear issue via `create-linear-issue` (secret: LINEAR_API_KEY). */
export async function liveCreateLinearIssue(input: {
  teamId: string;
  title: string;
  description: string;
}): Promise<LiveIntegrationResult> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { ok: false, error: "Supabase is not configured." };
  }
  const { data, error } = await supabase.functions.invoke("create-linear-issue", { body: input });
  if (error) return { ok: false, error: error.message };
  const p = readEdgePayload(data);
  if (p.error) return { ok: false, error: String(p.error) };
  if (!p.ok) return { ok: false, error: "Linear function returned an unexpected payload. Is it deployed?" };
  return { ok: true, url: p.url, identifier: p.identifier };
}
