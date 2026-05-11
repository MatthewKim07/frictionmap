# FrictionMap

Internal-operations prototype that surfaces workflow friction as hours lost, estimated cost, and a ranked fix roadmap.

## Stack

| Layer | Choice |
| -------- | ------ |
| Build | [Vite](https://vitejs.dev/) 5 |
| UI | React 18 + TypeScript |
| State | [Zustand](https://github.com/pmndrs/zustand) + `persist` (`src/store/frictionStore.ts`, localStorage) |
| Styling | Global CSS (`src/styles/global.css`) — original warm palette and layout preserved |
| Animations / charts (next steps) | `framer-motion` and `recharts` are installed but not wired yet |

Tailwind is **not** enabled yet to avoid fighting the existing design tokens; it can be layered in later if we migrate utilities incrementally.

## Repository layout

```
src/
  App.tsx                 # Root view + tab routing
  main.tsx
  styles/global.css       # Design tokens, layout, components (from original export)
  types/index.ts          # FrictionReport, RoadmapItem, DashboardMetrics, re-exports
  constants/
    friction.ts           # Taxonomy, AVERAGE_HOURLY_COST, process pick list
  data/
    frictionReports.ts    # Seed dataset (reset + storage fallback)
  lib/
    frictionCalculations.ts  # Hours, cost, grouping, filters, dashboard metrics
    roadmap.ts            # Derived roadmap clusters + priority scoring
    categoryMeta.ts       # Category → pill tone + chart colors
  store/
    frictionStore.ts      # Persisted reports, CRUD, filters API, selectors
  components/
    layout/AppShell.tsx
    dashboard/            # Metric cards, bar rows
    ui/                   # Pills, severity/category badges
    charts/               # (placeholder for Recharts modules)
    forms/                # (placeholder for shared form controls)
    roadmap/              # (placeholder for roadmap-specific pieces)
  pages/
    OverviewPage.tsx
    SubmitPage.tsx
    InsightsPage.tsx
    RoadmapPage.tsx
design-archive/
  analytics.jsx           # Unwired alternate analytics layout (experimental; needs extra primitives)
```

Path alias: `@/` → `src/` (see `vite.config.ts`).

## Data model

- **`FrictionReport`** — `id`, `title`, `description`, `category`, `team`, `process`, `timeLostHours`, `frequency`, `severity`, `suggestion`, `status`, `createdAt`, optional `whenLabel` / `whoLabel` for demo tables.
- **`DashboardMetrics`** — rolled-up monthly hours, monthly cost, annualized leakage, savings-opportunity estimate, category/team hour maps.
- Calculations live in **`src/lib/calculations.ts`** (`monthlyHoursLostForReport`, `monthlyCostLostForReport`, `annualizedCostFromMonthly`, `frictionScore`, multipliers, `buildDashboardMetrics`).

## Commands

```bash
npm install          # first-time setup
npm run dev          # Vite dev server (default http://localhost:5174 — avoids SW/port clashes with other apps)
npm run build        # TypeScript check + production bundle → dist/
npm run preview      # Serve dist/ locally
```

## Product screens

- **Overview** — headline metrics, top friction, category bars.
- **Report friction** — quick-submit flow with live monthly hour/cost preview.
- **Insights** — category + team breakdown, highest-cost processes, recent table.
- **Fix roadmap** — mock initiatives ranked against live category drag.

There is **no live map** in the current design export. An alternate analytics screen is archived under `design-archive/` and was never wired into the old HTML shell.

## Agent notes

See `AGENTS.md` for product principles and development guidelines.
