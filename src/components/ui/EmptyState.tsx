import type { ReactNode } from "react";

/** Compact empty / “no rows” messaging with optional actions — matches FrictionMap card typography. */
export function EmptyState({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div
      className="empty-state card"
      style={{
        padding: "22px 20px",
        borderStyle: "dashed",
        background: "var(--paper)",
      }}
      role="status"
    >
      <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8, color: "var(--ink)" }}>{title}</div>
      <p style={{ margin: "0 0 16px", fontSize: 14, color: "var(--ink-soft)", lineHeight: 1.55 }}>{description}</p>
      {children && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {children}
        </div>
      )}
    </div>
  );
}
