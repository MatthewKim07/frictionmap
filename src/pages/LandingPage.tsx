import { useMemo, useState, type CSSProperties, type PointerEvent } from "react";

import { useAuthStore, type AuthPanelMode } from "@/store/authStore";

const HEAT_ZONES = [
  {
    id: "approvals",
    label: "Approvals",
    value: "$18.4k/mo",
    className: "hot",
    x: 8.5,
    y: 2.2,
    radius: 3.2,
    priority: "Highest priority",
    fix: "Unify approval owner",
    signal: "Finance and vendor work queue behind unclear approval paths.",
  },
  {
    id: "access",
    label: "Access",
    value: "$12.1k/mo",
    className: "warm",
    x: 3.5,
    y: 5.5,
    radius: 3,
    priority: "Recurring drag",
    fix: "Automate access renewal",
    signal: "Teams lose time waiting for duplicate permission checks.",
  },
  {
    id: "handoffs",
    label: "Handoffs",
    value: "$8.7k/mo",
    className: "active",
    x: 10.5,
    y: 6.4,
    radius: 2.5,
    priority: "Fastest fix",
    fix: "Route escalations once",
    signal: "Support issues bounce between tools before the owner is clear.",
  },
] as const;

type HeatZone = (typeof HEAT_ZONES)[number];
type HeatZoneId = HeatZone["id"];

function LandingNavButton({
  mode,
  children,
  variant = "secondary",
}: {
  mode: AuthPanelMode;
  children: string;
  variant?: "coral" | "secondary";
}) {
  const setLoginPanelOpen = useAuthStore((s) => s.setLoginPanelOpen);
  return (
    <button type="button" className={`btn ${variant}`} onClick={() => setLoginPanelOpen(true, mode)}>
      {children}
    </button>
  );
}

function HeatmapField({
  activeZoneId,
  setActiveZoneId,
}: {
  activeZoneId: HeatZoneId;
  setActiveZoneId: (id: HeatZoneId) => void;
}) {
  const activeZone = HEAT_ZONES.find((zone) => zone.id === activeZoneId) ?? HEAT_ZONES[0];
  const cells = useMemo(
    () =>
      Array.from({ length: 96 }, (_, index) => {
        const x = index % 12;
        const y = Math.floor(index / 12);
        const ranked = HEAT_ZONES.map((zone) => {
          const distance = Math.hypot(x - zone.x, y - zone.y);
          const boost = zone.id === activeZoneId ? 0.24 : 0;
          const heat = Math.max(0, 1.35 - distance / zone.radius + boost);
          return { zone, heat };
        }).sort((a, b) => b.heat - a.heat);
        const top = ranked[0]!;
        const heat = top.heat;
        const tone = heat > 0.95 ? "hot" : heat > 0.6 ? "warm" : heat > 0.24 ? "active" : "cool";
        return {
          index,
          tone,
          zone: top.zone,
          active: top.zone.id === activeZoneId && heat > 0.24,
          delay: `${(x * 0.08 + y * 0.11).toFixed(2)}s`,
        };
      }),
    [activeZoneId],
  );

  return (
    <div className="landing-heatmap-wrap" aria-label="Interactive friction heat map">
      <div
        className="landing-heatmap-grid"
        onMouseLeave={() => setActiveZoneId("approvals")}
      >
        {cells.map((cell) => (
          <button
            key={cell.index}
            type="button"
            className={`landing-heat-cell ${cell.tone}${cell.active ? " selected" : ""}`}
            style={{ animationDelay: cell.delay }}
            aria-label={`${cell.zone.label} friction signal`}
            onFocus={() => setActiveZoneId(cell.zone.id)}
            onMouseEnter={() => setActiveZoneId(cell.zone.id)}
          />
        ))}
      </div>
      <div className="landing-heat-ring one" />
      <div className="landing-heat-ring two" />
      <div className="landing-heat-ring three" />
      <button
        type="button"
        className={`landing-hotspot hotspot-approvals${activeZone.id === "approvals" ? " active" : ""}`}
        onFocus={() => setActiveZoneId("approvals")}
        onMouseEnter={() => setActiveZoneId("approvals")}
      >
        <strong>Approvals</strong>
        <span>$18.4k/mo</span>
      </button>
      <button
        type="button"
        className={`landing-hotspot hotspot-access${activeZone.id === "access" ? " active" : ""}`}
        onFocus={() => setActiveZoneId("access")}
        onMouseEnter={() => setActiveZoneId("access")}
      >
        <strong>Access</strong>
        <span>$12.1k/mo</span>
      </button>
      <button
        type="button"
        className={`landing-hotspot hotspot-handoffs${activeZone.id === "handoffs" ? " active" : ""}`}
        onFocus={() => setActiveZoneId("handoffs")}
        onMouseEnter={() => setActiveZoneId("handoffs")}
      >
        <strong>Handoffs</strong>
        <span>$8.7k/mo</span>
      </button>
    </div>
  );
}

function HeatmapInstrument({
  activeZoneId,
  setActiveZoneId,
}: {
  activeZoneId: HeatZoneId;
  setActiveZoneId: (id: HeatZoneId) => void;
}) {
  const activeZone = HEAT_ZONES.find((zone) => zone.id === activeZoneId) ?? HEAT_ZONES[0];

  return (
    <aside className="landing-heatmap-card" aria-label="Friction heatmap preview">
      <div className="landing-card-head">
        <span>Live friction map</span>
        <strong>{activeZone.value}</strong>
      </div>
      <div className="landing-intensity-scale" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>
      <ul>
        {HEAT_ZONES.map((item) => (
          <li key={item.label}>
            <span className={`landing-heat-dot ${item.className}`} />
            <span>{item.label}</span>
            <button
              type="button"
              className={item.id === activeZoneId ? "active" : ""}
              onClick={() => setActiveZoneId(item.id)}
            >
              {item.value}
            </button>
          </li>
        ))}
      </ul>
      <div className="landing-card-footer">
        <span>{activeZone.priority}</span>
        <strong>{activeZone.fix}</strong>
        <p>{activeZone.signal}</p>
      </div>
    </aside>
  );
}

export function LandingPage() {
  const [activeZoneId, setActiveZoneId] = useState<HeatZoneId>("approvals");
  const heatStyle = { "--heat-x": "72%", "--heat-y": "44%" } as CSSProperties;

  const moveHeat = (event: PointerEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const xPct = Math.min(100, Math.max(0, ((event.clientX - rect.left) / rect.width) * 100));
    const yPct = Math.min(100, Math.max(0, ((event.clientY - rect.top) / rect.height) * 100));
    event.currentTarget.style.setProperty("--heat-x", `${xPct}%`);
    event.currentTarget.style.setProperty("--heat-y", `${yPct}%`);

    const gridX = (xPct / 100) * 11;
    const gridY = (yPct / 100) * 7;
    const nearest = HEAT_ZONES.map((zone) => ({
      id: zone.id,
      distance: Math.hypot(gridX - zone.x, gridY - zone.y),
    })).sort((a, b) => a.distance - b.distance)[0];
    if (nearest) setActiveZoneId(nearest.id);
  };

  return (
    <div className="landing-page">
      <header className="landing-header">
        <div className="brand">
          <span className="brand-mark" aria-hidden />
          <span>FrictionMap</span>
        </div>
        <nav className="landing-auth-actions" aria-label="Account">
          <LandingNavButton mode="sign-in">Sign in</LandingNavButton>
          <LandingNavButton mode="sign-up" variant="coral">Create account</LandingNavButton>
        </nav>
      </header>

      <main>
        <section
          className="landing-hero"
          aria-labelledby="landing-title"
          onPointerMove={moveHeat}
          style={heatStyle}
        >
          <HeatmapField activeZoneId={activeZoneId} setActiveZoneId={setActiveZoneId} />
          <div className="landing-hero-layout">
            <div className="landing-copy-card">
              <p className="landing-eyebrow">Operational drag, finally measurable</p>
              <h1 id="landing-title">Find the hidden work friction costing your team time and money.</h1>
              <p>
                Employees report slowdowns in seconds. FrictionMap turns those reports into heatmapped cost leakage,
                pattern analysis, and a ranked fix roadmap for managers.
              </p>
              <div className="landing-hero-actions">
                <LandingNavButton mode="sign-up" variant="coral">Create account</LandingNavButton>
                <LandingNavButton mode="sign-in">Sign in</LandingNavButton>
              </div>
            </div>
            <HeatmapInstrument activeZoneId={activeZoneId} setActiveZoneId={setActiveZoneId} />
          </div>
        </section>

        <section className="landing-proof" aria-label="What FrictionMap helps you do">
          <article>
            <span>01</span>
            <h2>Report friction fast</h2>
            <p>Capture the workflow, team, severity, and time lost before the moment disappears.</p>
          </article>
          <article>
            <span>02</span>
            <h2>Quantify the leak</h2>
            <p>Convert repeated delays into monthly hours lost and estimated business cost.</p>
          </article>
          <article>
            <span>03</span>
            <h2>Fix what matters</h2>
            <p>Rank bottlenecks by impact so leaders can assign owners with a clear rationale.</p>
          </article>
        </section>
      </main>
    </div>
  );
}
