const ALCOHOLIC_CATEGORY_KEYWORDS = [
  'beer',
  'cocktail',
  'cocktails',
  'wine',
  'wines',
  'champagne',
  'prosecco',
  'spirits',
  'liquor',
  'alcohol',
  'alcoholic',
  'hard seltzer',
  'cider',
];

const normalizeCategory = (value: string) => value.trim().toLowerCase();

export const isAlcoholicCategory = (category: string): boolean => {
  const normalized = normalizeCategory(category);
  return ALCOHOLIC_CATEGORY_KEYWORDS.some((keyword) => normalized.includes(keyword));
};

export const orderCategoriesAlcoholLast = (categories: string[]): string[] => {
  const deduped = Array.from(new Set(categories.map((c) => c?.trim()).filter(Boolean))) as string[];

  const nonAlcoholic: string[] = [];
  const alcoholic: string[] = [];

  deduped.forEach((category) => {
    if (isAlcoholicCategory(category)) {
      alcoholic.push(category);
      return;
    }
    nonAlcoholic.push(category);
  });

  return [...nonAlcoholic, ...alcoholic];
};
