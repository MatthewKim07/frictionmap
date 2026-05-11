/* global React, useStore, CATEGORIES, TEAMS, Eyebrow, Tag, HeatBar, Stat, catMeta */
function AnalyticsScreen() {
  const { totals, reports } = useStore();
  const sortedCats = Object.entries(totals.byCat).sort((a,b)=>b[1]-a[1]);
  const sortedTeams = Object.entries(totals.byTeam).sort((a,b)=>b[1]-a[1]);
  const maxCat = sortedCats[0]?.[1] || 1;
  const maxTeam = sortedTeams[0]?.[1] || 1;
  const topCat = catMeta(totals.topCategory);

  // top processes by hours
  const topProcesses = [...reports].sort((a,b) => {
    const m = {Daily:22, Weekly:4, "Few times/wk":12, Monthly:1, "One-off":1};
    return (b.hours*(m[b.frequency]||4)) - (a.hours*(m[a.frequency]||4));
  }).slice(0, 5).map(r => {
    const m = {Daily:22, Weekly:4, "Few times/wk":12, Monthly:1, "One-off":1};
    return { ...r, monthly: r.hours * (m[r.frequency] || 4) };
  });

  // cost leakage = % of theoretical max (say 600h/mo)
  const leakPct = Math.min(100, Math.round((totals.hours/800)*100));

  return (
    <div className="page fade-up" style={{maxWidth: 1400}}>
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom: 22}}>
        <div>
          <Eyebrow>Analytics · this month</Eyebrow>
          <h1 className="display" style={{fontSize: 64, margin: "8px 0 0"}}>
            The <em>weight</em> of small slowdowns.
          </h1>
        </div>
        <div style={{display:"flex", gap: 8}}>
          <Tag>Last 30 days</Tag>
          <Tag color="amber">Org-wide</Tag>
        </div>
      </div>

      {/* Top metric strip */}
      <div style={{display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap: 16, marginBottom: 16}}>
        <Stat label="Total hours lost · month" value={totals.hours.toLocaleString() + "h"} sub="across all reports & teams" accent="var(--coral)" />
        <Stat label="Estimated cost lost" value={"$" + (totals.cost/1000).toFixed(1) + "k"} sub={`@ $${85}/hr blended`} />
        <Stat label="Friction reports" value={totals.count} sub="anonymous + aggregated" accent="var(--amber)" />
      </div>
      <div style={{display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap: 16, marginBottom: 28}}>
        <div className="card" style={{display:"flex", flexDirection:"column", gap: 8}}>
          <Eyebrow dot={false}>Top friction category</Eyebrow>
          <div className="display" style={{fontSize: 34, lineHeight: 1}}>{topCat.label}</div>
          <div className="num" style={{fontSize: 28, color:"var(--coral)"}}>{totals.topCategoryHours}h</div>
        </div>
        <div className="card" style={{display:"flex", flexDirection:"column", gap: 8}}>
          <Eyebrow dot={false}>Highest-cost process</Eyebrow>
          <div className="display" style={{fontSize: 24, lineHeight: 1.05}}>{topProcesses[0]?.title || "—"}</div>
          <div className="num" style={{fontSize: 28}}>${(topProcesses[0]?.monthly*85 || 0).toLocaleString()}<span style={{fontSize:14, color:"var(--ink-mute)"}}> /mo</span></div>
        </div>
        <div className="card" style={{display:"flex", flexDirection:"column", gap: 8, background:"var(--ink)", color:"var(--paper-3)"}}>
          <div className="eyebrow" style={{color:"var(--paper-3)", opacity:.7}}>Potential annual savings</div>
          <div className="num" style={{fontSize: 56, color:"var(--lime)"}}>${(totals.annualSavings/1000).toFixed(0)}k</div>
          <div style={{fontSize: 12, opacity: .7}}>if top fixes land · 62% capture assumption</div>
        </div>
      </div>

      {/* Heatbars + leakage */}
      <div style={{display:"grid", gridTemplateColumns:"1.3fr 1fr", gap: 22}}>
        <div className="card">
          <Eyebrow>Hours lost · by category</Eyebrow>
          <div style={{display:"flex", flexDirection:"column", gap: 12, marginTop: 14}}>
            {sortedCats.map(([cid, h]) => {
              const m = catMeta(cid);
              const c = {coral:"#E45A4C", amber:"#E89B3C", lime:"#B6C84A", sage:"#6E7A4A"}[m.color];
              return (
                <div key={cid} style={{display:"grid", gridTemplateColumns:"180px 1fr", gap: 14, alignItems:"center"}}>
                  <div style={{fontSize: 13}}>{m.label}</div>
                  <HeatBar value={Math.round(h)} max={Math.round(maxCat)} color={c} />
                </div>
              );
            })}
          </div>
        </div>

        <div className="card" style={{display:"flex", flexDirection:"column", gap: 14, background:"linear-gradient(180deg, var(--paper-3) 0%, var(--paper-2) 100%)"}}>
          <Eyebrow>Cost leakage meter</Eyebrow>
          <div style={{position:"relative", height: 24, background:"var(--paper-2)", borderRadius: 99, border:"1px solid var(--rule-strong)", overflow:"hidden"}}>
            <div style={{
              width: leakPct + "%", height:"100%",
              background:"linear-gradient(90deg, var(--lime), var(--amber) 50%, var(--coral))",
              transition:"width 1s ease",
            }}/>
            <div style={{position:"absolute", top: 0, left: leakPct + "%", width: 2, height:"100%", background:"var(--ink)"}}/>
          </div>
          <div style={{display:"flex", justifyContent:"space-between", fontSize: 11}} className="mono">
            <span>0h</span><span>400h</span><span>800h+</span>
          </div>
          <div style={{marginTop: 6}}>
            <div className="num" style={{fontSize: 56, color: leakPct > 60 ? "var(--coral)" : "var(--amber)"}}>
              {leakPct}<span style={{fontSize: 24}}>%</span>
            </div>
            <div style={{fontSize: 13, color:"var(--ink-soft)"}}>
              of org-wide drag budget consumed this month.
              {leakPct > 60 ? " Pressure rising — fixes recommended." : " Holding steady."}
            </div>
          </div>
        </div>
      </div>

      {/* Team impact grid */}
      <div style={{marginTop: 28}}>
        <Eyebrow>Team impact · who's feeling it</Eyebrow>
        <div style={{display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap: 14, marginTop: 12}}>
          {sortedTeams.map(([team, h], i) => {
            const tone = [["var(--coral)","var(--paper-3)"], ["var(--amber)","var(--ink)"], ["var(--lime)","var(--ink)"], ["var(--paper-3)","var(--ink)"]];
            const [bg, fg] = tone[i % 4];
            return (
              <div key={team} className="card" style={{background: bg, color: fg, padding: 18}}>
                <div className="mono" style={{fontSize: 10, letterSpacing:".14em", textTransform:"uppercase", opacity:.7}}>Team</div>
                <div className="display" style={{fontSize: 24, marginTop: 4}}>{team}</div>
                <div className="num" style={{fontSize: 42, marginTop: 8}}>{Math.round(h)}h</div>
                <div style={{fontSize: 12, opacity: .8}}>≈ ${Math.round(h*85).toLocaleString()} this month</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

window.AnalyticsScreen = AnalyticsScreen;
