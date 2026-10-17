export type SupplyCategory = {
  name: string;
  emoji: string;
  color: string;
  bg: string;
  border: string;
};

export const DEFAULT_SUPPLY_CATEGORIES: SupplyCategory[] = [
  {
    name: 'Groceries',
    emoji: '🛒',
    color: '#10b981',
    bg: 'rgba(16, 185, 129, 0.12)',
    border: 'rgba(16, 185, 129, 0.3)',
  },
  {
    name: 'Vegetables & Fruits',
    emoji: '🥦',
    color: '#84cc16',
    bg: 'rgba(132, 204, 22, 0.12)',
    border: 'rgba(132, 204, 22, 0.3)',
  },
  {
    name: 'Dairy & Eggs',
    emoji: '🥛',
    color: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.12)',
    border: 'rgba(245, 158, 11, 0.3)',
  },
  {
    name: 'Cleaning Supplies',
    emoji: '🧹',
    color: '#06b6d4',
    bg: 'rgba(6, 182, 212, 0.12)',
    border: 'rgba(6, 182, 212, 0.3)',
  },
  {
    name: 'Personal Care',
    emoji: '🧴',
    color: '#8b5cf6',
    bg: 'rgba(139, 92, 246, 0.12)',
    border: 'rgba(139, 92, 246, 0.3)',
  },
  {
    name: 'Household Essentials',
    emoji: '🏡',
    color: '#3b82f6',
    bg: 'rgba(59, 130, 246, 0.12)',
    border: 'rgba(59, 130, 246, 0.3)',
  },
  {
    name: 'Cat & Pets',
    emoji: '🐾',
    color: '#ec4899',
    bg: 'rgba(236, 72, 153, 0.12)',
    border: 'rgba(236, 72, 153, 0.3)',
  },
  {
    name: 'Other',
    emoji: '📦',
    color: '#64748b',
    bg: 'rgba(100, 116, 139, 0.12)',
    border: 'rgba(100, 116, 139, 0.3)',
  },
];

export function getCategoryMeta(categoryName?: string | null): SupplyCategory {
  if (!categoryName) return DEFAULT_SUPPLY_CATEGORIES[0];
  const found = DEFAULT_SUPPLY_CATEGORIES.find(
    (c) => c.name.toLowerCase() === categoryName.trim().toLowerCase()
  );
  if (found) return found;

  // Fallback for custom category names
  return {
    name: categoryName,
    emoji: '🏷️',
    color: '#6366f1',
    bg: 'rgba(99, 102, 241, 0.12)',
    border: 'rgba(99, 102, 241, 0.3)',
  };
}
