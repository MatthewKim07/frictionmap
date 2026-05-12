# Live integrations (Slack, Jira, Linear)

FrictionMap can **post real messages and issues** using **Supabase Edge Functions**. The React app never holds vendor API tokens: it only calls `supabase.functions.invoke(...)` with the **anon** key; secrets live on the function.

> **Security:** The sample `supabase/config.toml` sets `verify_jwt = false` so the SPA (no login) can invoke functions. For production, turn JWT verification on and/or add your own auth layer before exposing these endpoints.

## Prerequisites

- Supabase project linked to this repo (or copy the `supabase/functions/*` folders into your project).
- [Supabase CLI](https://supabase.com/docs/guides/cli) installed.
- FrictionMap `.env` already has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (or `NEXT_PUBLIC_*`).

## 1. Slack (Incoming Webhook)

1. In Slack, create an [Incoming Webhook](https://api.slack.com/messaging/webhooks) for a channel.
2. Copy the webhook URL.
3. Set it as a **secret** on the Edge Function (Dashboard → Project → Edge Functions → Secrets, or CLI):

```bash
supabase secrets set SLACK_INCOMING_WEBHOOK_URL="https://hooks.slack.com/services/..."
```

4. Deploy the function:

```bash
supabase functions deploy post-slack-webhook
```

5. In the app → **Integrations** → **Send to Slack (live)**.

## 2. Jira Cloud

1. Create an [API token](https://support.atlassian.com/atlassian-account/docs/manage-api-tokens-for-your-atlassian-account/) for the Jira account that will own issues.
2. Note your site subdomain: `https://YOURDOMAIN.atlassian.net` → `YOURDOMAIN`.

```bash
supabase secrets set JIRA_DOMAIN="yourdomain"
supabase secrets set JIRA_EMAIL="you@company.com"
supabase secrets set JIRA_API_TOKEN="your_atlassian_api_token"
supabase functions deploy create-jira-issue
```

3. In **Integrations → settings**, set **Jira project key** (e.g. `FM`) and **Issue type name** exactly as in Jira (`Task`, `Story`, etc.).
4. Use **Create in Jira (live)**.

## 3. Linear

1. Create a **Personal API key** in Linear (Settings → API) with permission to create issues.
2. Find your **Team ID** (UUID): Settings → Teams → team → use the ID from the URL or Linear’s API explorer.

```bash
supabase secrets set LINEAR_API_KEY="lin_api_..."
supabase functions deploy create-linear-issue
```

3. Paste **Linear team ID** in Integration settings.
4. Use **Create in Linear (live)**.

## Troubleshooting

- **“Failed to send a request to the Edge Function”** — function not deployed or wrong project URL.
- **401 / 403 from vendor** — check secrets spelling; Jira email must match the token owner; Linear key must include create scope.
- **Jira “issue type not found”** — issue type name must match the project (case-sensitive).

## Why not `VITE_SLACK_*` tokens?

Anything prefixed for Vite is **bundled into the browser** and can be stolen. Webhooks and API tokens belong in **Supabase Function secrets** (or another server you control).
