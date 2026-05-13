## Inspiration

Most operational pain never becomes a Jira ticket. It lives in hallway complaints, duplicate spreadsheets, and “that’s just how we do it here.” Leadership sees lag, but not *where* the drag comes from—because nobody instrumented **friction** as a first-class signal. We built FrictionMap to make small slowdowns legible: fast to report, honest to quantify, and hard to ignore when it shows up as **hours and money**.

## What it does

FrictionMap is an internal tool for teams who want operational truth without another bloated enterprise dashboard.

- **Report Friction** — a deliberately fast submission flow so employees can log what slowed them down (category, team, process, severity, frequency, time lost) with a live sense of impact.
- **Overview** — executive-friendly health: open friction, where cost clusters, and a clear path into triage.
- **Insights** — charts and tables that break patterns down by category, severity, team, and process so managers stop arguing from anecdotes.
- **Fix Roadmap** — clusters related reports into ranked priorities with rationale and suggested first steps.
- **Integrations** — practical paths to **Slack** summaries, **Jira / Linear** ticket drafts (and optional live calls via Supabase Edge Functions), plus **CSV** import/export so outcomes travel into the tools teams already use.
- **Settings & roles** — company context (currency, teams), demo scenarios, and role-aware navigation (employee vs manager vs ops) so the story stays believable for real orgs; optional **Supabase** auth for persistence beyond the browser.

A simple mental model we used everywhere:

\( \text{monthly cost} \approx \text{monthly hours lost} \times \text{blended hourly rate} \)

Annualized leakage extrapolates the same idea over a year:

$$ \text{annualized leakage} \approx 12 \times \text{monthly cost} $$

Assumptions and multipliers live in dedicated calculation helpers—not buried in UI—so the numbers stay explainable.

## How we built it

- **Frontend:** React 18 + TypeScript, Vite 5, global CSS for a warm, non-generic “internal tool” feel (cream / charcoal / coral / sage), Framer Motion for intentional motion, Recharts for readable charts.
- **State:** Zustand with persistence and schema migration so demos survive refresh—and corrupted local data fails gracefully.
- **Progressive backend:** Supabase is optional; the app runs in local demo mode and upgrades cleanly when the project is configured with Supabase URL, anon key, and schema. SQL for profiles and workspace lives under `docs/`.
- **Integrations:** copy-first flows (clipboard and CSV) work without credentials in the browser; optional live Slack, Jira, and Linear calls go through Supabase Edge Functions with secrets stored on the server, not in the client.

## Challenges we ran into

- **Truth vs demo:** making mock data feel like a real company without overstating what is “live” versus simulated.
- **Role gating without breaking the story:** employees need a fast path; managers need triage surfaces; operations needs export and integration paths—without the product feeling like four different apps.
- **Quantified impact without hand-wavy AI:** keeping scoring and cost estimates transparent and centralized so leadership can follow the arithmetic.
- **Reliable saves:** local storage migrations, empty database states, and “connected but no rows yet” all needed explicit handling so the experience never looks accidentally broken.

## Accomplishments that we're proud of

- A reporting flow that respects the user’s time—**friction reporting shouldn’t create friction**.
- End-to-end narrative: **submit → aggregate → prioritize → export / integrate**.
- A roadmap that reads like an operator wrote it: ranked problems, related reports, and a suggested first step—not generic “insights.”
- A visual identity that avoids the default “AI SaaS purple” look while staying readable and accessible.

## What we learned

- The hardest part isn’t charts—it’s **deciding what “priority” means** and making that definition defensible.
- **Copy-first integrations** deliver real value without putting vendor secrets in the browser.
- **Progressive enhancement** (local-first, then Supabase) keeps the project easy to run anywhere while still feeling serious when fully wired up.

## Meet the team

- **[Matthew Kim](https://github.com/MatthewKim07)** — *Lead* — Shaped the product end-to-end: how friction becomes numbers, dashboards, and a prioritized roadmap; the optional cloud-backed setup; leadership-facing exports; integrations story; and the overall polish so the app feels like a real internal tool.

- **[Athrav Seruwam](https://github.com/athravseruwam07)** — *Auth & first impressions* — Owned how people first meet FrictionMap—the landing story, sign-in and “waiting for access” experience, and the visuals that sell the problem before you ever open the dashboard.

- **[Ali Husseini](https://github.com/alihusseini07)** — *Reporting experience* — Led the friction submission side: making it faster and clearer to file a report, richer detail when something goes wrong, and hardening how reports are saved and re-opened so the flow feels reliable day to day.

## What's next for FrictionMap

- Deeper **resolution workflows** (owners, due dates, status transitions) tied back to the roadmap clusters.
- **Notion / Docs** sync once there’s a credible auth and scope story.
- **Org-wide policies** (SLA templates, routing rules) and richer analytics (trends over time, not just snapshots).
- Hardening the Supabase path: row-level security patterns, auditability, and production-grade onboarding for administrators.
