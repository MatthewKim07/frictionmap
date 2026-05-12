/** Create a Linear issue (secret: LINEAR_API_KEY with issue create scope). */
const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MUTATION = `
mutation CreateFrictionIssue($teamId: String!, $title: String!, $description: String!) {
  issueCreate(input: { teamId: $teamId, title: $title, description: $description }) {
    success {
      issue {
        id
        url
        identifier
      }
    }
    userErrors {
      message
    }
  }
}
`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const apiKey = Deno.env.get("LINEAR_API_KEY")?.trim();
  if (!apiKey) {
    return json({ error: "Missing LINEAR_API_KEY secret on the Edge Function." }, 500);
  }

  let body: { teamId?: string; title?: string; description?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const teamId = typeof body.teamId === "string" ? body.teamId.trim() : "";
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  if (!teamId || !title) {
    return json({ error: "teamId and title are required." }, 400);
  }

  const gqlRes = await fetch("https://api.linear.app/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: apiKey,
    },
    body: JSON.stringify({
      query: MUTATION,
      variables: { teamId, title: title.slice(0, 255), description: description.slice(0, 50000) || " " },
    }),
  });

  const gqlText = await gqlRes.text();
  if (!gqlRes.ok) {
    return json({ error: `Linear HTTP ${gqlRes.status}: ${gqlText.slice(0, 300)}` }, 502);
  }

  let parsed: {
    data?: {
      issueCreate?: {
        success?: { issue?: { url?: string; identifier?: string } };
        userErrors?: { message: string }[];
      };
    };
    errors?: { message?: string }[];
  };
  try {
    parsed = JSON.parse(gqlText) as typeof parsed;
  } catch {
    return json({ error: "Invalid Linear response" }, 502);
  }

  if (parsed.errors?.length) {
    return json({ error: parsed.errors.map((e) => e.message).join("; ") }, 502);
  }

  const userErrors = parsed.data?.issueCreate?.userErrors ?? [];
  if (userErrors.length) {
    return json({ error: userErrors.map((e) => e.message).join("; ") }, 400);
  }

  const issue = parsed.data?.issueCreate?.success?.issue;
  if (!issue?.url) {
    return json({ error: "Linear did not return an issue URL." }, 502);
  }

  return json({ ok: true, url: issue.url, identifier: issue.identifier ?? "" });
});

function json(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
