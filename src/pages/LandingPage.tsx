import { useEffect, useState } from "react";

import { OperationsHeatmap } from "@/components/landing/OperationsHeatmap";
import { useAuthStore, type AuthPanelMode } from "@/store/authStore";

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

export function LandingPage() {
  const [liveCount, setLiveCount] = useState(247);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setLiveCount((count) => count + Math.floor(Math.random() * 3));
    }, 2200);
    return () => window.clearInterval(timer);
  }, []);

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
        <section className="landing-hero" aria-labelledby="landing-title">
          <OperationsHeatmap />
          <div className="landing-hero-layout">
            <div className="landing-copy-card">
              <p className="landing-eyebrow">Operational drag, finally measurable</p>
              <h1 id="landing-title">
                Find the <em>hidden</em> work friction costing your team time.
              </h1>
              <p>
                Employees report slowdowns in seconds. FrictionMap turns those reports into heatmapped cost leakage,
                pattern analysis, and a ranked fix roadmap for managers.
              </p>
              <div className="landing-hero-actions">
                <LandingNavButton mode="sign-up" variant="coral">Create account →</LandingNavButton>
                <LandingNavButton mode="sign-up">Book a demo</LandingNavButton>
              </div>
            </div>
          </div>
          <div className="landing-live-chip" aria-label={`${liveCount} reports today`}>
            <span className="landing-live-dot" />
            <span>LIVE</span>
            <span aria-hidden="true">•</span>
            <strong>{liveCount.toLocaleString()}</strong>
            <span>reports today</span>
          </div>
          <div className="landing-heat-legend" aria-hidden="true">
            <span>Friction intensity</span>
            <i />
            <div>
              <small>Cool</small>
              <small>Warm</small>
              <small>Hot</small>
            </div>
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
