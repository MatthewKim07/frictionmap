import { brandLogoUrl } from "@/assets";

type BrandWordmarkProps = {
  /** Slightly smaller mark + type for modals and tight layouts. */
  compact?: boolean;
  className?: string;
};

export function BrandWordmark({ compact, className }: BrandWordmarkProps) {
  const w = compact ? 32 : 48;
  const h = compact ? 32 : 48;
  return (
    <div className={["brand", compact ? "brand--compact" : "", className ?? ""].filter(Boolean).join(" ")}>
      <img className="brand-logo" src={brandLogoUrl} alt="" width={w} height={h} decoding="async" />
      <span>FrictionMap</span>
    </div>
  );
}
