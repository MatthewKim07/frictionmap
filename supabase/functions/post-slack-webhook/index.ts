/** Post summary text to Slack via Incoming Webhook (secret: SLACK_INCOMING_WEBHOOK_URL). */
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

  const webhook = Deno.env.get("SLACK_INCOMING_WEBHOOK_URL")?.trim();
  if (!webhook) {
    return json({ error: "Missing SLACK_INCOMING_WEBHOOK_URL secret on the Edge Function." }, 500);
  }

  let body: { text?: string };
  try {
    body = (await req.json()) as { text?: string };
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) {
    return json({ error: "Body must include non-empty `text`." }, 400);
  }
  if (text.length > 4000) {
    return json({ error: "Message too long (max 4000 chars for this demo function)." }, 400);
  }

  const slackRes = await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  if (!slackRes.ok) {
    const errText = await slackRes.text().catch(() => "");
    return json({ error: `Slack webhook failed (${slackRes.status}): ${errText.slice(0, 200)}` }, 502);
  }

  return json({ ok: true });
});

function json(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
