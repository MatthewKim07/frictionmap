import type { ReactNode } from "react";

import { useFrictionStore } from "@/store/useFrictionStore";

const TABS = [
  { id: "overview" as const, label: "Overview" },
  { id: "submit" as const, label: "Report friction" },
  { id: "insights" as const, label: "Insights" },
  { id: "roadmap" as const, label: "Fix roadmap" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const page = useFrictionStore((s) => s.page);
  const setPage = useFrictionStore((s) => s.setPage);
  const toast = useFrictionStore((s) => s.toast);

  const current = TABS.find((t) => t.id === page) ?? TABS[0];

  return (
    <div className="shell" data-screen-label={`FrictionMap · ${current.label}`}>
      <header className="header">
        <div className="header-inner">
          <div className="brand">
            <span className="brand-mark" />
            <span>FrictionMap</span>
          </div>

          <nav className="tabs">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`tab${page === t.id ? " active" : ""}`}
                onClick={() => setPage(t.id)}
              >
                {t.label}
              </button>
            ))}
          </nav>

          <div className="header-end">
            <span style={{ fontSize: 13 }}>Acme Co.</span>
            <div className="avatar">YO</div>
          </div>
        </div>
      </header>

      <main className="main">{children}</main>

      {toast && (
        <div className="toast">
          <span className="dot" />
          {toast.msg}
        </div>
      )}
    </div>
  );
}
