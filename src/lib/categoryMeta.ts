import { CATEGORY_DEFINITIONS, type FrictionCategoryId } from "@/data/constants";

const CATEGORY_COLORS: Record<string, string> = {
  coral: "#E45A4C",
  amber: "#E89B3C",
  lime: "#B6C84A",
  sage: "#6E7A4A",
};

export function categoryMeta(id: FrictionCategoryId) {
  return CATEGORY_DEFINITIONS.find((c) => c.id === id) ?? CATEGORY_DEFINITIONS[0];
}

export function categoryColorHex(id: FrictionCategoryId): string {
  const meta = categoryMeta(id);
  return CATEGORY_COLORS[meta.color] ?? CATEGORY_COLORS.sage;
}
