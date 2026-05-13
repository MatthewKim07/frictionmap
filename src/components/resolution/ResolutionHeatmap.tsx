import type { HeatmapCell } from "@/lib/resolutionAnalytics";

const LEVEL_STYLES: Record<number, { bg: string; border: string }> = {
  0: { bg: "var(--paper-2)", border: "1px solid var(--rule)" },
  1: { bg: "rgba(189, 220, 160, 0.35)", border: "1px solid rgba(120, 150, 90, 0.35)" },
  2: { bg: "rgba(189, 220, 160, 0.65)", border: "1px solid rgba(100, 130, 70, 0.45)" },
  3: { bg: "var(--amber-soft)", border: "1px solid rgba(212, 160, 80, 0.55)" },
  4: { bg: "rgba(228, 90, 76, 0.35)", border: "1px solid rgba(180, 60, 50, 0.45)" },
};

export function ResolutionHeatmap({ cells, captionId }: { cells: HeatmapCell[]; captionId: string }) {
  const max = Math.max(1, ...cells.map((c) => c.costSaved));
  return (
    <>
      <style>
        {`.resolution-heatmap-cell:focus-visible {
          outline: 2px solid var(--coral);
          outline-offset: 2px;
        }`}
      </style>
      <div role="group" aria-labelledby={captionId}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(11px, 1fr))",
          gap: 4,
          maxWidth: "100%",
        }}
      >
        {cells.map((c) => {
          const style = LEVEL_STYLES[c.level] ?? LEVEL_STYLES[0];
          return (
            <button
              key={c.dateKey}
              type="button"
              title={c.label}
              aria-label={c.label}
              className="resolution-heatmap-cell"
              style={{
                width: "100%",
                aspectRatio: "1",
                minWidth: 10,
                maxWidth: 16,
                borderRadius: 4,
                padding: 0,
                cursor: "default",
                background: style.bg,
                border: style.border,
              }}
            >
              <span className="visually-hidden">{c.label}</span>
            </button>
          );
        })}
      </div>
      <p className="visually-hidden" id={`${captionId}-max`}>
        Intensity scale: highest day in view is approximately {max} estimated monthly dollars addressed.
      </p>
    </div>
    </>
  );
}
