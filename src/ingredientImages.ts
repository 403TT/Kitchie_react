// — Replace with your actual R2 public bucket URL
const BASE_URL = "https://pub-469367e47a36493c86471c8917c4e8b7.r2.dev"

type IngredientStyle = {
  width: number;
  height: number;
  borderRadius?: number;
};

type IngredientAsset = {
  source: { uri: string };
  style: IngredientStyle;
};

const defaultStyle: IngredientStyle = {
  width: 40,
  height: 40,
  borderRadius: 8,
};

// Only ingredients that need custom sizing â€” everything else uses defaultStyle
const customStyles: Record<string, IngredientStyle> = {
  milk: { width: 40, height: 45 },
  carrot: { width: 28, height: 64, borderRadius: 14 },
  "soy sauce": { width: 36, height: 64, borderRadius: 24 },
};

// Master list of all ingredient keys + their filename on R2
// Filename convention: spaces â†’ underscores, title case (e.g. "spring onion" â†’ "Spring_onion.png")
const INGREDIENTS: Record<string, string> = {
  milk: "Milk",
  carrot: "Carrot",
  "soy sauce": "Soy_sauce",
  egg: "Egg",
  "bok choy": "Bok_choy",
  pepper: "Pepper_shaker",
  salt: "Salt_shaker",
  watermelon: "Watermelon",
  potato: "Potato",
  butter: "Butter",
  kimchi: "Kimchi",
  garlic: "Garlic",
  "spring onion": "Spring_onion",
  onion: "Onion",
  chicken: "Chicken_drumstick",
  pork: "Pork_belly",
  tofu: "Tofu",
  vinegar: "Vinegar",
  dumpling: "Dumpling",
  "fish ball": "Fish_ball",
  "meat ball": "Meat_ball",
  broccoli: "Broccoli",
  sugar: "Sugar",
  soda: "Soda",
};

export const defaultIngredientImage = { uri: `${BASE_URL}/default.png` };

export function normalizeIngredientName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

// HomeScreen uses this (source + style)
export function getIngredientAsset(name: string): IngredientAsset {
  const key = normalizeIngredientName(name);
  const filename = INGREDIENTS[key];

  if (!filename) {
    return { source: defaultIngredientImage, style: defaultStyle };
  }

  return {
    source: { uri: `${BASE_URL}/${filename}.png` },
    style: customStyles[key] ?? { width: 50, height: 60, borderRadius: 30 },
  };
}

// StockScreen uses this (source only)
export function getIngredientImage(name: string) {
  return getIngredientAsset(name).source;
}

// All available ingredient keys
export const INGREDIENT_KEYS = Object.keys(INGREDIENTS)