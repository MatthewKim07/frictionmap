# FrictionMap — Devpost Draft

## Short Project Description

FrictionMap helps teams spot hidden workflow drag and convert it into measurable hours and cost impact, then prioritize fixes with a ranked roadmap.

## Longer Project Description

Small operational slowdowns are everywhere — waiting for access, chasing approvals, copying data between tools, rebuilding duplicate trackers, and correcting avoidable handoff errors. Individually they seem minor, but together they become expensive.

FrictionMap gives organizations a simple way to capture these friction events and automatically translate them into business language. The app aggregates reports into monthly hours lost, cost leakage, and annualized risk, then surfaces patterns in an Insights dashboard and turns those patterns into a practical Fix Roadmap. Managers can update fix status, review related reports, and export a Business Impact Report for leadership updates.

The result is a tool that makes operational friction visible, measurable, and actionable.

## Problem Statement

Most workflow friction stays invisible because:

- it is reported informally,
- it is spread across teams,
- and no one aggregates it into impact metrics.

Without visibility, organizations prioritize by urgency noise instead of leverage, and recurring drag quietly compounds.

## Solution Explanation

FrictionMap provides an end-to-end loop:

1. Employees report friction quickly.
2. The app scores and quantifies impact (hours + dollars).
3. Leadership sees trends across category, team, process, severity, and status.
4. The roadmap ranks the highest-impact bottlenecks first.
5. Teams export a business-ready summary to communicate priorities and savings opportunity.

## Business Impact Paragraph

FrictionMap reframes “annoying workflow issues” as quantifiable operating risk. By estimating monthly and annualized leakage from real reports, it helps managers focus on the few fixes that can recover the most hours and dollars. This improves prioritization quality, creates clearer ownership, and supports faster operational decisions with measurable rationale.

## Features

- Friction report submission flow with impact preview
- Executive overview with dynamic KPIs
- Insights dashboard with filters, charts, and process rankings
- Fix roadmap with ranked bottlenecks and status controls
- Business Impact Report export (copy + markdown download)
- Demo scenarios for live storytelling
- Local persistence with migration-safe recovery
- Configurable blended hourly rate

## Tech Stack

- React 18
- TypeScript
- Vite
- Zustand (persist middleware)
- Recharts
- Framer Motion
- CSS design system (custom tokens + components)

## Challenges We Ran Into

- Turning qualitative friction reports into credible, reusable business calculations
- Keeping scenario switching and persistence robust without a backend
- Ensuring consistency across multiple views (Overview, Insights, Roadmap, Export)
- Designing empty states and fallback behavior so demos remain reliable under any localStorage state

## What’s Next

- Team authentication and role permissions
- Backend storage and organization-level multi-tenant data
- Integrations with tools like Slack, Jira, and Linear
- Automated before/after impact tracking for implemented fixes
- AI-assisted recommendation generation with rationale and confidence
- Benchmarking across teams and time windows
