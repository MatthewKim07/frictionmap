/**
 * Create a Jira Cloud issue using API token (secrets: JIRA_DOMAIN, JIRA_EMAIL, JIRA_API_TOKEN).
 * JIRA_DOMAIN = subdomain only (e.g. "acme" for acme.atlassian.net)
 */
const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const domain = Deno.env.get("JIRA_DOMAIN")?.trim();
  const email = Deno.env.get("JIRA_EMAIL")?.trim();
  const token = Deno.env.get("JIRA_API_TOKEN")?.trim();
  if (!domain || !email || !token) {
    return json({ error: "Missing JIRA_DOMAIN, JIRA_EMAIL, or JIRA_API_TOKEN on the Edge Function." }, 500);
  }

  let body: { projectKey?: string; issueTypeName?: string; summary?: string; description?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const projectKey = typeof body.projectKey === "string" ? body.projectKey.trim().toUpperCase() : "";
  const issueTypeName = typeof body.issueTypeName === "string" ? body.issueTypeName.trim() : "Task";
  const summary = typeof body.summary === "string" ? body.summary.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  if (!projectKey || !summary) {
    return json({ error: "projectKey and summary are required." }, 400);
  }

  const auth = btoa(`${email}:${token}`);
  const url = `https://${domain}.atlassian.net/rest/api/3/issue`;

  const jiraBody = {
    fields: {
      project: { key: projectKey },
      issuetype: { name: issueTypeName },
      summary: summary.slice(0, 255),
      description: plainToAdf(description || "(no description)"),
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(jiraBody),
  });

  const resText = await res.text();
  if (!res.ok) {
    return json({ error: `Jira API ${res.status}: ${resText.slice(0, 400)}` }, 502);
  }

  let parsed: { key?: string; self?: string };
  try {
    parsed = JSON.parse(resText) as { key?: string; self?: string };
  } catch {
    return json({ error: "Unexpected Jira response" }, 502);
  }

  const key = parsed.key ?? "";
  const browseUrl = key ? `https://${domain}.atlassian.net/browse/${key}` : "";
  return json({ ok: true, key, url: browseUrl || parsed.self || "" });
});

function plainToAdf(plain: string): Record<string, unknown> {
  return {
    type: "doc",
    version: 1,
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text: plain.slice(0, 32000) }],
      },
    ],
  };
}

function json(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
