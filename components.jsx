/* global React */
const { useState, useEffect, useMemo, createContext, useContext } = React;

const CATEGORIES = [
  { id: "access",     label: "Access delay",                color: "coral" },
  { id: "approval",   label: "Approval bottleneck",         color: "amber" },
  { id: "data-entry", label: "Manual data entry",           color: "amber" },
  { id: "tool",       label: "Tool confusion",              color: "lime"  },
  { id: "docs",       label: "Missing documentation",       color: "lime"  },
  { id: "dupe",       label: "Duplicate work",              color: "coral" },
  { id: "waiting",    label: "Waiting on another team",     color: "amber" },
  { id: "rework",     label: "Rework or error correction",  color: "coral" },
];
const TEAMS = ["Engineering", "Marketing", "Finance", "Support", "Sales", "People Ops", "Design", "Data"];
const TOOLS = ["Snowflake", "Jira", "Confluence", "Salesforce", "Notion", "Slack", "GitHub", "Looker", "NetSuite", "Workday"];
const FREQ = ["Daily", "Weekly", "Monthly", "One-off"];

const SEED = [
  { id: "f001", title: "Waiting for database access",            cat: "access",     team: "Engineering", tool: "Snowflake",  hours: 6.0, frequency: "Weekly",  severity: 4, when: "2h ago",  who: "M. Okafor" },
  { id: "f002", title: "Manually copying invoice data",          cat: "data-entry", team: "Finance",     tool: "NetSuite",   hours: 4.5, frequency: "Daily",   severity: 3, when: "today",   who: "A. Park" },
  { id: "f003", title: "Could not find deployment instructions", cat: "docs",       team: "Engineering", tool: "Confluence", hours: 1.5, frequency: "Weekly",  severity: 2, when: "yesterday", who: "R. Singh" },
  { id: "f004", title: "Waiting for campaign approval",          cat: "approval",   team: "Marketing",   tool: "Slack",      hours: 8.0, frequency: "Weekly",  severity: 4, when: "3h ago",  who: "J. Liu" },
  { id: "f005", title: "Duplicate customer status updates",      cat: "dupe",       team: "Support",     tool: "Salesforce", hours: 3.0, frequency: "Daily",   severity: 3, when: "today",   who: "T. Brooks" },
  { id: "f006", title: "Searching for the right internal doc",   cat: "docs",       team: "People Ops",  tool: "Notion",     hours: 2.0, frequency: "Weekly",  severity: 2, when: "1d ago",  who: "S. Nair" },
  { id: "f007", title: "Re-entering customer data in 2 systems", cat: "dupe",       team: "Sales",       tool: "Salesforce", hours: 5.0, frequency: "Daily",   severity: 4, when: "today",   who: "K. Alvarez" },
  { id: "f008", title: "Tool confusion in pipeline view",        cat: "tool",       team: "Data",        tool: "Looker",     hours: 1.0, frequency: "Weekly",  severity: 2, when: "today",   who: "D. Ito" },
];

const FIXES = [
  { id: "fx1", title: "Automate access request approvals",                 problem: "Engineers wait days for database and tool access, blocking real work.", suggestion: "Auto-approve standard requests; route exceptions to managers.", tag: "access",     team: "IT + Eng",       savesH: 86, effort: "Medium", priority: "high" },
  { id: "fx2", title: "Replace weekly CSV copying with scheduled import",  problem: "Finance manually moves invoice data between NetSuite and Snowflake.",    suggestion: "Set up a nightly scheduled ETL job — one-time build.",         tag: "data-entry", team: "Finance + Data", savesH: 72, effort: "Small",  priority: "high" },
  { id: "fx3", title: "Create a deployment runbook",                       problem: "Engineers repeatedly re-derive the deployment flow.",                   suggestion: "Write a clear runbook; pin it in the eng wiki.",               tag: "docs",       team: "Platform Eng",    savesH: 48, effort: "Small",  priority: "medium" },
  { id: "fx4", title: "Add approval thresholds for low-risk requests",     problem: "Every campaign — big or small — needs a manager signoff.",              suggestion: "Auto-approve under $5k; reserve review for higher spend.",     tag: "approval",   team: "Ops + Legal",     savesH: 64, effort: "Medium", priority: "high" },
  { id: "fx5", title: "Consolidate duplicate CRM updates",                 problem: "Sales updates status in two CRMs; data drifts between them.",           suggestion: "One source of truth; sync the other read-only.",               tag: "dupe",       team: "RevOps",          savesH: 58, effort: "Medium", priority: "medium" },
  { id: "fx6", title: "Build a searchable internal docs index",            problem: "People can't find the doc they need; reinvent answers.",                suggestion: "Add full-text search across Notion + Confluence.",             tag: "docs",       team: "People Ops + IT", savesH: 41, effort: "Large",  priority: "medium" },
];

const SEVERITY_LABELS = { 1: "Low", 2: "Medium", 3: "High", 4: "Critical" };
const HOURLY_RATE = 85;
const FREQ_PER_MONTH = { "Daily": 22, "Weekly": 4, "Monthly": 1, "One-off": 1 };

function catMeta(id) { return CATEGORIES.find(c => c.id === id) || CATEGORIES[0]; }
function catColor(id) {
  const m = catMeta(id);
  return { coral: "#E45A4C", amber: "#E89B3C", lime: "#B6C84A", sage: "#6E7A4A" }[m.color];
}

// ---------- Store ----------
const StoreCtx = createContext(null);
function StoreProvider({ children }) {
  const [reports, setReports] = useState(SEED);
  const [toast, setToast] = useState(null);
  const [page, setPage] = useState("overview");

  function addReport(r) {
    const id = "f" + String(Math.floor(Math.random() * 9000) + 1000);
    const full = { id, when: "just now", who: "You", ...r };
    setReports(prev => [full, ...prev]);
    setToast({ msg: "Report submitted. It’s on the list." });
    setTimeout(() => setToast(null), 3200);
    return full;
  }

  const totals = useMemo(() => {
    let hours = 0, byCat = {}, byTeam = {};
    reports.forEach(r => {
      const h = r.hours * (FREQ_PER_MONTH[r.frequency] || 4);
      hours += h;
      byCat[r.cat]   = (byCat[r.cat]   || 0) + h;
      byTeam[r.team] = (byTeam[r.team] || 0) + h;
    });
    const top = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0] || ["data-entry", 0];
    return {
      hours: Math.round(hours),
      cost: Math.round(hours * HOURLY_RATE),
      count: reports.length,
      topCategory: top[0],
      topCategoryHours: Math.round(top[1]),
      byCat, byTeam,
    };
  }, [reports]);

  return (
    <StoreCtx.Provider value={{ reports, addReport, totals, toast, page, setPage }}>
      {children}
    </StoreCtx.Provider>
  );
}
function useStore() { return useContext(StoreCtx); }

// ---------- Shared UI ----------
function Pill({ children, tone = "" }) {
  return <span className={"pill " + tone}>{children}</span>;
}
function CategoryPill({ id }) {
  const m = catMeta(id);
  return <span className={"pill " + m.color}><span className="dot" />{m.label}</span>;
}
function SeverityPill({ level }) {
  const tone = level >= 4 ? "coral" : level === 3 ? "coral" : level === 2 ? "amber" : "lime";
  return <span className={"pill " + tone}><span className="dot" />{SEVERITY_LABELS[level]}</span>;
}
function PriorityPill({ priority }) {
  const tone = priority === "high" ? "coral" : priority === "medium" ? "amber" : "lime";
  const label = priority[0].toUpperCase() + priority.slice(1);
  return <span className={"pill " + tone}><span className="dot" />{label} priority</span>;
}

function Metric({ label, value, sub, icon, tone }) {
  return (
    <div className="card metric">
      <div className="metric-label">
        {icon && (
          <span className="metric-icon" style={{
            background: tone === "coral" ? "var(--coral-soft)" : tone === "amber" ? "var(--amber-soft)" : "var(--lime-soft)",
            color: tone === "coral" ? "#9a3a2f" : tone === "amber" ? "#8a5816" : "#5a6921",
          }}>{icon}</span>
        )}
        <span>{label}</span>
      </div>
      <div className="metric-value">{value}</div>
      {sub && <div className="metric-sub">{sub}</div>}
    </div>
  );
}

function BarRow({ name, value, max, color }) {
  const pct = Math.max(2, Math.round((value / max) * 100));
  return (
    <div className="bar-row">
      <span className="name">{name}</span>
      <div className="bar">
        <div className="bar-fill" style={{ width: pct + "%", background: color }} />
      </div>
      <span className="val">{value}h</span>
    </div>
  );
}

Object.assign(window, {
  CATEGORIES, TEAMS, TOOLS, FREQ, SEED, FIXES, SEVERITY_LABELS, HOURLY_RATE, FREQ_PER_MONTH,
  catMeta, catColor,
  StoreProvider, useStore,
  Pill, CategoryPill, SeverityPill, PriorityPill, Metric, BarRow,
});
