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
- Demo scenario switcher:
  - Default Operations Team
  - Engineering Handoff Chaos
  - Finance Manual Workload
- Local persistence with schema migration and corruption-safe fallback
- Configurable blended hourly rate (default $50/hr)

## Business Impact

FrictionMap quantifies hidden workflow drag in dollars and hours so teams can:

1. identify the highest-cost friction first,
2. align owners on concrete fixes,
3. and demonstrate measurable savings over time.

## Tech Stack

- **Frontend:** React 18 + TypeScript
- **Build tool:** Vite 5
- **State:** Zustand + persist middleware (localStorage)
- **Charts:** Recharts
- **Animation:** Framer Motion
- **Styling:** Global CSS design system (`src/styles/global.css`)

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

## Future Improvements

- Authentication + role-based access
- Backend/database persistence
- Slack/Jira/Linear integrations
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
- `src/lib` — calculations, roadmap generation, report generation
- `src/data` — scenario datasets and defaults
- `src/components` — shared UI, layout, charts, modals, demo controls
- `docs/devpost-submission-draft.md` — copy-ready submission draft

---

See `AGENTS.md` for product principles and implementation guardrails.
