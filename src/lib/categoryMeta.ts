import type { FrictionCategory } from "@/constants/friction";

const CATEGORY_TONE: Record<FrictionCategory, "coral" | "amber" | "lime"> = {
  "Access delay": "coral",
  "Approval bottleneck": "amber",
  "Manual data entry": "amber",
  "Tool confusion": "lime",
  "Missing documentation": "lime",
  "Duplicate work": "coral",
  "Waiting on another team": "amber",
  "Rework or error correction": "coral",
};

const CATEGORY_COLORS: Record<string, string> = {
  coral: "#E45A4C",
  amber: "#E89B3C",
  lime: "#B6C84A",
  sage: "#6E7A4A",
};

export function categoryMeta(category: FrictionCategory) {
  const tone = CATEGORY_TONE[category] ?? "lime";
  return { label: category, tone };
}

export function categoryColorHex(category: FrictionCategory): string {
  const { tone } = categoryMeta(category);
  return CATEGORY_COLORS[tone] ?? CATEGORY_COLORS.lime;
}
