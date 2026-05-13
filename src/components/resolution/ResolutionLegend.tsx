const LEVEL_SWATCH: { bg: string; border: string }[] = [
  { bg: "#f4f0e8", border: "1px solid #e3ddd2" },
  { bg: "#e8f2dc", border: "1px solid #c5d4ae" },
  { bg: "#c5d9a8", border: "1px solid #9fb882" },
  { bg: "#e8c48a", border: "1px solid #c49a52" },
  { bg: "#e07a5f", border: "1px solid #9c3d2e" },
];

/** Text + swatches for contribution intensity (paired with color). */
export function ResolutionLegend() {
  const levels = [
    { n: 0, label: "None" },
    { n: 1, label: "Low" },
    { n: 2, label: "Moderate" },
    { n: 3, label: "High" },
    { n: 4, label: "Very high" },
  ] as const;
  return (
    <div
      className="resolution-legend"
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 10,
        fontSize: 12,
        color: "var(--ink-soft)",
      }}
      aria-label="Contribution intensity legend"
    >
      <span style={{ fontWeight: 600, color: "var(--ink)" }}>Less</span>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        {levels.map(({ n, label }) => {
          const sw = LEVEL_SWATCH[n] ?? LEVEL_SWATCH[0]!;
          return (
            <span key={n} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <span
                aria-hidden
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 3,
                  boxSizing: "border-box",
                  background: sw.bg,
                  border: sw.border,
                }}
              />
              <span>{label}</span>
            </span>
          );
        })}
      </div>
      <span style={{ fontWeight: 600, color: "var(--ink)" }}>More</span>
    </div>
  );
}
