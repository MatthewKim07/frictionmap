import { brandLogoUrl } from "@/assets";

/** “Friction” solid + “Map” gradient — matches marketing wordmark. */
export function FrictionMapBrandText() {
  return (
    <span className="brand-wordmark-text" aria-label="FrictionMap">
      <span className="brand-wordmark-text__friction" aria-hidden="true">
        Friction
      </span>
      <span className="brand-wordmark-text__map" aria-hidden="true">
        Map
      </span>
    </span>
  );
}

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
      <FrictionMapBrandText />
    </div>
  );
}
