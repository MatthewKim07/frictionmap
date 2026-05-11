export function BarRow({
  name,
  value,
  max,
  color,
}: {
  name: string;
  value: number;
  max: number;
  color: string;
}) {
  const pct = Math.max(2, Math.round((value / max) * 100));
  return (
    <div className="bar-row">
      <span className="name">{name}</span>
      <div className="bar">
        <div className="bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="val">{value}h</span>
    </div>
  );
}
