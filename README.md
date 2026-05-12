# FrictionMap

Find the hidden drag slowing your team down.

FrictionMap turns everyday workflow slowdowns into cost estimates, insights, and a prioritized fix roadmap.

## Inspiration

Teams lose time to small operational bottlenecks that rarely become formal projects: access delays, approval bottlenecks, manual data entry, duplicate work, unclear ownership, and missing documentation. Those issues are painful, but usually invisible in dashboards.

## Problem

Operational drag compounds quietly:

- Employees feel delays day to day, but leadership sees only output lag.
- Costs are distributed across teams, so bottlenecks look “small” in isolation.
- Priority decisions default to intuition instead of impact.

## Solution

FrictionMap gives teams a lightweight way to report friction and automatically translates those reports into:

- monthly hours lost,
- monthly and annualized cost leakage,
- pattern-based insights,
- and a ranked action roadmap with suggested fixes.

## Features

- Fast **Report Friction** form with live impact preview
- Dynamic **Overview** executive summary
- Filterable **Insights** dashboard with chart + table breakdowns
- Ranked **Fix Roadmap** grouped by category/process with status updates
- Exportable **Business Impact Report** (copy + markdown download)
- **Settings** — company name, currency (CAD / USD / EUR / GBP), default team, custom teams, demo scenario, data-mode hint, reset demo / clear local data, category reference copy, **role simulation** (Employee / Manager / Operations Leader / Judge Demo), and lightweight **rollout tips**
- **Integrations** screen with hackathon-safe mocks: Slack summary, Jira/Linear ticket markdown, CSV import/export (no API keys)
- Demo scenario switcher (also in **Settings**; quick controls remain on **Overview**):
  - Default Operations Team
  - Engineering Handoff Chaos
  - Finance Manual Workload
- Local persistence with schema migration and corruption-safe fallback
- Configurable blended hourly rate (default 50/hr in **USD** display until you pick another currency in Settings)

## Business Impact

FrictionMap quantifies hidden workflow drag in dollars and hours so teams can:

1. identify the highest-cost friction first,
2. align owners on concrete fixes,
3. and demonstrate measurable savings over time.

## Tech Stack

- **Frontend:** React 18 + TypeScript
- **Build tool:** Vite 5
- **State:** Zustand + persist middleware (localStorage)
- **Backend (progressive):** Supabase (optional; app falls back safely when not configured)
- **Charts:** Recharts
- **Animation:** Framer Motion
- **Styling:** Global CSS design system (`src/styles/global.css`)

## Supabase Setup (Optional)

FrictionMap runs in **Local demo mode** by default. Supabase is optional progressive enhancement.

1. Create a Supabase project.
2. Apply schema from:
   - `docs/supabase-schema.sql`
3. Add env vars in `.env.local`:

```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Alternative variable names also supported:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

If vars are missing or Supabase is unavailable, the app stays usable with local/demo persistence and shows a subtle mode indicator.

## Running Locally

```bash
npm install
npm run dev
```

Open the Vite URL shown in terminal (usually `http://localhost:5173`).

## Build / Verification

```bash
npm run build
npm run preview
```

## Demo Flow

1. Load a demo scenario from **Overview → Demo & settings**.
2. Submit a new friction report in **Report Friction**.
3. Return to **Overview** and confirm metrics update.
4. Open **Insights** to show team/category/process breakdowns.
5. Open **Fix Roadmap** to show top ranked bottlenecks and status actions.
6. Generate and export **Business Impact Report**.
7. Open **Integrations** — copy Slack/Jira/Linear drafts, import/export CSV, or (optional) deploy Edge Functions for **live** Slack/Jira/Linear.

## Integrations (copy + optional live)

The **Integrations** tab always supports **copy/paste and CSV** in the browser (no backend required).

**Optional live mode:** deploy Supabase Edge Functions in `supabase/functions/` and add vendor credentials as **Function secrets** (not `VITE_*` variables). The SPA calls `supabase.functions.invoke` with the anon key; tokens never ship to end users.

| Capability | Copy/mock | Live (Edge Functions) |
|------------|-----------|------------------------|
| Slack summary | Yes | `post-slack-webhook` + `SLACK_INCOMING_WEBHOOK_URL` |
| Jira issue | Markdown copy | `create-jira-issue` + `JIRA_DOMAIN`, `JIRA_EMAIL`, `JIRA_API_TOKEN` |
| Linear issue | Markdown copy | `create-linear-issue` + `LINEAR_API_KEY` |
| CSV import/export | Yes | N/A |

Step-by-step: **`docs/integrations-edge-functions.md`**.

**Integration settings** (Slack cost line, related reports in tickets, default priority, Jira project key / issue type, Linear team ID) persist in the same browser storage as the rest of the app. Jira/Linear **secrets** are only on Supabase.

### Hardening for production

- Enable **JWT verification** on Edge Functions and/or add a shared secret header once you have auth.
- Prefer **OAuth** for multi-tenant SaaS; this repo uses API tokens / webhooks for a single internal deployment.

## Future Improvements

- Authentication + role-based access
- Backend/database persistence
- Multi-tenant OAuth for Slack / Jira / Linear (beyond single-workspace Edge Function secrets)
- Organization-level trend benchmarking
- Automated before/after impact tracking
- AI-assisted fix recommendations with confidence scoring

## Team

Hackathon team roles (placeholder):

- Product / UX: _TBD_
- Frontend engineering: _TBD_
- Data / analysis: _TBD_
- Demo / storytelling: _TBD_

## Project Structure

Key directories:

- `src/pages` — Overview, Report Friction, Insights, Fix Roadmap
- `src/store/frictionStore.ts` — app state, persistence, scenarios, selectors
- `src/lib` — calculations, roadmap generation, report generation, Supabase/repository adapters
- `src/data` — scenario datasets and defaults
- `src/components` — shared UI, layout, charts, modals, demo controls
- `supabase/functions` — optional Edge Functions for live Slack / Jira / Linear
- `docs/integrations-edge-functions.md` — deploy secrets and CLI commands
- `docs/supabase-schema.sql` — SQL schema + index + RLS notes

---

See `AGENTS.md` for product principles and implementation guardrails.
