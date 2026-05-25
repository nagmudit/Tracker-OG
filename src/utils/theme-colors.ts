export const categoryColorTokens = [
  "chart-1",
  "chart-2",
  "chart-3",
  "chart-4",
  "chart-5",
] as const;

export type CategoryColorToken = (typeof categoryColorTokens)[number];

const categoryTokenByName: Record<string, CategoryColorToken> = {
  travel: "chart-2",
  grocery: "chart-1",
  "food & dining": "chart-3",
  entertainment: "chart-4",
  shopping: "chart-5",
  "bills & utilities": "chart-2",
  healthcare: "chart-4",
  miscellaneous: "chart-5",
};

export function isCategoryColorToken(value: string): value is CategoryColorToken {
  return categoryColorTokens.includes(value as CategoryColorToken);
}

export function normalizeCategoryColor(
  value: string | null | undefined,
  name = ""
): CategoryColorToken {
  if (value && isCategoryColorToken(value)) {
    return value;
  }

  return categoryTokenByName[name.trim().toLowerCase()] || "chart-1";
}

export function tokenToCssVar(token: CategoryColorToken | string): string {
  return `var(--${normalizeCategoryColor(token)})`;
}
