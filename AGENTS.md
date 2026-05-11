# FrictionMap — Agent Development Guide

This document orients AI coding agents working on **FrictionMap**: an internal operations tool that helps companies discover hidden workflow bottlenecks. Employees submit “friction reports” when work slows down, and the app turns those reports into analytics, estimated cost loss, and a prioritized fix roadmap.

The product should **not** feel like a generic AI SaaS dashboard. It should feel like a **polished, memorable, practical internal tool** that real employees and managers would actually use.

---

## 1. Project Vision

FrictionMap turns small moments of workplace drag into **measurable operational intelligence**. The goal is to reveal hidden **time loss**, **cost leakage**, and **process bottlenecks** before they compound into expensive operational failure.

---

## 2. Product Principles

- **Usability over visual spectacle**
- **Fast reporting flow** for employees
- **Clear business impact** for managers
- **Quantified time and cost savings**
- **Practical recommendations** over vague insights
- **Polished enough** for a hackathon demo, **structured enough** to become a real app
- **Preserve visual uniqueness** without sacrificing clarity

---

## 3. Core User Personas

| Persona | Need |
|--------|------|
| **Employee** | Quickly report friction in **under 30 seconds** |
| **Manager / team lead** | Review patterns and identify **what to fix** |
| **Operations leader** | See **company-wide** cost leakage and savings opportunities |
| **Hackathon judge** | Understand the **value** in **under 2 minutes** |

---

## 4. Core Product Flow

1. **Employee reports friction** — minimal friction in the reporting UX itself.
2. **App stores and scores the report** — persistence and scoring drive downstream views.
3. **Dashboard updates metrics** — aggregates refresh so leadership sees current pain.
4. **Insights group reports** by team, category, severity, and process — patterns become visible.
5. **Fix Roadmap ranks** the highest-impact bottlenecks — priority is explicit.
6. **Users understand what to fix first and why** — narrative and numbers align.

---

## 5. App Sections

- **Overview** — high-level health, KPIs, and entry points.
- **Report Friction** — fast submission path for employees.
- **Insights** — grouped analysis (team, category, severity, process).
- **Fix Roadmap** — ranked priorities with rationale.
- **Live Map (optional)** — include only if already present in the design; otherwise treat as an optional future surface for geographic or operational “where” context without blocking core flows.

---

## 6. Data Model Guidelines

### FrictionReport (main fields)

| Field | Role |
|-------|------|
| `id` | Stable identifier |
| `title` | Short human-readable summary |
| `description` | What happened and context |
| `category` | Type of friction (taxonomy-aligned) |
| `team` | Owning or affected team |
| `process` | Workflow or system involved |
| `timeLostHours` | Estimated hours lost per occurrence or period (define convention in code/docs) |
| `frequency` | How often this occurs |
| `severity` | Impact level |
| `suggestion` | Concrete improvement idea |
| `status` | Lifecycle (e.g. open, triaged, in progress, resolved) |
| `createdAt` | Timestamp |

### Supporting concepts

- **Friction score** — composite signal derived from report attributes (define formula in utilities, not inline in UI).
- **Frequency multiplier** — scales impact based on how often the issue repeats.
- **Severity multiplier** — scales impact based on how damaging each occurrence is.
- **Estimated monthly cost** — dollar leakage per month from this friction (assumptions centralized).
- **Estimated annual cost** — extrapolated annual leakage where appropriate.
- **Roadmap priority score** — ranking signal for the Fix Roadmap (transparent inputs, documented in calculation helpers).

---

## 7. Technical Guidelines

- Prefer **TypeScript** where possible.
- Prefer **React component architecture**; keep components **small and focused**.
- Use **reusable utilities** for calculations (scores, costs, multipliers).
- **Avoid hardcoding business calculations** inside UI components.
- Keep **mock data realistic** (no lorem ipsum).
- Maintain a **clean folder structure** as the project grows.
- **Preserve existing design assets** unless clearly unused.
- **Keep the app runnable after every change** — verify builds/tests when available.

---

## 8. Styling Guidelines

- **Avoid default blue/purple “AI SaaS” styling** tropes.
- Prefer **warm, distinctive** palettes: **cream**, **charcoal**, **coral**, **amber**, **muted lime**, **sage**.
- Use **whitespace and hierarchy** so the product stays easy to understand.
- Use **animation intentionally**, not everywhere.
- Make **dashboards readable at a glance**.
- Prioritize **real-world usability** over decorative complexity.

---

## 9. Accessibility Guidelines

- Use **semantic HTML**.
- Ensure **good color contrast**.
- **Keyboard-accessible** interactive controls.
- **Clear focus states** for focusable elements.
- **Labels** for form inputs (visible or properly associated).
- **Do not rely on color alone** for status or severity — pair with text or icons.
- Make **charts understandable** with labels and/or **text summaries**.

---

## 10. Development Rules

- **Do not rewrite the entire app** unless explicitly requested.
- **Before large changes**, inspect the repo and **explain what will change**.
- Prefer **incremental changes**; **keep existing working functionality intact**.
- **Fix broken imports and type errors** before moving on to new features.
- **Do not introduce unnecessary dependencies** without explaining why they are needed.
- **Stop after completing the requested step** — avoid scope creep.
- Provide a **concise summary of changes** and **test commands** when finishing work.

---

## 11. Hackathon Success Criteria

- A judge can understand the **problem in ~15 seconds**.
- A user can **submit a friction report quickly**.
- The **dashboard** clearly shows **hours and money lost**.
- The **roadmap** clearly ranks **what to fix first**.
- The **demo** tells a clear **before/after** story.
- **Business impact is quantified** end-to-end.
