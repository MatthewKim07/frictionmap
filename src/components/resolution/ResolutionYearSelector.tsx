/** Year navigation for resolution contribution calendar (GitHub-style). */
export function ResolutionYearSelector({
  years,
  selectedYear,
  onSelectYear,
  idPrefix,
}: {
  years: number[];
  selectedYear: number;
  onSelectYear: (y: number) => void;
  idPrefix: string;
}) {
  return (
    <nav className="resolution-year-nav" aria-label="Resolution activity by year">
      {years.map((y) => {
        const sel = y === selectedYear;
        return (
          <button
            key={y}
            type="button"
            id={`${idPrefix}-year-${y}`}
            className={`resolution-year-nav-btn${sel ? " resolution-year-nav-btn--selected" : ""}`}
            aria-current={sel ? "true" : undefined}
            onClick={() => onSelectYear(y)}
          >
            {y}
          </button>
        );
      })}
    </nav>
  );
}
