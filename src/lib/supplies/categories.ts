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

  return {
    name: categoryName,
    emoji: '🏷️',
    color: '#6366f1',
    bg: 'rgba(99, 102, 241, 0.12)',
    border: 'rgba(99, 102, 241, 0.3)',
  };
}

// Automatic smart categorization rules
const CATEGORY_RULES: Array<{ category: string; keywords: string[] }> = [
  {
    category: 'Vegetables & Fruits',
    keywords: [
      'tomato', 'tomatoes', 'potato', 'potatoes', 'onion', 'onions', 'garlic', 'ginger',
      'spinach', 'palak', 'coriander', 'cilantro', 'mint', 'pudina', 'chili', 'chilli',
      'mirchi', 'lemon', 'lemons', 'nimbu', 'lime', 'carrot', 'carrots', 'cucumber',
      'capsicum', 'bell pepper', 'cabbage', 'cauliflower', 'gobi', 'broccoli', 'peas',
      'matar', 'beans', 'mushroom', 'mushrooms', 'apple', 'apples', 'banana', 'bananas',
      'orange', 'oranges', 'grapes', 'mango', 'mangoes', 'watermelon', 'melon', 'papaya',
      'berry', 'berries', 'strawberry', 'blueberry', 'avocado', 'lettuce', 'beetroot',
      'radish', 'mooli', 'bhindi', 'okra', 'brinjal', 'eggplant', 'baingan', 'pumpkin',
      'corn', 'sweetcorn', 'coconut', 'fruit', 'fruits', 'veg', 'veggie', 'veggies',
      'vegetable', 'vegetables', 'salad', 'methi', 'fenugreek', 'curry leaves',
    ],
  },
  {
    category: 'Dairy & Eggs',
    keywords: [
      'milk', 'doodh', 'curd', 'dahi', 'yogurt', 'yoghurt', 'cheese', 'butter', 'makhan',
      'paneer', 'cream', 'malai', 'ghee', 'egg', 'eggs', 'anda', 'cheddar', 'mozzarella',
      'parmesan', 'mayo', 'mayonnaise', 'tofu', 'soya paneer', 'condensed milk',
      'oat milk', 'almond milk', 'soy milk', 'amul', 'yakult', 'buttermilk', 'chaas',
    ],
  },
  {
    category: 'Cleaning Supplies',
    keywords: [
      'dishwash', 'dish soap', 'dishwasher', 'vim', 'pril', 'exo', 'detergent', 'surf',
      'ariel', 'tide', 'surf excel', 'fabric softener', 'comfort', 'bleach', 'harpic',
      'lizol', 'floor cleaner', 'domex', 'colin', 'glass cleaner', 'toilet cleaner',
      'mop', 'broom', 'jhadu', 'brush', 'sponge', 'scrubber', 'scotch brite', 'wipe',
      'wipes', 'trash bag', 'garbage bag', 'bin bag', 'dustbin', 'paper towel',
      'kitchen roll', 'tissue', 'tissues', 'toilet paper', 'toilet roll', 'duster',
      'disinfectant', 'phenyl', 'odonil', 'air freshener', 'room spray', 'stain remover',
    ],
  },
  {
    category: 'Personal Care',
    keywords: [
      'shampoo', 'conditioner', 'body wash', 'shower gel', 'hand wash', 'handwash',
      'soap bar', 'bath soap', 'dove', 'dettol', 'pears', 'lux', 'fiama', 'nivea',
      'toothpaste', 'toothbrush', 'colgate', 'oral-b', 'sensodyne', 'pepsodent',
      'mouthwash', 'floss', 'dental floss', 'facewash', 'face wash', 'cleanser',
      'moisturizer', 'lotion', 'body lotion', 'face cream', 'sunscreen', 'sunblock',
      'deodorant', 'deo', 'perfume', 'body spray', 'razor', 'gillette', 'shaving',
      'shave', 'aftershave', 'blade', 'blades', 'sanitary', 'pad', 'pads', 'tampon',
      'cotton', 'earbuds', 'q-tips', 'sanitizer', 'hand sanitizer', 'bandaid', 'bandage',
      'lip balm', 'vaseline', 'hair oil', 'serum', 'nail cutter',
    ],
  },
  {
    category: 'Household Essentials',
    keywords: [
      'bulb', 'light bulb', 'led', 'lamp', 'battery', 'batteries', 'cell', 'duracell',
      'tape', 'duct tape', 'cellotape', 'glue', 'fevikwik', 'fevicol', 'scissors',
      'matchbox', 'matches', 'lighter', 'candle', 'candles', 'foil', 'aluminum foil',
      'aluminium foil', 'cling wrap', 'plastic wrap', 'baking paper', 'parchment',
      'ziploc', 'zip lock', 'plastic bag', 'extension cord', 'plug', 'adapter',
      'all out', 'good knight', 'hit spray', 'mosquito', 'repellent', 'baygon',
      'lock', 'padlock', 'napkin', 'napkins', 'cloth', 'scrub pad',
    ],
  },
  {
    category: 'Cat & Pets',
    keywords: [
      'cat', 'cats', 'kitten', 'kittens', 'dog', 'dogs', 'puppy', 'puppies', 'pet',
      'pets', 'whiskas', 'pedigree', 'drools', 'purina', 'royal canin', 'sheba',
      'kibble', 'cat food', 'dog food', 'pet food', 'cat treats', 'dog treats',
      'catnip', 'cat litter', 'dog leash', 'collar', 'scratcher', 'pet toy',
    ],
  },
  {
    category: 'Groceries',
    keywords: [
      'rice', 'chawal', 'basmati', 'atta', 'flour', 'wheat', 'maida', 'suji', 'rava',
      'dal', 'daal', 'lentil', 'lentils', 'toor', 'moong', 'chana', 'urad', 'rajma',
      'chhole', 'besan', 'poha', 'oil', 'cooking oil', 'mustard oil', 'sunflower oil',
      'olive oil', 'refined oil', 'sesame oil', 'salt', 'namak', 'sugar', 'cheeni',
      'jaggery', 'gur', 'tea', 'chai', 'coffee', 'nescafe', 'bru', 'green tea',
      'maggi', 'noodles', 'pasta', 'macaroni', 'spaghetti', 'sauce', 'ketchup',
      'bread', 'brown bread', 'bun', 'pav', 'roti', 'tortilla', 'biscuit', 'biscuits',
      'cookie', 'cookies', 'rusk', 'chips', 'lays', 'kurkure', 'namkeen', 'bhujia',
      'snack', 'snacks', 'popcorn', 'peanut', 'peanuts', 'cashew', 'cashews', 'kaju',
      'almond', 'almonds', 'badam', 'raisin', 'raisins', 'kishmish', 'walnut',
      'oats', 'muesli', 'cornflakes', 'cereal', 'jam', 'honey', 'peanut butter',
      'mayo', 'vinegar', 'soya sauce', 'chilli sauce', 'schezwan', 'spice', 'spices',
      'masala', 'haldi', 'turmeric', 'jeera', 'cumin', 'mustard seed', 'rai',
      'garam masala', 'black pepper', 'kali mirch', 'cardamom', 'elaichi', 'clove',
      'laung', 'cinnamon', 'dalchini', 'baking powder', 'baking soda', 'yeast',
      'papad', 'pickle', 'achar',
    ],
  },
];

/**
 * Automatically infers the most suitable category based on item name.
 */
export function autoCategorizeSupplyItem(itemName: string): string {
  if (!itemName || !itemName.trim()) return 'Groceries';
  const clean = itemName.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  const words = clean.split(/\s+/).filter(Boolean);

  // 1. Exact phrase or whole word match
  for (const rule of CATEGORY_RULES) {
    for (const keyword of rule.keywords) {
      if (clean.includes(keyword)) {
        return rule.category;
      }
      if (words.some((w) => w === keyword)) {
        return rule.category;
      }
    }
  }

  // Default fallback
  return 'Groceries';
}

/**
 * Parses user input to extract quantity if typed together (e.g. "Milk 2L" or "Onions - 1kg")
 */
export function parseSupplyInput(input: string): { name: string; quantity: string | null } {
  const trimmed = input.trim();
  if (!trimmed) return { name: '', quantity: null };

  // Common quantity patterns: "2L", "500ml", "1kg", "2 packs", "3 pcs", "1 box", etc.
  const qtyRegex = /(?:[-–—:]\s*)?\(?(\d+(?:\.\d+)?\s*(?:kg|g|gm|gms|l|ltr|liter|liters|litre|litres|ml|pack|packs|pkt|pkts|packet|packets|bottle|bottles|box|boxes|can|cans|pcs|pieces|dozen|doz))\)?$/i;
  const match = trimmed.match(qtyRegex);

  if (match && match[1]) {
    const rawQty = match[1].trim();
    const cleanName = trimmed.replace(qtyRegex, '').replace(/[-–—:]$/, '').trim();
    if (cleanName.length > 0) {
      return {
        name: cleanName,
        quantity: rawQty,
      };
    }
  }

  return {
    name: trimmed,
    quantity: null,
  };
}
