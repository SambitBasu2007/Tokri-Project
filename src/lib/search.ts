import type { Product } from '../types';
import { categoryLabel } from './catalog';

/**
 * Grocery search needs to understand that "curd", "dahi" and "yogurt" are the
 * same shelf item, not just match the literal product name.
 */
const SYNONYM_GROUPS: readonly (readonly string[])[] = [
  ['curd', 'dahi', 'yogurt', 'yoghurt'],
  ['milk', 'doodh'],
  ['paneer', 'cottage cheese'],
  ['butter', 'makhan'],
  ['ghee', 'clarified butter'],
  ['cream', 'malai'],
  ['lassi', 'buttermilk', 'chaas'],
  ['egg', 'anda'],
  ['bread', 'loaf'],
  ['atta', 'flour', 'wheat flour', 'gehun'],
  ['maida', 'all purpose flour'],
  ['besan', 'gram flour', 'chickpea flour'],
  ['poha', 'flattened rice', 'aval'],
  ['sooji', 'suji', 'rava', 'semolina'],
  ['rice', 'chawal', 'basmati'],
  ['dal', 'daal', 'lentil', 'lentils'],
  ['toor', 'arhar', 'tur'],
  ['moong', 'mung'],
  ['chana', 'chickpea'],
  ['rajma', 'kidney bean', 'kidney beans'],
  ['sugar', 'cheeni', 'shakkar'],
  ['salt', 'namak'],
  ['oil', 'tel'],
  ['mustard oil', 'sarson tel', 'kachi ghani'],
  ['groundnut oil', 'peanut oil', 'moongphali tel'],
  ['sunflower oil', 'surajmukhi tel'],
  ['turmeric', 'haldi'],
  ['chilli', 'chili', 'chilly', 'mirchi'],
  ['coriander', 'cilantro', 'dhania', 'kothmir'],
  ['cumin', 'jeera'],
  ['hing', 'asafoetida'],
  ['pomegranate', 'anar'],
  ['orange', 'santra', 'kinnow'],
  ['grapes', 'angoor'],
  ['mango', 'aam'],
  ['banana', 'kela'],
  ['apple', 'seb'],
  ['watermelon', 'tarbooz'],
  ['dragon fruit', 'pitaya'],
  ['onion', 'pyaz', 'kanda'],
  ['potato', 'aloo', 'batata'],
  ['tomato', 'tamatar'],
  ['ginger', 'adrak'],
  ['garlic', 'lehsun'],
  ['lemon', 'nimbu', 'lime'],
  ['cucumber', 'kheera', 'khira'],
  ['carrot', 'gajar'],
  ['capsicum', 'bell pepper', 'shimla mirch'],
  ['cauliflower', 'gobi'],
  ['spinach', 'palak'],
  ['peas', 'pea', 'matar'],
  ['snack', 'namkeen', 'chips', 'crisps'],
  ['biscuit', 'cookie', 'cookies'],
  ['noodles', 'noodle', 'maggi'],
  ['pasta', 'macaroni'],
  ['ketchup', 'tomato sauce'],
  ['mayonnaise', 'mayo'],
  ['peanut butter', 'pintola'],
  ['corn flakes', 'cornflakes', 'cereal'],
  ['tea', 'chai'],
  ['coffee', 'kaapi'],
  ['juice', 'drink', 'beverage'],
  ['soft drink', 'soda', 'cold drink'],
  ['water', 'paani', 'mineral water'],
  ['detergent', 'washing powder', 'surf'],
  ['dishwash', 'dish wash', 'utensil cleaner', 'vim'],
  ['floor cleaner', 'disinfectant', 'lizol'],
  ['glass cleaner', 'window cleaner', 'colin'],
  ['toilet paper', 'tissue', 'tissue paper', 'napkin'],
  ['garbage bag', 'garbage bags', 'trash bag', 'bin bag'],
  ['foil', 'aluminium foil', 'aluminum foil'],
  ['scrub', 'scourer', 'scrub pad'],
  ['fabric conditioner', 'softener', 'comfort'],
  ['mosquito', 'repellent', 'good knight'],
  ['toothpaste', 'dental', 'colgate', 'pepsodent'],
  ['soap', 'body wash', 'dettol'],
  ['shampoo', 'hair wash'],
  ['face wash', 'cleanser', 'himalaya'],
  ['lotion', 'moisturizer', 'vaseline'],
  ['razor', 'shaving', 'gillette'],
  ['sanitary pad', 'sanitary pads', 'pads', 'whisper'],
  ['almond', 'badam'],
  ['chia', 'chia seeds'],
  ['oats', 'oat'],
  ['cold coffee', 'nescafe'],
  ['idli', 'rava idli', 'idli mix'],
  ['soup', 'knorr'],
  ['popcorn', 'act ii'],
  ['peanut', 'groundnut', 'moongphali'],
  ['hazelnut', 'nutella'],
  ['chocolate', 'cadbury', 'dairy milk'],
  ['wafer', 'kitkat'],
];

const SYNONYMS = new Map<string, Set<string>>();
for (const group of SYNONYM_GROUPS) {
  const tokens = new Set<string>();
  for (const term of group) {
    for (const token of tokenize(term)) tokens.add(token);
  }
  for (const token of tokens) {
    const existing = SYNONYMS.get(token) ?? new Set<string>();
    for (const synonym of tokens) existing.add(synonym);
    SYNONYMS.set(token, existing);
  }
}

function stem(token: string): string {
  if (token.length <= 3) return token;
  if (token.endsWith('ies')) return `${token.slice(0, -3)}y`;
  if (token.endsWith('oes')) return token.slice(0, -2);
  if (/(?:ches|shes|sses|xes|zes)$/.test(token)) return token.slice(0, -2);
  if (token.endsWith('s') && !token.endsWith('ss')) return token.slice(0, -1);
  return token;
}

function tokenize(value: string): string[] {
  return normalizeSearchText(value)
    .split(' ')
    .filter(Boolean)
    .map(stem);
}

export function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

interface SearchDoc {
  name: string;
  nameTokens: Set<string>;
  allTokens: Set<string>;
}

const docCache = new WeakMap<Product, SearchDoc>();

function docFor(product: Product): SearchDoc {
  const cached = docCache.get(product);
  if (cached) return cached;

  const nameTokens = new Set(tokenize(product.name));
  const allTokens = new Set([
    ...nameTokens,
    ...tokenize(categoryLabel(product.category)),
    ...tokenize(product.category),
    ...tokenize(product.weight),
  ]);
  // Only expand synonyms from the product name. Expanding category words like
  // "snacks" would make every snack appear for "chips", which is too broad.
  for (const token of [...nameTokens]) {
    const synonyms = SYNONYMS.get(token);
    if (synonyms) for (const synonym of synonyms) allTokens.add(synonym);
  }

  const doc = { name: normalizeSearchText(product.name), nameTokens, allTokens };
  docCache.set(product, doc);
  return doc;
}

function hasPrefix(tokens: Set<string>, queryToken: string): boolean {
  if (queryToken.length < 3) return false;
  for (const token of tokens) {
    if (token.startsWith(queryToken)) return true;
  }
  return false;
}

/**
 * Returns 0 when the product does not match, or a positive score when it does.
 * Name matches rank above category/synonym matches.
 */
export function searchScore(product: Product, query: string): number {
  const normalized = normalizeSearchText(query);
  if (!normalized) return 1;

  const queryTokens = normalized.split(' ').filter(Boolean).map(stem);
  const doc = docFor(product);
  let score = 0;

  for (const token of queryTokens) {
    if (doc.nameTokens.has(token)) {
      score += 40;
    } else if (hasPrefix(doc.nameTokens, token)) {
      score += 28;
    } else if (doc.allTokens.has(token)) {
      score += 14;
    } else if (hasPrefix(doc.allTokens, token)) {
      score += 8;
    } else {
      return 0;
    }
  }

  if (doc.name === normalized) score += 120;
  else if (doc.name.startsWith(normalized)) score += 80;
  else if (doc.name.includes(normalized)) score += 35;

  return score;
}
