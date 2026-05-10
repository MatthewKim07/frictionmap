/* global React, ReactDOM, StoreProvider, useStore, LandingScreen, SubmitScreen, InsightsScreen, RoadmapScreen */
const TABS = [
  { id: "overview", label: "Overview" },
  { id: "submit",   label: "Report friction" },
  { id: "insights", label: "Insights" },
  { id: "roadmap",  label: "Fix roadmap" },
];

function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}

function Shell() {
  const { page, setPage, toast } = useStore();
  const current = TABS.find(t => t.id === page) || TABS[0];

  return (
    <div className="shell" data-screen-label={"FrictionMap · " + current.label}>
      <header className="header">
        <div className="header-inner">
          <div className="brand">
            <span className="brand-mark"></span>
            <span>FrictionMap</span>
          </div>

          <nav className="tabs">
            {TABS.map(t => (
              <button key={t.id}
                className={"tab" + (page === t.id ? " active" : "")}
                onClick={() => setPage(t.id)}>
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

      <main className="main">
        {page === "overview" && <LandingScreen />}
        {page === "submit"   && <SubmitScreen />}
        {page === "insights" && <InsightsScreen />}
        {page === "roadmap"  && <RoadmapScreen />}
      </main>

      {toast && (
        <div className="toast">
          <span className="dot"></span>{toast.msg}
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
