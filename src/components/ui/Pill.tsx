import type { PropsWithChildren } from "react";

export function Pill({
  children,
  tone = "",
}: PropsWithChildren<{ tone?: string }>) {
  return <span className={`pill ${tone}`.trim()}>{children}</span>;
}
