# FrictionMap

Internal-operations prototype that surfaces workflow friction as hours lost, estimated cost, and a ranked fix roadmap.

## Stack

| Layer | Choice |
| -------- | ------ |
| Build | [Vite](https://vitejs.dev/) 5 |
| UI | React 18 + TypeScript |
| State | [Zustand](https://github.com/pmndrs/zustand) (`src/store/useFrictionStore.ts`) |
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
  data/
    constants.ts          # Categories, teams, blended rate, enums
    mockReports.ts        # Seed FrictionReport rows (realistic copy)
    fixRoadmap.ts         # Mock RoadmapItem proposals
  lib/
    calculations.ts       # Hours/cost/score math (single source of truth)
    categoryMeta.ts       # Category labels + chart colors
  store/
    useFrictionStore.ts   # Reports list, navigation, toast, addReport
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
npm run dev          # Vite dev server (default http://localhost:5173)
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
