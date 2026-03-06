import { useState, useRef, useEffect, useCallback } from "react";
import { createClient, type User } from "@supabase/supabase-js";

/* ─────────────────────────────────────────────────────────────────────────
   SUPABASE CONFIG — replace these with your real values, then set USE_MOCK to false
───────────────────────────────────────────────────────────────────────── */
const SUPABASE_URL = "https://mxkcxdeslrqlykwwokyu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14a2N4ZGVzbHJxbHlrd3dva3l1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2MTAyNjgsImV4cCI6MjA4ODE4NjI2OH0.2cvH0aPYExqhdQy0KL3-Zdoy9Cnowl8vOdjXnKz8aq0";
const USE_MOCK = false; // set to false for live Spoonacular results

// Single shared Supabase client (auth + edge functions)
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ─────────────────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────────────────── */
type Cuisine = "All" | "Indian" | "Chinese" | "Italian" | "American" | "Mediterranean" | "Mexican" | "Japanese";
type Difficulty = "Easy" | "Medium" | "Hard";
type ViewName = "home" | "recipes" | "results";

interface Step { step: number; title: string; instruction: string; tip?: string; why?: string; }
interface Recipe {
  id: number; title: string; image: string; cuisine: Cuisine;
  readyInMinutes: number; servings: number; difficulty: Difficulty;
  description: string; ingredients: string[]; missingIngredients: string[];
  steps: Step[]; proTip: string; tags: string[]; sourceUrl?: string;
  matchPct?: number;
}

/* ─────────────────────────────────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────────────────────────────────── */
const CUISINES: { label: Cuisine; emoji: string }[] = [
  { label: "All", emoji: "🌍" }, { label: "Indian", emoji: "🇮🇳" },
  { label: "Chinese", emoji: "🇨🇳" }, { label: "Italian", emoji: "🇮🇹" },
  { label: "American", emoji: "🇺🇸" }, { label: "Mediterranean", emoji: "🫒" },
  { label: "Mexican", emoji: "🇲🇽" }, { label: "Japanese", emoji: "🇯🇵" },
];

const INGREDIENT_DB = [
  "chicken","chicken breast","chicken thighs","beef","ground beef","pork","bacon","ham","salmon","tuna",
  "shrimp","eggs","milk","heavy cream","butter","ghee","paneer","cheddar cheese","mozzarella","parmesan",
  "feta","ricotta","garlic","onion","red onion","green onion","tomato","tomato paste","potato","sweet potato",
  "broccoli","cauliflower","spinach","kale","cabbage","carrot","celery","cucumber","zucchini","eggplant",
  "bell pepper","mushroom","avocado","lemon","lime","pasta","spaghetti","penne","rice","basmati rice",
  "jasmine rice","bread","naan","tortilla","flour","cornstarch","sugar","honey","olive oil","vegetable oil",
  "sesame oil","coconut oil","soy sauce","oyster sauce","fish sauce","balsamic vinegar","rice vinegar",
  "salt","black pepper","cumin","paprika","turmeric","cinnamon","garam masala","coriander powder","oregano",
  "basil","thyme","rosemary","cilantro","parsley","chili flakes","curry powder","yogurt","coconut milk",
  "chickpeas","lentils","black beans","kidney beans","tofu","peanuts","cashews","walnuts","oats","quinoa",
  "ginger","garlic powder","chili powder","mustard seeds","cardamom","cloves","bay leaves","tamarind",
  "kashmiri chili","amchur powder","saffron","chicken broth","vegetable broth","beef broth",
].sort();

/* ─────────────────────────────────────────────────────────────────────────
   VEG / NON-VEG DETECTION
───────────────────────────────────────────────────────────────────────── */
const NON_VEG_TOKENS = [
  "chicken","beef","pork","bacon","ham","lamb","turkey","duck","veal","mutton","goat",
  "salmon","tuna","shrimp","prawn","crab","lobster","clam","squid","fish","anchovy","mahi",
  "sausage","pepperoni","chorizo","pancetta","guanciale","lardons","lard",
];
function isVegRecipe(r: Recipe): boolean {
  const haystack = [r.title, ...r.ingredients, ...r.missingIngredients, ...r.tags].join(" ").toLowerCase();
  return !NON_VEG_TOKENS.some(t => haystack.includes(t));
}

const FALLBACK = [
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=700",
  "https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=700",
  "https://images.unsplash.com/photo-1466637574441-749b8f19452f?w=700",
  "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=700",
  "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=700",
];

/* ─────────────────────────────────────────────────────────────────────────
   50 RECIPES
───────────────────────────────────────────────────────────────────────── */
const ALL_RECIPES: Recipe[] = [
  /* ── INDIAN (16) ───────────────────────────────────────────────────── */
  {
    id: 1, title: "Butter Chicken", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=700",
    readyInMinutes: 45, servings: 4, difficulty: "Medium",
    tags: ["butter chicken", "murgh makhani", "chicken curry", "indian curry"],
    description: "Tender charred chicken simmered in a velvety tomato-cream makhani sauce. The double-cooking method — first charring, then braising — gives it a smoky depth that's impossible to resist.",
    ingredients: ["chicken", "tomato", "garlic", "ginger", "butter", "heavy cream", "garam masala", "cumin", "yogurt"],
    missingIngredients: ["kashmiri chili", "cardamom", "kasuri methi"],
    steps: [
      { step: 1, title: "Marinate the chicken", instruction: "Cut 700g chicken thighs into large chunks. Mix with 200g yogurt, 1 tsp turmeric, 1 tsp garam masala, 1 tbsp minced garlic, 1 tbsp grated ginger, 1 tsp Kashmiri chili, and salt. Marinate at least 30 mins — overnight is best.", tip: "Yogurt tenderises the meat. The longer you marinate, the deeper the flavour." },
      { step: 2, title: "Char the chicken", instruction: "Heat a grill pan or heavy skillet over high heat. Brush with oil. Cook chicken 3–4 mins per side until nicely charred. Set aside. It doesn't need to cook through yet — it will finish in the sauce." },
      { step: 3, title: "Build the makhani base", instruction: "Melt 2 tbsp butter. Cook 1 diced onion 8 mins until golden. Add garlic and ginger paste, cook 2 mins. Add 3 chopped tomatoes, 1 tsp Kashmiri chili, 2 cardamom pods, 1 tsp cumin. Simmer 15 mins until tomatoes break down and oil separates.", tip: "Oil separating from the masala ('bhuno') is the sign your spices are fully cooked." },
      { step: 4, title: "Blend and sieve", instruction: "Remove cardamom. Cool slightly, blend completely smooth, then strain through a fine sieve back into the pan. This gives the signature silky texture." },
      { step: 5, title: "Finish the curry", instruction: "Add 150ml heavy cream and 2 tbsp butter. Add charred chicken. Simmer gently 10 mins. Stir in 1 tsp kasuri methi (dried fenugreek leaves).", tip: "Kasuri methi is the secret ingredient of restaurant Butter Chicken. Don't skip it." },
      { step: 6, title: "Serve", instruction: "Garnish with cream and cilantro. Serve with butter naan or basmati rice." },
    ],
    proTip: "Use Kashmiri chili powder for beautiful deep red colour without excessive heat.",
  },
  {
    id: 2, title: "Dal Tadka", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=700",
    readyInMinutes: 40, servings: 4, difficulty: "Easy",
    tags: ["dal", "dal tadka", "lentils", "indian dal", "yellow dal"],
    description: "Silky yellow lentils with a dramatic sizzling tadka of whole spices, garlic, and dried chili poured over the top at the last moment. India's most comforting everyday dish.",
    ingredients: ["lentils", "onion", "tomato", "garlic", "ginger", "cumin", "turmeric", "ghee"],
    missingIngredients: ["mustard seeds", "dried red chili"],
    steps: [
      { step: 1, title: "Boil the lentils", instruction: "Rinse 250g yellow split lentils until water runs clear. Cook in 750ml water with 1 tsp turmeric and salt for 20–25 mins until completely soft and mushy.", tip: "Lentils should dissolve when pressed — undercooked dal is gritty." },
      { step: 2, title: "Make the masala base", instruction: "Heat 2 tbsp ghee. Cook 1 diced onion 8 mins until deep golden. Add garlic and ginger, cook 2 mins. Add 2 chopped tomatoes, cumin powder, coriander powder, chili powder. Cook 8 mins until oil separates." },
      { step: 3, title: "Combine and simmer", instruction: "Pour lentils into masala. Stir well, adjust water for desired consistency. Simmer 5 mins together." },
      { step: 4, title: "Make the tadka", instruction: "Heat 1 tbsp ghee until very hot. Add 1 tsp cumin seeds — they should splutter immediately. Add 3 sliced garlic cloves and 1 dried red chili. Swirl 30 seconds until garlic is golden. Pour entire sizzling mixture over the dal.", tip: "The tadka must be done on high heat and poured immediately. That sizzle is all the flavour." },
      { step: 5, title: "Serve", instruction: "Garnish with cilantro and lemon juice. Serve hot with rice, roti, or naan." },
    ],
    proTip: "Dal tastes even better the next day. Reheat with a splash of water and make a fresh tadka.",
  },
  {
    id: 3, title: "Palak Paneer", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=700",
    readyInMinutes: 35, servings: 3, difficulty: "Medium",
    tags: ["palak paneer", "spinach paneer", "paneer curry", "saag paneer", "indian vegetarian"],
    description: "Cubes of golden-fried paneer in a vibrant, silky spinach sauce. Blanching and shocking the spinach in ice water is the trick to keeping that brilliant green colour.",
    ingredients: ["paneer", "spinach", "garlic", "onion", "ginger", "tomato", "cumin", "garam masala", "ghee"],
    missingIngredients: ["kasuri methi", "heavy cream"],
    steps: [
      { step: 1, title: "Blanch and purée the spinach", instruction: "Boil a large pot of salted water. Add 400g spinach for exactly 2 mins. Drain immediately and plunge into ice-cold water. Squeeze dry, then blend with ¼ cup water to a smooth, thick purée.", tip: "The ice bath is non-negotiable for that brilliant green colour." },
      { step: 2, title: "Fry the paneer", instruction: "Cut 250g paneer into 2cm cubes. Heat 1 tbsp oil or ghee and fry 2 mins per side until lightly golden. Set aside." },
      { step: 3, title: "Cook the masala", instruction: "Heat 2 tbsp ghee. Add 1 tsp cumin seeds — let sizzle. Cook 1 diced onion 8 mins. Add garlic paste, ginger paste — fry 2 mins. Add 1 diced tomato, coriander powder, turmeric, garam masala. Cook 5 mins." },
      { step: 4, title: "Combine and finish", instruction: "Add spinach purée, stir well, simmer 4 mins. Add fried paneer and 2 tbsp cream. Simmer 3 mins. Add a pinch of kasuri methi.", tip: "Stir gently once paneer is added — keep the cubes intact." },
    ],
    proTip: "Extra-firm tofu pressed dry makes an excellent vegan substitute for paneer.",
  },
  {
    id: 4, title: "Chicken Biryani", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=700",
    readyInMinutes: 75, servings: 5, difficulty: "Hard",
    tags: ["biryani", "chicken biryani", "dum biryani", "hyderabadi biryani", "rice dish"],
    description: "A showstopper layered rice dish — marinated chicken, par-cooked basmati, fried onions, and saffron sealed and steam-cooked ('dum') for an extraordinary aromatic result.",
    ingredients: ["chicken", "basmati rice", "onion", "garlic", "ginger", "yogurt", "garam masala", "turmeric", "ghee"],
    missingIngredients: ["saffron", "biryani masala", "whole spices"],
    steps: [
      { step: 1, title: "Marinate the chicken", instruction: "Mix 800g chicken with 250g yogurt, 2 tbsp biryani masala, 1 tsp turmeric, 1 tbsp garlic-ginger paste, 2 tsp chili powder, juice of 1 lemon. Marinate at least 2 hours.", tip: "Overnight marination gives the most tender, flavourful result." },
      { step: 2, title: "Par-boil the rice", instruction: "Rinse 400g basmati and soak 30 mins. Boil in salted water with whole spices (bay leaves, cloves, cardamom, cinnamon) until 70% cooked — still firm. Drain immediately.", tip: "70% cooked rice is critical. Fully cooked rice turns mushy during dum." },
      { step: 3, title: "Fry the onions (beresta)", instruction: "Thinly slice 3 large onions. Fry in generous oil over medium heat 20–25 mins, stirring often, until deep caramel brown and crispy. Drain on paper." },
      { step: 4, title: "Cook the chicken base", instruction: "In a heavy pot, heat 3 tbsp ghee. Cook marinated chicken over high heat 8–10 mins until partially cooked and the masala is thick and fragrant." },
      { step: 5, title: "Layer and dum cook", instruction: "Layer half the rice over the chicken. Add half the fried onions, mint, and cilantro. Add the second layer of rice. Top with remaining onions, herbs, and saffron dissolved in 3 tbsp warm milk. Dot with ghee. Seal pot tightly with foil and lid. Cook on lowest heat over a tawa for 25 mins.", tip: "The sealed dum is what makes biryani extraordinary. Don't open the pot during cooking." },
    ],
    proTip: "The aroma that escapes when you break open the dum seal is one of the most intoxicating smells in all of cooking.",
  },
  {
    id: 5, title: "Chole Bhature", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=700",
    readyInMinutes: 45, servings: 4, difficulty: "Easy",
    tags: ["chole", "chana masala", "chickpea curry", "punjabi chole"],
    description: "Bold, tangy, deeply spiced chickpeas in thick onion-tomato gravy. The signature dark colour comes from a black tea bag simmered with the chickpeas.",
    ingredients: ["chickpeas", "onion", "tomato", "garlic", "ginger", "cumin", "coriander powder", "garam masala"],
    missingIngredients: ["amchur powder", "chana masala", "black tea bag"],
    steps: [
      { step: 1, title: "Cook the chickpeas", instruction: "If using dried, soak 250g overnight then pressure cook with 1 black tea bag 20 mins until very soft. If using canned, drain and rinse 2 cans.", tip: "The black tea bag gives chole its characteristic dark colour." },
      { step: 2, title: "Make the masala", instruction: "Heat 3 tbsp oil. Cook 2 large finely chopped onions 15 mins until deep brown. Add garlic-ginger paste 2 mins. Add blended tomatoes, chana masala, cumin, coriander, chili powder. Cook 10 mins until oil separates." },
      { step: 3, title: "Simmer together", instruction: "Add chickpeas and 250ml water. Mash some chickpeas with a spoon to thicken the gravy. Simmer 15 mins. Add amchur powder for tanginess. Adjust salt.", tip: "Mashing a quarter of the chickpeas thickens the gravy naturally — don't skip this." },
      { step: 4, title: "Serve", instruction: "Garnish with ginger, green chili, and cilantro. Serve with bhature, puri, or rice." },
    ],
    proTip: "Mashing some chickpeas is what makes chole thick and restaurant-style.",
  },
  {
    id: 6, title: "Aloo Gobi", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1574484284002-952d92456975?w=700",
    readyInMinutes: 30, servings: 3, difficulty: "Easy",
    tags: ["aloo gobi", "potato cauliflower", "sabzi", "dry curry", "indian vegetarian"],
    description: "A dry, fragrant stir-fry of potato and cauliflower with cumin, turmeric, and coriander. One of the most beloved everyday Indian dishes — simple, quick, and deeply satisfying.",
    ingredients: ["potato", "cauliflower", "garlic", "ginger", "cumin", "turmeric", "coriander powder", "tomato"],
    missingIngredients: ["mustard seeds", "amchur powder"],
    steps: [
      { step: 1, title: "Prep the vegetables", instruction: "Cut 3 medium potatoes into 2cm cubes and break 1 cauliflower into medium florets. Pat the cauliflower completely dry." },
      { step: 2, title: "Temper and cook", instruction: "Heat 3 tbsp oil. Add 1 tsp cumin seeds — let splutter. Add ginger and garlic, sauté 30 seconds. Add potatoes, turmeric, coriander powder, and salt. Cover and cook on medium 8 mins." },
      { step: 3, title: "Add cauliflower and finish", instruction: "Add cauliflower florets and 1 chopped tomato. Cook uncovered on medium-high 10 mins, stirring every 2 mins, until both vegetables are tender with golden crispy edges.", tip: "Cooking uncovered at the end is crucial for the dry texture — covered cooking makes vegetables soggy." },
      { step: 4, title: "Serve", instruction: "Sprinkle garam masala, amchur, and fresh cilantro. Serve with roti or alongside dal and rice." },
    ],
    proTip: "Don't stir too often — let the vegetables sit in contact with the hot pan to caramelise.",
  },
  {
    id: 7, title: "Rajma (Red Kidney Bean Curry)", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=700",
    readyInMinutes: 50, servings: 4, difficulty: "Easy",
    tags: ["rajma", "kidney bean curry", "rajma chawal", "punjabi rajma", "bean curry"],
    description: "A hearty Punjabi classic of red kidney beans slow-cooked in a rich onion-tomato gravy spiced with garam masala. The ultimate comfort food paired with steamed rice.",
    ingredients: ["kidney beans", "onion", "tomato", "garlic", "ginger", "cumin", "garam masala", "coriander powder"],
    missingIngredients: ["amchur powder"],
    steps: [
      { step: 1, title: "Cook the rajma", instruction: "Soak 250g kidney beans overnight. Pressure cook for 25 mins until completely soft and tender. Reserve the cooking water." },
      { step: 2, title: "Make the masala", instruction: "Heat 3 tbsp oil. Cook 2 large finely diced onions 15 mins until deep brown. Add garlic-ginger paste 2 mins. Add 3 blended tomatoes, cumin, coriander, chili powder. Cook 10 mins." },
      { step: 3, title: "Combine and simmer", instruction: "Add cooked rajma with its water. Mash a few beans with the back of a spoon to thicken. Simmer 20 mins until the gravy is thick and clinging to the beans. Add garam masala, salt to taste." },
      { step: 4, title: "Serve", instruction: "Garnish with fresh cilantro and a squeeze of lemon. Serve over steamed rice (Rajma Chawal)." },
    ],
    proTip: "Using the reserved cooking water adds body and flavour to the gravy.",
  },
  {
    id: 8, title: "Chicken Tikka Masala", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=700",
    readyInMinutes: 50, servings: 4, difficulty: "Medium",
    tags: ["tikka masala", "chicken tikka", "chicken curry", "indian curry", "creamy curry"],
    description: "Smoky grilled chicken tikka pieces simmered in a creamy, lightly spiced tomato-based masala sauce. One of the most popular Indian dishes worldwide.",
    ingredients: ["chicken", "yogurt", "tomato", "onion", "garlic", "ginger", "heavy cream", "garam masala", "cumin"],
    missingIngredients: ["kashmiri chili", "kasuri methi"],
    steps: [
      { step: 1, title: "Make and grill chicken tikka", instruction: "Cut 700g chicken into cubes. Marinate in 200g yogurt, garlic-ginger paste, Kashmiri chili, cumin, garam masala, lemon juice, and salt for 2 hours. Grill or pan-char on high heat until charred and cooked through." },
      { step: 2, title: "Build the masala", instruction: "Heat 2 tbsp oil and 1 tbsp butter. Cook 2 diced onions 10 mins. Add garlic-ginger paste 2 mins. Add 3 blended tomatoes, Kashmiri chili, cumin, coriander. Cook 12 mins until oil separates." },
      { step: 3, title: "Add cream and chicken", instruction: "Pour in 150ml cream. Add chicken tikka pieces. Simmer together 8 mins. Finish with kasuri methi and 1 tbsp honey for subtle sweetness." },
    ],
    proTip: "Adding a touch of honey at the end balances the acidity of the tomatoes beautifully.",
  },
  {
    id: 9, title: "Paneer Butter Masala", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=700",
    readyInMinutes: 35, servings: 3, difficulty: "Easy",
    tags: ["paneer butter masala", "paneer makhani", "paneer curry", "vegetarian curry"],
    description: "The vegetarian cousin of Butter Chicken — paneer cubes in the exact same velvety makhani sauce. Rich, creamy, mildly spiced, and irresistibly delicious.",
    ingredients: ["paneer", "tomato", "onion", "garlic", "ginger", "butter", "heavy cream", "garam masala"],
    missingIngredients: ["kashmiri chili", "kasuri methi"],
    steps: [
      { step: 1, title: "Make the makhani base", instruction: "Heat 2 tbsp butter. Cook 1 diced onion until golden. Add garlic-ginger paste, cook 2 mins. Add 3 chopped tomatoes, Kashmiri chili, cardamom, cumin. Simmer 15 mins until oil separates. Blend smooth and strain through a sieve." },
      { step: 2, title: "Finish the sauce", instruction: "Return strained sauce to heat. Add 150ml cream and 2 tbsp butter. Simmer 5 mins until glossy and thick." },
      { step: 3, title: "Add paneer and serve", instruction: "Add 250g paneer cubes (can be lightly pan-fried first for texture). Simmer 5 mins. Finish with kasuri methi and salt to taste. Serve with naan or rice." },
    ],
    proTip: "For extra richness, add a spoonful of cashew paste to the makhani base before straining.",
  },
  {
    id: 10, title: "Sambar", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=700",
    readyInMinutes: 40, servings: 4, difficulty: "Easy",
    tags: ["sambar", "south indian sambar", "dal sambar", "lentil soup"],
    description: "A tangy, spiced South Indian lentil and vegetable stew that's the backbone of idli and dosa. Complex flavour from sambar powder, tamarind, and a mustard seed tadka.",
    ingredients: ["lentils", "tomato", "onion", "garlic", "mustard seeds", "cumin", "turmeric", "tamarind"],
    missingIngredients: ["sambar powder", "curry leaves", "asafoetida"],
    steps: [
      { step: 1, title: "Cook the lentils", instruction: "Pressure cook 150g toor dal with turmeric and water until mushy. Mash well." },
      { step: 2, title: "Make the sambar", instruction: "In a large pot, add diced onions, tomatoes, mixed vegetables (drumstick, carrot, eggplant). Add 400ml water, 2 tbsp sambar powder, tamarind extract, and salt. Boil 10 mins until vegetables are cooked." },
      { step: 3, title: "Combine and simmer", instruction: "Add cooked dal to the vegetables. Simmer 8 mins together. Adjust tanginess with more tamarind if needed." },
      { step: 4, title: "Make the tadka", instruction: "Heat ghee until hot. Add mustard seeds — let them splutter. Add dried red chili, curry leaves, and a pinch of asafoetida. Pour over sambar immediately." },
    ],
    proTip: "The quality of your sambar powder determines everything. Make your own or buy a good South Indian brand.",
  },
  {
    id: 11, title: "Pav Bhaji", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=700",
    readyInMinutes: 40, servings: 4, difficulty: "Easy",
    tags: ["pav bhaji", "mumbai street food", "bhaji", "vegetable mash"],
    description: "Mumbai's most iconic street food — a spiced mash of mixed vegetables cooked with pav bhaji masala and finished with generous butter, served with soft buttered bread rolls.",
    ingredients: ["potato", "tomato", "onion", "bell pepper", "peas", "carrot", "garlic", "butter"],
    missingIngredients: ["pav bhaji masala", "bread rolls"],
    steps: [
      { step: 1, title: "Boil and prep vegetables", instruction: "Boil 3 potatoes, 1 carrot, and ½ cup peas until tender. Mash roughly." },
      { step: 2, title: "Cook the bhaji", instruction: "Heat 2 tbsp butter in a large flat pan. Sauté 1 diced onion until golden. Add 2 diced tomatoes, diced bell pepper, garlic paste. Cook 8 mins. Add pav bhaji masala, chili powder, turmeric. Cook 3 mins." },
      { step: 3, title: "Mash together", instruction: "Add the boiled vegetables. Mix and mash everything together on medium heat for 10 mins. Add water as needed for consistency. Add 2 tbsp more butter. Mash to a thick, chunky consistency." },
      { step: 4, title: "Toast the pav", instruction: "Butter bread rolls generously and toast cut-side down on a hot griddle until golden. Serve bhaji garnished with diced onion, lemon, and cilantro alongside the toasted pav." },
    ],
    proTip: "Don't be shy with the butter — pav bhaji is meant to be indulgent. The butter is the soul of the dish.",
  },
  {
    id: 12, title: "Chicken Korma", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=700",
    readyInMinutes: 55, servings: 4, difficulty: "Medium",
    tags: ["korma", "chicken korma", "mild curry", "mughal curry"],
    description: "A Mughal-era mild, rich curry — chicken braised in a luxurious sauce of fried onions, cashew paste, yogurt, and warming whole spices. Deeply fragrant and mildly spiced.",
    ingredients: ["chicken", "onion", "yogurt", "cashews", "garlic", "ginger", "garam masala", "cardamom"],
    missingIngredients: ["kewra water", "rose water", "saffron"],
    steps: [
      { step: 1, title: "Make fried onion paste", instruction: "Fry 3 large onions until deep golden brown. Cool, then blend with 50g cashews and a little water to a smooth paste. This is the soul of korma." },
      { step: 2, title: "Cook the chicken", instruction: "Heat 3 tbsp ghee. Add whole spices (cardamom, cinnamon, bay leaves, cloves). Add 800g chicken and brown on all sides. Remove and set aside." },
      { step: 3, title: "Build the korma sauce", instruction: "In the same pan, add garlic-ginger paste — cook 2 mins. Add the onion-cashew paste, stir 5 mins. Add 200g yogurt (add gradually to prevent curdling). Return the chicken." },
      { step: 4, title: "Simmer and finish", instruction: "Add ½ cup warm water, garam masala, and salt. Simmer covered on low heat 25 mins until chicken is very tender. Finish with kewra water and saffron milk.", tip: "Low and slow cooking is the secret — korma should never be rushed." },
    ],
    proTip: "Adding yogurt gradually and stirring constantly prevents it from splitting in the hot pan.",
  },
  {
    id: 13, title: "Masala Dosa (Potato Filling)", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1574484284002-952d92456975?w=700",
    readyInMinutes: 30, servings: 4, difficulty: "Medium",
    tags: ["masala dosa", "dosa", "potato masala", "south indian", "dosa filling"],
    description: "The iconic South Indian crispy crepe filled with a fragrant spiced potato masala. This recipe covers the filling — the most critical part of a perfect masala dosa.",
    ingredients: ["potato", "onion", "mustard seeds", "turmeric", "garlic", "ginger", "green beans"],
    missingIngredients: ["curry leaves", "urad dal", "chana dal"],
    steps: [
      { step: 1, title: "Boil and prep potatoes", instruction: "Boil 4 medium potatoes until tender. Peel and roughly mash — you want texture, not a smooth mash. Keep chunky." },
      { step: 2, title: "Make the masala", instruction: "Heat 2 tbsp oil. Add 1 tsp mustard seeds — wait for them to pop. Add 1 tsp urad dal, 1 tsp chana dal — fry golden. Add curry leaves. Add 2 sliced onions and cook 8 mins." },
      { step: 3, title: "Combine and season", instruction: "Add turmeric, green chilies, grated ginger. Cook 2 mins. Add the mashed potatoes. Mix well, adjust salt. Squeeze lemon juice over and mix in cilantro." },
    ],
    proTip: "The masala should have texture — don't over-mash. Those chunky bits of potato are part of the pleasure.",
  },
  {
    id: 14, title: "Matar Paneer", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=700",
    readyInMinutes: 30, servings: 3, difficulty: "Easy",
    tags: ["matar paneer", "peas paneer", "paneer curry", "north indian"],
    description: "Soft paneer cubes and sweet peas in a tomato-based onion gravy spiced with cumin and garam masala. A simple, wholesome North Indian favourite.",
    ingredients: ["paneer", "peas", "tomato", "onion", "garlic", "ginger", "cumin", "garam masala"],
    missingIngredients: ["kasuri methi"],
    steps: [
      { step: 1, title: "Fry the paneer", instruction: "Cut 200g paneer into 2cm cubes. Fry in 1 tbsp oil until golden on all sides. Set aside." },
      { step: 2, title: "Cook the masala base", instruction: "Heat 2 tbsp oil. Add 1 tsp cumin seeds. Cook 1 diced onion until golden. Add garlic-ginger paste, cook 2 mins. Add 2 blended tomatoes, coriander powder, chili powder, turmeric. Cook 8 mins until oil separates." },
      { step: 3, title: "Add peas and paneer", instruction: "Add 1 cup fresh or frozen peas. Cook 3 mins. Add fried paneer, salt, garam masala. Simmer 5 mins. Finish with kasuri methi." },
    ],
    proTip: "Add a spoonful of butter at the end — it rounds out the sharp tomato notes perfectly.",
  },
  {
    id: 15, title: "Chicken Saag", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=700",
    readyInMinutes: 45, servings: 4, difficulty: "Medium",
    tags: ["chicken saag", "saag chicken", "spinach chicken", "green curry"],
    description: "Tender chicken pieces slow-cooked in a robust, textured spinach and mustard leaves gravy. Earthier and more rustic than palak paneer — this is Punjab's true saag.",
    ingredients: ["chicken", "spinach", "onion", "garlic", "ginger", "tomato", "cumin", "garam masala"],
    missingIngredients: ["mustard leaves", "makki atta (cornmeal)"],
    steps: [
      { step: 1, title: "Blanch and blend the greens", instruction: "Blanch 300g spinach and 200g mustard leaves. Do NOT use the ice bath this time — saag should be darker and more rustic than palak. Blend to a coarse purée, not smooth." },
      { step: 2, title: "Cook the chicken", instruction: "Heat ghee. Sear 600g chicken pieces until golden. Remove and set aside. In the same pan, cook onions until deep golden. Add garlic-ginger paste, tomatoes, and spices. Cook until masala is thick." },
      { step: 3, title: "Combine and simmer", instruction: "Add the saag purée and chicken. Simmer together on low heat 20 mins until chicken is cooked through and absorbs the flavour. Finish with 2 tbsp butter and 1 tbsp cornmeal for authentic texture." },
    ],
    proTip: "Saag should be textured, not silky smooth — a coarser blending is the authentic way.",
  },
  {
    id: 16, title: "Jeera Rice (Cumin Rice)", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=700",
    readyInMinutes: 20, servings: 4, difficulty: "Easy",
    tags: ["jeera rice", "cumin rice", "basmati rice", "side dish", "indian rice"],
    description: "Perfectly fluffy basmati rice tempered with whole cumin seeds and ghee. The ideal simple side dish that elevates any Indian curry.",
    ingredients: ["basmati rice", "cumin", "ghee", "garlic", "onion"],
    missingIngredients: ["whole cumin seeds"],
    steps: [
      { step: 1, title: "Rinse and soak the rice", instruction: "Rinse 300g basmati rice until water runs clear. Soak in cold water for 20 mins, then drain completely." },
      { step: 2, title: "Temper the cumin", instruction: "Heat 2 tbsp ghee in a heavy-bottomed pot. Add 1 tsp whole cumin seeds — let them sizzle and darken slightly for 30 seconds. Add 1 sliced onion and cook until golden if desired." },
      { step: 3, title: "Cook the rice", instruction: "Add drained rice and stir to coat in the ghee for 1 min. Add 600ml water and 1 tsp salt. Bring to a boil, then reduce to the lowest heat, cover tightly, and cook 12 mins. Remove from heat and rest covered 5 mins. Fluff with a fork.", tip: "Never stir rice during cooking — lifting the lid releases steam and makes it sticky." },
    ],
    proTip: "Soaking basmati before cooking is what gives you those long, separate, non-sticky grains.",
  },

  /* ── CHINESE (8) ──────────────────────────────────────────────────── */
  {
    id: 17, title: "Kung Pao Chicken", cuisine: "Chinese",
    image: "https://images.unsplash.com/photo-1525755662778-989d0524087e?w=700",
    readyInMinutes: 25, servings: 3, difficulty: "Medium",
    tags: ["kung pao", "kung pao chicken", "sichuan chicken", "spicy chicken", "chinese stir fry"],
    description: "A classic Sichuan stir-fry — tender chicken, crunchy peanuts, and dried chilies in a glossy sweet-savoury-spicy sauce. The signature numbing sensation comes from Sichuan peppercorns.",
    ingredients: ["chicken", "peanuts", "garlic", "ginger", "soy sauce", "bell pepper", "cornstarch", "sesame oil"],
    missingIngredients: ["sichuan peppercorn", "dried red chili", "rice vinegar"],
    steps: [
      { step: 1, title: "Marinate the chicken", instruction: "Cut 400g chicken into 1.5cm cubes. Mix with 1 tbsp soy sauce, 1 tsp cornstarch, 1 tsp sesame oil, white pepper. Marinate 15 mins.", tip: "Cornstarch creates a light coating that keeps the chicken juicy and gives the sauce something to cling to." },
      { step: 2, title: "Mix the sauce", instruction: "Whisk together: 2 tbsp soy sauce, 1 tbsp rice vinegar, 1 tbsp sugar, 1 tsp sesame oil, 1 tsp cornstarch, 2 tbsp water. Have this ready before you start cooking." },
      { step: 3, title: "Stir-fry everything", instruction: "Heat wok over highest heat until smoking. Add oil. Add dried chilies and Sichuan peppercorns — stir 20 secs. Add garlic and ginger — toss 20 secs. Add chicken — sear 1 min without touching, then toss 2–3 mins. Add bell pepper 1 min. Pour sauce — toss until glossy, 30–45 secs. Add peanuts.", tip: "The wok must be smoking hot before anything goes in. This creates the signature 'wok hei' smoky flavour." },
    ],
    proTip: "Sichuan peppercorns give a unique numbing tingle that makes Kung Pao taste authentic — find them at any Asian grocery.",
  },
  {
    id: 18, title: "Egg Fried Rice", cuisine: "Chinese",
    image: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=700",
    readyInMinutes: 15, servings: 3, difficulty: "Easy",
    tags: ["fried rice", "egg fried rice", "chinese fried rice", "wok rice"],
    description: "Day-old rice stir-fried with eggs, vegetables, and soy sauce in a screaming hot wok. The secret is day-old cold rice — it's what separates perfect fried rice from mushy rice.",
    ingredients: ["rice", "eggs", "soy sauce", "garlic", "sesame oil", "green onion", "peas", "carrot"],
    missingIngredients: ["oyster sauce"],
    steps: [
      { step: 1, title: "Use cold day-old rice", instruction: "Refrigerate cooked rice overnight. Cold, dry rice is essential — fresh rice steams instead of frying, turning mushy. Break up all clumps.", tip: "This is the number one rule of fried rice. Cold, dry, day-old rice only." },
      { step: 2, title: "Scramble eggs in the wok", instruction: "Heat wok over highest heat 2 mins. Add 1 tbsp oil. Pour in 3 beaten eggs and scramble into small curds — just set, still slightly wet. Push to the side." },
      { step: 3, title: "Fry aromatics then rice", instruction: "Add more oil. Stir-fry garlic, diced carrot 2 mins, peas. Add all cold rice — spread flat, leave 30 secs untouched to develop a light crust. Toss and stir-fry 3 mins until each grain is separate and hot." },
      { step: 4, title: "Season and serve", instruction: "Pour soy sauce and oyster sauce around the EDGES of the wok, not on the rice, so they caramelise on the hot metal. Toss everything including eggs. Add sesame oil. Garnish with green onion.", tip: "Adding sauce around the wok edges (not directly on the rice) creates a deeper, smokier flavour." },
    ],
    proTip: "Pour your sauces around the wok edges — the caramelisation on hot metal is where the flavour lives.",
  },
  {
    id: 19, title: "Mapo Tofu", cuisine: "Chinese",
    image: "https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=700",
    readyInMinutes: 25, servings: 3, difficulty: "Medium",
    tags: ["mapo tofu", "tofu", "sichuan tofu", "chinese tofu", "spicy tofu"],
    description: "Silky soft tofu in a fiery, deeply savoury Sichuan sauce of fermented bean paste, ground pork, and Sichuan peppercorns. The numbing-spicy combination is extraordinary.",
    ingredients: ["tofu", "ground beef", "garlic", "ginger", "soy sauce", "cornstarch", "vegetable broth"],
    missingIngredients: ["doubanjiang", "sichuan peppercorn", "fermented black beans"],
    steps: [
      { step: 1, title: "Blanch the tofu", instruction: "Cut 400g silken tofu into 2cm cubes. Gently simmer in salted water for 2 mins. This firms them slightly so they hold shape. Drain very carefully.", tip: "Pre-blanching removes the raw soy taste and prevents crumbling in the sauce." },
      { step: 2, title: "Build the sauce base", instruction: "Heat 2 tbsp oil. Add 2 tbsp doubanjiang (spicy fermented bean paste) — fry 1 min until oil turns red. Add minced garlic and ginger — stir 30 secs. Add 150g ground pork, cook until done." },
      { step: 3, title: "Finish and serve", instruction: "Add 300ml chicken broth. Slide in tofu carefully. Simmer 3 mins. Mix 1 tbsp cornstarch with 2 tbsp water and add slowly to thicken. Add ground Sichuan peppercorn and green onion. Serve over rice." },
    ],
    proTip: "Doubanjiang is the soul of Mapo Tofu — nothing else replicates its fermented, spicy depth.",
  },
  {
    id: 20, title: "Sweet and Sour Pork", cuisine: "Chinese",
    image: "https://images.unsplash.com/photo-1525755662778-989d0524087e?w=700",
    readyInMinutes: 35, servings: 3, difficulty: "Medium",
    tags: ["sweet and sour pork", "sweet sour", "chinese pork", "crispy pork"],
    description: "Crispy battered pork pieces tossed in a vibrant sweet and sour sauce with pineapple, bell peppers, and onion. A classic Cantonese dish.",
    ingredients: ["pork", "bell pepper", "onion", "garlic", "cornstarch", "eggs", "vegetable oil"],
    missingIngredients: ["pineapple chunks", "rice vinegar", "ketchup"],
    steps: [
      { step: 1, title: "Batter and fry the pork", instruction: "Cut 400g pork tenderloin into chunks. Coat in a batter of 1 egg, 3 tbsp cornstarch, salt. Deep fry in hot oil (180°C) until golden and crispy, about 4 mins. Drain on paper." },
      { step: 2, title: "Make the sweet and sour sauce", instruction: "Mix 4 tbsp ketchup, 3 tbsp rice vinegar, 2 tbsp sugar, 1 tbsp soy sauce, and 4 tbsp pineapple juice." },
      { step: 3, title: "Stir-fry and toss", instruction: "Heat 1 tbsp oil. Stir-fry diced bell peppers and onion 2 mins. Add pineapple chunks 1 min. Pour sauce over, let bubble. Add cornstarch slurry to thicken. Toss in the fried pork just before serving." },
    ],
    proTip: "Toss the pork in the sauce at the very last moment — it keeps the batter crispy.",
  },
  {
    id: 21, title: "Char Siu (BBQ Pork)", cuisine: "Chinese",
    image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=700",
    readyInMinutes: 60, servings: 4, difficulty: "Medium",
    tags: ["char siu", "bbq pork", "chinese bbq", "cantonese pork", "hong kong pork"],
    description: "Cantonese BBQ pork with a shiny lacquered glaze — sticky, caramelised, and irresistibly smoky-sweet. Iconic in Hong Kong bakeries and noodle shops.",
    ingredients: ["pork", "honey", "soy sauce", "garlic", "ginger", "sesame oil"],
    missingIngredients: ["hoisin sauce", "five spice powder", "rose water"],
    steps: [
      { step: 1, title: "Marinate the pork", instruction: "Cut 600g pork shoulder or tenderloin into long strips. Mix marinade: 3 tbsp hoisin sauce, 2 tbsp honey, 2 tbsp soy sauce, 1 tbsp sesame oil, 1 tsp five spice powder, 2 minced garlic cloves. Marinate at least 4 hours, overnight preferred." },
      { step: 2, title: "Roast and glaze", instruction: "Preheat oven to 200°C. Place pork strips on a rack over a foil-lined tray. Roast 20 mins. Brush generously with reserved marinade. Roast another 10 mins. Brush again. Broil 3–4 mins for charred edges." },
      { step: 3, title: "Rest and serve", instruction: "Rest for 5 mins before slicing. Serve over steamed rice or with noodles. Drizzle with honey for extra glaze." },
    ],
    proTip: "The final broil is what gives char siu its characteristic slightly charred, lacquered edges.",
  },
  {
    id: 22, title: "Spring Rolls", cuisine: "Chinese",
    image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=700",
    readyInMinutes: 45, servings: 4, difficulty: "Medium",
    tags: ["spring rolls", "chinese spring rolls", "fried spring rolls", "dim sum"],
    description: "Crispy deep-fried rolls stuffed with seasoned cabbage, carrots, mushrooms, and pork. Golden, crunchy, and perfect with sweet chili sauce.",
    ingredients: ["pork", "cabbage", "carrot", "mushroom", "garlic", "ginger", "soy sauce", "sesame oil"],
    missingIngredients: ["spring roll wrappers", "oyster sauce"],
    steps: [
      { step: 1, title: "Make the filling", instruction: "Stir-fry 200g minced pork with garlic and ginger. Add shredded cabbage, julienned carrot, and sliced mushrooms. Toss with soy sauce, oyster sauce, and sesame oil. Cook until wilted. Cool completely.", tip: "The filling must be completely cool before wrapping — hot filling makes wrappers soggy." },
      { step: 2, title: "Wrap the spring rolls", instruction: "Place a spring roll wrapper in a diamond shape. Add 2 tbsp filling near the bottom. Fold up the bottom corner over the filling, fold in sides, roll up tightly. Seal edge with a little water or egg wash." },
      { step: 3, title: "Fry until golden", instruction: "Heat oil to 175°C. Deep fry spring rolls in batches for 3–4 mins, turning, until deeply golden all over. Drain on paper towels. Serve immediately with sweet chili sauce." },
    ],
    proTip: "Frying at 175°C (not lower) ensures the rolls are crispy, not oil-soaked.",
  },
  {
    id: 23, title: "Dan Dan Noodles", cuisine: "Chinese",
    image: "https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=700",
    readyInMinutes: 25, servings: 2, difficulty: "Medium",
    tags: ["dan dan noodles", "sichuan noodles", "spicy noodles", "chinese noodles"],
    description: "Sichuan street noodles in a sesame-chili sauce topped with spiced minced pork, pickled vegetables, and green onion. Fiery, nutty, and deeply savoury.",
    ingredients: ["pasta", "ground beef", "garlic", "ginger", "soy sauce", "sesame oil", "chili flakes"],
    missingIngredients: ["ya cai (pickled mustard greens)", "sichuan peppercorn", "tahini"],
    steps: [
      { step: 1, title: "Make the sauce", instruction: "In a bowl, mix: 2 tbsp tahini (or sesame paste), 2 tbsp soy sauce, 1 tbsp chili oil, 1 tsp sugar, 1 tsp sesame oil, 2 tbsp hot pasta water. Stir until smooth." },
      { step: 2, title: "Cook the pork topping", instruction: "Heat oil. Add 200g minced pork — cook until crispy. Add garlic, ginger, soy sauce, and a little hoisin. Cook until fragrant and slightly caramelised." },
      { step: 3, title: "Assemble the bowl", instruction: "Cook 200g noodles. Divide among bowls. Pour sauce over noodles. Top with spiced pork, ya cai, and green onion. Add a generous drizzle of chili oil and ground Sichuan peppercorn." },
    ],
    proTip: "The sauce should taste bold, almost intense on its own — the noodles dilute it perfectly.",
  },
  {
    id: 24, title: "Beef and Broccoli", cuisine: "Chinese",
    image: "https://images.unsplash.com/photo-1525755662778-989d0524087e?w=700",
    readyInMinutes: 20, servings: 3, difficulty: "Easy",
    tags: ["beef and broccoli", "chinese beef", "broccoli stir fry", "takeout beef"],
    description: "Tender sliced beef and crisp broccoli florets in a glossy oyster-soy sauce. A classic Chinese-American stir-fry done in under 20 minutes.",
    ingredients: ["beef steak", "broccoli", "garlic", "ginger", "soy sauce", "cornstarch", "sesame oil"],
    missingIngredients: ["oyster sauce", "shaoxing wine"],
    steps: [
      { step: 1, title: "Velvet the beef", instruction: "Slice 400g flank steak or sirloin thinly against the grain. Toss with 1 tsp baking soda, 1 tbsp soy sauce, 1 tsp cornstarch. Rest 15 mins. Rinse off baking soda.", tip: "Baking soda velveting is the Chinese restaurant secret for impossibly tender beef." },
      { step: 2, title: "Make the sauce", instruction: "Mix: 3 tbsp oyster sauce, 2 tbsp soy sauce, 1 tbsp Shaoxing wine, 1 tsp sugar, 1 tsp sesame oil, 1 tsp cornstarch, 4 tbsp water." },
      { step: 3, title: "Stir-fry and serve", instruction: "Blanch broccoli florets 1 min in boiling water. Stir-fry beef in a very hot wok 2 mins. Add garlic and ginger 30 secs. Add broccoli. Pour sauce over, toss until glossy and thickened. Serve immediately over rice." },
    ],
    proTip: "Baking soda velveting is the restaurant secret for silky, tender beef stir-fry — don't skip it.",
  },

  /* ── ITALIAN (6) ──────────────────────────────────────────────────── */
  {
    id: 25, title: "Spaghetti Carbonara", cuisine: "Italian",
    image: "https://images.unsplash.com/photo-1612874742237-6526221588e3?w=700",
    readyInMinutes: 25, servings: 3, difficulty: "Medium",
    tags: ["carbonara", "spaghetti carbonara", "pasta carbonara", "roman pasta", "creamy pasta"],
    description: "Rome's most iconic pasta — silky spaghetti in a rich sauce of eggs, pecorino, and guanciale. No cream. No garlic. The silkiness comes entirely from the egg-fat emulsion and starchy pasta water.",
    ingredients: ["pasta", "eggs", "bacon", "parmesan", "black pepper", "garlic"],
    missingIngredients: ["pecorino romano", "guanciale"],
    steps: [
      { step: 1, title: "Prepare the egg sauce", instruction: "Whisk 3 whole eggs and 2 yolks with 80g finely grated pecorino, generous cracked black pepper, and a tiny pinch of salt. Set aside at room temperature.", tip: "Room temperature eggs blend more smoothly and reduce the risk of scrambling." },
      { step: 2, title: "Cook the guanciale", instruction: "Dice 150g guanciale or thick bacon into 1cm cubes. Cook in a COLD dry pan over medium heat 8–10 mins until fat has rendered and pieces are golden and crispy. Reserve all rendered fat." },
      { step: 3, title: "Cook pasta, reserve water", instruction: "Cook 300g spaghetti in heavily salted boiling water until al dente. Before draining, scoop out 2 full cups of starchy pasta water." },
      { step: 4, title: "Create the silky sauce", instruction: "Drain pasta. Add to the pan with guanciale over medium-low heat. Toss 30 secs. Remove pan from heat ENTIRELY. Wait 30 secs. Pour egg mixture all at once. Toss rapidly, adding pasta water a spoonful at a time until silky and glossy.", tip: "Off the heat — no exceptions. Direct heat scrambles the eggs instantly." },
    ],
    proTip: "Never add cream. Authentic carbonara silkiness comes entirely from the egg-fat emulsion and pasta water.",
  },
  {
    id: 26, title: "Aglio e Olio (Garlic Pasta)", cuisine: "Italian",
    image: "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=700",
    readyInMinutes: 20, servings: 3, difficulty: "Easy",
    tags: ["aglio e olio", "garlic pasta", "olive oil pasta", "simple pasta", "italian pasta"],
    description: "Pasta, garlic, olive oil, chili flakes, and parmesan — one of the simplest and most perfect Italian dishes. Excellence is entirely in technique: toasting garlic slowly and emulsifying oil with pasta water.",
    ingredients: ["pasta", "garlic", "olive oil", "parmesan", "chili flakes", "parsley"],
    missingIngredients: [],
    steps: [
      { step: 1, title: "Cook pasta in well-salted water", instruction: "Add 2 tbsp salt to boiling water. Cook 350g spaghetti until al dente. Reserve 1.5 cups pasta water before draining.", tip: "Pasta water must taste like a light broth. This is the only seasoning the pasta itself receives." },
      { step: 2, title: "Toast garlic slowly", instruction: "Thinly slice 6–8 garlic cloves. Heat 6 tbsp good olive oil in a wide pan over THE LOWEST heat. Toast garlic 8–10 mins, stirring often. You want pale golden and nutty — never brown.", tip: "Patience is everything here. Burnt garlic ruins the entire dish and cannot be rescued." },
      { step: 3, title: "Build the emulsion and serve", instruction: "Add 1 tsp chili flakes, stir 30 secs. Add ½ cup pasta water — stir vigorously to emulsify. Add drained pasta. Toss 2 mins over low heat adding pasta water as needed until each strand is glossy. Add chopped parsley, grated parmesan." },
    ],
    proTip: "Use the best quality olive oil you own — with so few ingredients, quality is unmistakably tasted.",
  },
  {
    id: 27, title: "Cacio e Pepe", cuisine: "Italian",
    image: "https://images.unsplash.com/photo-1612874742237-6526221588e3?w=700",
    readyInMinutes: 20, servings: 2, difficulty: "Medium",
    tags: ["cacio e pepe", "cheese pasta", "roman pasta", "pepper pasta", "three ingredient pasta"],
    description: "Three ingredients — pasta, pecorino, black pepper — and pure technique. Rome's most deceptively simple pasta, and arguably its most difficult to master. Creamy without any cream.",
    ingredients: ["pasta", "parmesan", "black pepper"],
    missingIngredients: ["pecorino romano", "tonnarelli pasta"],
    steps: [
      { step: 1, title: "Toast the pepper", instruction: "Crack 2 tsp black peppercorns coarsely. Toast in a dry pan over medium heat 1 min until fragrant. Add a ladle of pasta cooking water — let sizzle into a pepper broth." },
      { step: 2, title: "Cook pasta and create the sauce", instruction: "Cook 200g tonnarelli or spaghetti. Mix 80g finely grated pecorino with just enough cold water to make a smooth paste. Add pasta to the pepper pan. Add pasta water ½ ladle at a time. Remove from heat. Add cheese paste while tossing vigorously — the heat and starch create the creamy sauce.", tip: "The cheese must go in off the heat. Any direct heat will clump the cheese into a solid mass." },
    ],
    proTip: "Grate the pecorino on the finest setting — powdery cheese melts into a sauce, coarsely grated cheese clumps.",
  },
  {
    id: 28, title: "Chicken Piccata", cuisine: "Italian",
    image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=700",
    readyInMinutes: 25, servings: 3, difficulty: "Easy",
    tags: ["chicken piccata", "lemon chicken", "italian chicken", "piccata"],
    description: "Thin chicken cutlets pan-fried and sauced in a bright, buttery lemon-caper pan sauce. Fast, elegant, and endlessly satisfying. A classic Italian-American dish.",
    ingredients: ["chicken breast", "lemon", "butter", "garlic", "flour", "parsley", "olive oil"],
    missingIngredients: ["capers", "white wine"],
    steps: [
      { step: 1, title: "Pound and flour the chicken", instruction: "Slice 3 chicken breasts in half horizontally to create 6 thin cutlets. Pound to even 1cm thickness. Season with salt and pepper. Dredge lightly in flour, shaking off excess." },
      { step: 2, title: "Pan-fry the chicken", instruction: "Heat 2 tbsp olive oil and 1 tbsp butter in a large skillet over medium-high heat. Add chicken cutlets in a single layer and cook 3 mins per side until golden. Remove and set aside." },
      { step: 3, title: "Make the piccata sauce", instruction: "In the same pan, add ½ cup white wine and bring to a boil, scraping up any browned bits. Add ½ cup chicken broth, 3 tbsp lemon juice, 2 tbsp capers. Simmer 3 mins. Swirl in 2 tbsp cold butter to emulsify. Return chicken, spoon sauce over. Garnish with parsley." },
    ],
    proTip: "Swirling cold butter into the sauce at the end (mounting) creates a glossy, velvety texture without cream.",
  },
  {
    id: 29, title: "Lasagne Bolognese", cuisine: "Italian",
    image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=700",
    readyInMinutes: 120, servings: 6, difficulty: "Hard",
    tags: ["lasagne", "lasagna", "bolognese lasagna", "italian bake", "pasta bake"],
    description: "The definitive comfort dish — layers of rich slow-cooked ragù bolognese, creamy béchamel, and pasta, baked until bubbling and golden. Proper bolognese takes time, but the result is extraordinary.",
    ingredients: ["ground beef", "lasagna sheets", "tomato paste", "onion", "carrot", "celery", "garlic", "butter", "flour", "milk"],
    missingIngredients: ["pork mince", "red wine", "parmesan"],
    steps: [
      { step: 1, title: "Make the ragù", instruction: "Sauté finely diced onion, carrot, and celery (soffritto) in olive oil 10 mins. Add mixed ground beef and pork, cook until well browned. Add 1 glass red wine, reduce by half. Add tomato paste, 200ml milk, salt. Simmer on lowest heat for 1.5 hours.", tip: "The milk is the Bolognese secret — it tenderises the meat and gives the sauce its silky richness." },
      { step: 2, title: "Make the béchamel", instruction: "Melt 60g butter. Add 60g flour, stir 2 mins to form a roux. Add 800ml warm milk gradually, whisking constantly. Simmer 8 mins until thick and smooth. Season with salt and nutmeg." },
      { step: 3, title: "Layer and bake", instruction: "Layer: béchamel → pasta sheets → ragù → béchamel → pasta → ragù. Repeat. Top layer should be béchamel with grated parmesan. Bake at 180°C for 35–40 mins until bubbling and golden. Rest 15 mins before cutting.", tip: "Always rest lasagne before cutting — this allows it to set and gives you clean, distinct layers." },
    ],
    proTip: "The milk in the ragù is Bologna's famous secret. It gives the meat that silky, mellow richness.",
  },
  {
    id: 30, title: "Risotto ai Funghi (Mushroom Risotto)", cuisine: "Italian",
    image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=700",
    readyInMinutes: 40, servings: 3, difficulty: "Medium",
    tags: ["risotto", "mushroom risotto", "italian risotto", "rice dish"],
    description: "Creamy, deeply savoury mushroom risotto — made the authentic Italian way by gradually adding warm stock and stirring patiently to release the starch. Rich, earthy, and elegant.",
    ingredients: ["rice", "mushroom", "onion", "garlic", "butter", "parmesan", "olive oil", "vegetable broth"],
    missingIngredients: ["arborio rice", "white wine", "dried porcini"],
    steps: [
      { step: 1, title: "Sauté mushrooms", instruction: "Sauté 400g sliced mushrooms (mixed fresh and rehydrated dried porcini) in butter over high heat until golden and their moisture has evaporated. Season. Set aside." },
      { step: 2, title: "Start the risotto base", instruction: "In a wide pan, gently sauté 1 diced shallot in 2 tbsp butter until soft. Add 300g arborio rice and toast 2 mins until slightly translucent at the edges. Add ½ glass white wine and stir until absorbed." },
      { step: 3, title: "Add stock gradually", instruction: "Add warm stock one ladle at a time, stirring constantly and waiting until each addition is absorbed before adding the next. This takes 18–20 mins. The rice should be tender with a slight firmness (al dente).", tip: "Constant stirring releases starch from the rice — this is what creates the creamy texture, not cream." },
      { step: 4, title: "Finish (mantecatura)", instruction: "Remove from heat. Add the mushrooms back in. Stir in 2 tbsp cold butter and a generous handful of grated parmesan vigorously. The risotto should flow like lava ('all'onda'). Season and serve immediately." },
    ],
    proTip: "The final 'mantecatura' — vigorously stirring in cold butter off the heat — is what gives risotto its glossy, creamy finish.",
  },

  /* ── AMERICAN (7) ─────────────────────────────────────────────────── */
  {
    id: 31, title: "Smash Burger", cuisine: "American",
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=700",
    readyInMinutes: 20, servings: 2, difficulty: "Easy",
    tags: ["smash burger", "burger", "american burger", "cheeseburger", "beef burger"],
    description: "Loose beef balls smashed against a searing hot cast iron — creating lacey, crispy edges and a juicy centre. Maximum Maillard reaction, maximum flavour.",
    ingredients: ["ground beef", "cheddar cheese", "butter", "onion", "mayonnaise"],
    missingIngredients: ["american cheese slices", "burger buns", "pickles"],
    steps: [
      { step: 1, title: "Form loose beef balls", instruction: "Divide 400g 80/20 ground beef into 4 loose balls (~100g). Handle minimally — do NOT compact. Season just before cooking.", tip: "80/20 beef is essential. The fat renders under pressure and creates the crispy lacy edges." },
      { step: 2, title: "Smash on a screaming hot pan", instruction: "Heat a cast iron skillet for 4–5 mins until extremely hot. Add a little butter. Place one beef ball, cover with parchment paper, and smash as hard and flat as possible to ~5mm. Hold 10 secs. Season the top." },
      { step: 3, title: "Develop the crust", instruction: "Cook undisturbed for 2 full mins. Lacy brown crispy edges should form. Flip once. Place cheese on top. Cover with a lid 45 secs to melt. Toast buns cut-side down in the same pan. Build and serve immediately.", tip: "Never move the patties while they're developing their crust. Uninterrupted contact with the hot surface is everything." },
    ],
    proTip: "The smash burger is about maximum Maillard reaction — that brown lacey crust is packed with pure flavour.",
  },
  {
    id: 32, title: "Classic Mac and Cheese", cuisine: "American",
    image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=700",
    readyInMinutes: 30, servings: 4, difficulty: "Easy",
    tags: ["mac and cheese", "macaroni cheese", "cheese pasta", "american comfort food"],
    description: "The ultimate comfort food — elbow macaroni in an ultra-creamy cheddar béchamel sauce, optionally topped with breadcrumbs and baked until golden and bubbling.",
    ingredients: ["pasta", "cheddar cheese", "butter", "flour", "milk", "black pepper"],
    missingIngredients: ["gruyere", "mustard powder", "breadcrumbs"],
    steps: [
      { step: 1, title: "Cook the pasta", instruction: "Cook 300g elbow macaroni until just al dente — slightly undercooked. It will finish cooking in the sauce. Drain and set aside." },
      { step: 2, title: "Make the cheese sauce", instruction: "Melt 3 tbsp butter over medium heat. Add 3 tbsp flour and whisk constantly 2 mins to form a smooth roux. Gradually add 600ml warm milk, whisking until smooth and thick. Remove from heat. Add 250g grated cheddar and 100g gruyere in handfuls, stirring until melted. Season with mustard powder, salt, and black pepper.", tip: "Remove from heat before adding cheese — direct heat can make cheese sauce grainy." },
      { step: 3, title: "Combine and bake", instruction: "Stir cooked pasta into cheese sauce. Pour into a baking dish. Top with extra cheese and buttered breadcrumbs. Bake at 190°C for 20 mins until golden and bubbling. Rest 5 mins before serving." },
    ],
    proTip: "A pinch of mustard powder in cheese sauce amplifies the cheese flavour without any mustardy taste.",
  },
  {
    id: 33, title: "BBQ Pulled Pork", cuisine: "American",
    image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=700",
    readyInMinutes: 240, servings: 6, difficulty: "Medium",
    tags: ["pulled pork", "bbq pork", "slow cooked pork", "american bbq"],
    description: "Pork shoulder slow-roasted until it falls apart effortlessly, then tossed in smoky BBQ sauce. Low and slow is the only way — the wait is absolutely worth it.",
    ingredients: ["pork", "garlic", "onion", "paprika", "cumin", "black pepper", "honey"],
    missingIngredients: ["BBQ sauce", "apple cider vinegar", "smoked paprika"],
    steps: [
      { step: 1, title: "Make the dry rub and apply", instruction: "Mix 2 tbsp smoked paprika, 1 tbsp cumin, 1 tbsp garlic powder, 1 tsp black pepper, 1 tbsp brown sugar, 2 tsp salt. Rub generously all over a 1.5kg pork shoulder. Marinate overnight.", tip: "An overnight rub creates a deep flavour crust and draws out moisture to baste the meat as it cooks." },
      { step: 2, title: "Slow roast", instruction: "Place pork in a roasting pan with ½ cup water. Cover tightly with foil. Roast at 150°C for 4 hours. Remove foil for the last 30 mins to develop a crust." },
      { step: 3, title: "Pull and sauce", instruction: "The pork should fall apart with two forks. Shred completely, discarding large fat pieces. Toss with warmed BBQ sauce and a splash of apple cider vinegar for brightness. Serve in buns with coleslaw." },
    ],
    proTip: "150°C for 4 hours — don't rush it. The slow rendering of collagen into gelatin is what creates that magical tender, moist texture.",
  },
  {
    id: 34, title: "Creamy Tomato Soup", cuisine: "American",
    image: "https://images.unsplash.com/photo-1547592180-85f173990554?w=700",
    readyInMinutes: 40, servings: 4, difficulty: "Easy",
    tags: ["tomato soup", "creamy tomato soup", "roasted tomato soup", "comfort food"],
    description: "Roasting the tomatoes first concentrates their sweetness and adds deep caramelised flavour — worlds beyond any canned version. Blended with cream for a silky, luxurious finish.",
    ingredients: ["tomato", "onion", "garlic", "butter", "heavy cream", "vegetable broth", "basil", "olive oil"],
    missingIngredients: [],
    steps: [
      { step: 1, title: "Roast the tomatoes", instruction: "Preheat oven to 200°C. Halve 1kg plum tomatoes cut-side up on a baking tray with 6 unpeeled garlic cloves. Drizzle with olive oil, season, and roast 35 mins until caramelised and slightly charred.", tip: "Roasting caramelises the natural sugars — stovetop cooking simply cannot achieve this depth." },
      { step: 2, title: "Build and blend", instruction: "Melt 2 tbsp butter. Cook 1 diced onion 10 mins. Squeeze roasted garlic into the pot. Add tomatoes with all juices and 600ml vegetable broth. Simmer 10 mins. Blend completely smooth. Strain for ultra-silky texture." },
      { step: 3, title: "Finish and serve", instruction: "Stir in 150ml heavy cream. Simmer gently, taste and adjust salt. Stir in fresh basil. Serve with crusty bread or a grilled cheese sandwich." },
    ],
    proTip: "A grilled cheese sandwich alongside is an American classic — the crispy buttered bread is the perfect contrast.",
  },
  {
    id: 35, title: "Chicken Wings (Crispy Baked)", cuisine: "American",
    image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=700",
    readyInMinutes: 50, servings: 3, difficulty: "Easy",
    tags: ["chicken wings", "buffalo wings", "baked wings", "american wings"],
    description: "Insanely crispy baked chicken wings using a baking powder trick that mimics deep frying — without any oil. Tossed in classic buffalo sauce.",
    ingredients: ["chicken wings", "garlic powder", "paprika", "black pepper", "butter"],
    missingIngredients: ["baking powder", "hot sauce", "cayenne pepper"],
    steps: [
      { step: 1, title: "Prep wings with baking powder", instruction: "Pat 1kg chicken wings completely dry with paper towels. In a bowl, toss with 1 tbsp baking powder, 1 tsp salt, 1 tsp garlic powder, 1 tsp paprika. The baking powder is the magic — it dries out the skin to make it crispy.", tip: "The baking powder trick raises the pH of the skin, accelerating browning and crisping without frying." },
      { step: 2, title: "Bake on a rack", instruction: "Place wings on a wire rack over a foil-lined baking sheet. Bake at 220°C for 25 mins. Flip and bake another 20–25 mins until deeply golden and crispy." },
      { step: 3, title: "Toss in buffalo sauce", instruction: "Mix 4 tbsp hot sauce with 2 tbsp melted butter. Toss hot wings immediately in the sauce. Serve with blue cheese dip and celery." },
    ],
    proTip: "Using baking powder (not soda) and drying wings overnight in the fridge gives the crispiest possible result without frying.",
  },
  {
    id: 36, title: "New York Cheesecake", cuisine: "American",
    image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=700",
    readyInMinutes: 90, servings: 10, difficulty: "Hard",
    tags: ["cheesecake", "new york cheesecake", "cream cheese cake", "american dessert"],
    description: "Dense, rich, ultra-creamy New York-style cheesecake on a graham cracker crust. The water bath is the secret to avoiding cracks and achieving that perfectly set texture.",
    ingredients: ["cream cheese", "eggs", "sugar", "heavy cream", "vanilla extract", "butter"],
    missingIngredients: ["graham crackers", "sour cream"],
    steps: [
      { step: 1, title: "Make the graham cracker crust", instruction: "Crush 200g graham crackers. Mix with 60g melted butter and 2 tbsp sugar. Press firmly into the base of a 23cm springform pan. Bake at 170°C for 10 mins. Cool." },
      { step: 2, title: "Make the cheesecake filling", instruction: "Beat 900g cream cheese until smooth. Add 200g sugar gradually. Add 3 eggs one at a time, mixing just until combined — don't overmix. Add 200ml sour cream, 1 tsp vanilla. Pour over cooled crust.", tip: "Overmixing incorporates air, which leads to cracks. Mix just until combined." },
      { step: 3, title: "Water bath bake", instruction: "Wrap the springform pan tightly in foil. Place in a larger roasting pan. Fill roasting pan with boiling water halfway up the sides of the springform. Bake at 160°C for 65–70 mins until just barely set in the centre. Turn off oven, leave door ajar 1 hour. Cool, then refrigerate overnight." },
    ],
    proTip: "The cheesecake should jiggle like jelly in the centre when done — it sets firm as it cools. Don't overbake.",
  },
  {
    id: 37, title: "Clam Chowder", cuisine: "American",
    image: "https://images.unsplash.com/photo-1547592180-85f173990554?w=700",
    readyInMinutes: 40, servings: 4, difficulty: "Medium",
    tags: ["clam chowder", "new england chowder", "seafood soup", "american soup"],
    description: "A thick, creamy New England chowder packed with clams, potatoes, and smoky bacon. Comforting, briny, and deeply satisfying on a cold day.",
    ingredients: ["bacon", "potato", "onion", "celery", "butter", "flour", "heavy cream", "vegetable broth"],
    missingIngredients: ["canned clams", "clam juice", "bay leaf"],
    steps: [
      { step: 1, title: "Render the bacon", instruction: "Cook 150g diced bacon in a large pot until crispy. Remove bacon, leaving the fat in the pot." },
      { step: 2, title: "Build the base", instruction: "In bacon fat, cook 1 diced onion and 2 celery stalks until soft. Add 3 tbsp flour, stir 2 mins. Add 500ml clam juice and 300ml chicken broth. Add 3 large diced potatoes. Simmer 15 mins until potatoes are tender." },
      { step: 3, title: "Finish with cream and clams", instruction: "Stir in 200ml heavy cream. Add 2 cans of clams with their juice. Simmer gently 5 mins — don't boil or clams will toughen. Season, add fresh thyme. Serve with crispy bacon on top and oyster crackers on the side." },
    ],
    proTip: "Never boil chowder after adding the clams — they turn rubbery instantly. Gentle simmering only.",
  },

  /* ── MEDITERRANEAN (5) ───────────────────────────────────────────── */
  {
    id: 38, title: "Greek Chicken Souvlaki", cuisine: "Mediterranean",
    image: "https://images.unsplash.com/photo-1544025162-d76694265947?w=700",
    readyInMinutes: 30, servings: 4, difficulty: "Easy",
    tags: ["souvlaki", "greek chicken", "chicken skewer", "pita wrap", "greek food"],
    description: "Lemon-garlic-oregano marinated chicken grilled on skewers, wrapped in warm pita with homemade tzatziki. The marinade is the entire story — at least 2 hours gives the best result.",
    ingredients: ["chicken", "lemon", "garlic", "olive oil", "oregano", "yogurt", "cucumber", "pita"],
    missingIngredients: ["fresh dill", "red onion"],
    steps: [
      { step: 1, title: "Marinate the chicken", instruction: "Mix juice of 2 lemons, 4 tbsp olive oil, 4 minced garlic cloves, 2 tsp dried oregano, 1 tsp salt, 1 tsp paprika. Add 600g chicken thigh cubes. Marinate 2 hours minimum.", tip: "Don't marinate more than 4 hours — the lemon acid eventually breaks the meat texture." },
      { step: 2, title: "Make tzatziki", instruction: "Grate ½ cucumber and squeeze out ALL moisture. Mix with 250g thick Greek yogurt, 2 minced garlic cloves, 1 tbsp olive oil, fresh dill, lemon juice. Season generously.", tip: "Squeezing the cucumber dry is the single most important step for good tzatziki." },
      { step: 3, title: "Grill and assemble", instruction: "Thread chicken onto skewers. Grill on medium-high 10–12 mins, turning every 2–3 mins. Warm pitas on grill 30 secs per side. Spread with tzatziki, add chicken, tomato, red onion, and dried oregano." },
    ],
    proTip: "Chicken thighs stay far juicier than breast on the grill — always use thighs for souvlaki.",
  },
  {
    id: 39, title: "Shakshuka", cuisine: "Mediterranean",
    image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=700",
    readyInMinutes: 25, servings: 3, difficulty: "Easy",
    tags: ["shakshuka", "eggs in tomato", "israeli shakshuka", "middle eastern eggs", "breakfast"],
    description: "Eggs poached directly in a spiced, chunky tomato-pepper sauce. A one-pan wonder from North Africa and the Middle East — just as good for dinner as it is for breakfast.",
    ingredients: ["eggs", "tomato", "bell pepper", "onion", "garlic", "cumin", "paprika", "chili flakes"],
    missingIngredients: ["harrisa", "feta cheese"],
    steps: [
      { step: 1, title: "Build the tomato base", instruction: "Heat 3 tbsp olive oil. Cook 1 diced onion and 2 diced bell peppers 8 mins until soft. Add 4 minced garlic cloves, 2 tsp cumin, 1 tsp paprika, ½ tsp chili flakes. Cook 2 mins." },
      { step: 2, title: "Add tomatoes", instruction: "Add 2 cans crushed tomatoes. Season with salt and a pinch of sugar. Simmer 10 mins until the sauce has thickened and the flavours have melded. Taste and adjust." },
      { step: 3, title: "Poach the eggs", instruction: "Make wells in the sauce with a spoon. Crack 1 egg into each well. Cover and cook on medium-low heat 5–8 mins — until whites are set but yolks are still runny. Garnish with feta, fresh herbs. Serve with crusty bread to mop up the sauce.", tip: "Cover the pan to trap steam and cook the tops of the eggs. Check frequently — overcooked yolks are a tragedy." },
    ],
    proTip: "Undercook slightly — the eggs continue to set from the residual heat of the sauce after removing from heat.",
  },
  {
    id: 40, title: "Hummus (Classic)", cuisine: "Mediterranean",
    image: "https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=700",
    readyInMinutes: 15, servings: 6, difficulty: "Easy",
    tags: ["hummus", "classic hummus", "chickpea dip", "middle eastern", "dip"],
    description: "Silky, ultra-smooth hummus made the right way — with ice water, quality tahini, and patience in the food processor. Far better than any store-bought version.",
    ingredients: ["chickpeas", "garlic", "lemon", "olive oil", "cumin"],
    missingIngredients: ["tahini", "ice water"],
    steps: [
      { step: 1, title: "Peel the chickpeas", instruction: "Drain 2 cans of chickpeas. Rub between your hands to remove the papery skins. This step takes 5 mins but makes the hummus significantly smoother.", tip: "Peeling chickpeas is the difference between good hummus and exceptional hummus." },
      { step: 2, title: "Blend", instruction: "Blend peeled chickpeas with 4 tbsp tahini, juice of 2 lemons, 1 garlic clove, ½ tsp cumin, and 1 tsp salt. With the processor running, add 4–6 tbsp ice water until you achieve a silky, smooth consistency. Taste and adjust." },
      { step: 3, title: "Serve", instruction: "Spread in a wide bowl using the back of a spoon to create swirls. Drizzle with excellent olive oil. Sprinkle paprika and a few whole chickpeas. Serve with warm pita or crudités." },
    ],
    proTip: "Ice water is the hummus chef's secret — it lightens the texture and makes it incredibly smooth and fluffy.",
  },
  {
    id: 41, title: "Falafel", cuisine: "Mediterranean",
    image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=700",
    readyInMinutes: 30, servings: 4, difficulty: "Medium",
    tags: ["falafel", "chickpea falafel", "middle eastern falafel", "vegetarian", "street food"],
    description: "Crispy-outside, light-inside deep-fried chickpea patties packed with fresh herbs and spices. The secret is using dried soaked chickpeas — never canned.",
    ingredients: ["chickpeas", "garlic", "onion", "parsley", "cumin", "coriander powder", "flour"],
    missingIngredients: ["baking soda", "dried chickpeas"],
    steps: [
      { step: 1, title: "Prepare the chickpeas", instruction: "Soak 300g DRIED chickpeas overnight. Do NOT use canned — they are too wet and the falafel will fall apart. Drain well.", tip: "This is the most important rule of falafel. Dried soaked chickpeas only." },
      { step: 2, title: "Make the falafel mixture", instruction: "Process soaked chickpeas with 1 diced onion, 4 garlic cloves, large bunch of parsley and cilantro, 1 tsp cumin, 1 tsp coriander, ½ tsp chili powder, 1 tbsp flour, ½ tsp baking soda, and salt. Process to a coarse crumb — not smooth. Refrigerate 30 mins." },
      { step: 3, title: "Fry", instruction: "Form into small patties or balls. Deep fry in oil at 175°C for 3–4 mins per batch until deeply golden. Drain. Serve immediately in pita with tahini sauce, tomato, cucumber, and pickled vegetables." },
    ],
    proTip: "Refrigerating the mixture before frying helps it hold together and makes the inside lighter and fluffier.",
  },
  {
    id: 42, title: "Greek Salad (Horiatiki)", cuisine: "Mediterranean",
    image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=700",
    readyInMinutes: 10, servings: 4, difficulty: "Easy",
    tags: ["greek salad", "horiatiki", "salad", "mediterranean salad", "feta salad"],
    description: "The authentic Greek village salad — no lettuce, just ripe tomatoes, cucumber, olives, onion, and a whole slab of feta drizzled with exceptional olive oil.",
    ingredients: ["tomato", "cucumber", "red onion", "feta", "olive oil", "black pepper", "oregano"],
    missingIngredients: ["kalamata olives", "green pepper"],
    steps: [
      { step: 1, title: "Cut the vegetables", instruction: "Cut tomatoes into large wedges. Slice cucumber into thick half-moons. Thinly slice red onion and soak in ice water 5 mins to mellow the sharpness. Halve green pepper." },
      { step: 2, title: "Assemble and dress", instruction: "Combine tomatoes, cucumber, pepper, and drained onion in a wide bowl. Add Kalamata olives. Place a whole slab of feta on top (don't crumble it). Drizzle generously with the best olive oil you have. Sprinkle with dried oregano and cracked black pepper.", tip: "No lemon juice, no vinegar — authentic Horiatiki is dressed with olive oil only. The tomatoes provide all the acidity needed." },
    ],
    proTip: "The olive oil IS the dressing. Use the best quality you have — this salad has nowhere to hide mediocre ingredients.",
  },

  /* ── MEXICAN (4) ──────────────────────────────────────────────────── */
  {
    id: 43, title: "Chicken Tacos al Pastor", cuisine: "Mexican",
    image: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=700",
    readyInMinutes: 35, servings: 4, difficulty: "Medium",
    tags: ["al pastor", "tacos", "chicken tacos", "street tacos", "mexican tacos"],
    description: "Chicken marinated in achiote and citrus, seared until caramelised at the edges, served in double-stacked corn tortillas with fresh pico de gallo.",
    ingredients: ["chicken", "onion", "tomato", "garlic", "cumin", "chili powder", "lime", "cilantro"],
    missingIngredients: ["achiote paste", "corn tortillas", "pineapple"],
    steps: [
      { step: 1, title: "Marinate", instruction: "Blend: 3 tbsp achiote paste, juice of 2 limes, juice of ½ orange, 3 garlic cloves, 1 tsp chili powder, 1 tbsp oil, 1 tsp salt. Slice 600g chicken thighs thinly (~5mm). Marinate 30 mins min." },
      { step: 2, title: "Make pico de gallo", instruction: "Finely dice 2 tomatoes, ½ red onion, 1 jalapeño. Mix with lime juice, chopped cilantro, and salt. Make fresh, just before serving." },
      { step: 3, title: "Sear and assemble", instruction: "Sear chicken in very hot cast iron 2 mins without moving, then flip 1–2 mins until charred at the edges. Double-stack warm corn tortillas. Fill with chicken, pico, diced white onion, and cilantro.", tip: "Double-stacking tortillas is traditional — it prevents tearing and gives a better bite." },
    ],
    proTip: "The char on the chicken edges is the flavour. Use the highest heat you can for true al pastor character.",
  },
  {
    id: 44, title: "Beef Enchiladas", cuisine: "Mexican",
    image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=700",
    readyInMinutes: 45, servings: 4, difficulty: "Medium",
    tags: ["enchiladas", "beef enchiladas", "mexican bake", "enchilada sauce"],
    description: "Corn tortillas filled with seasoned ground beef and cheese, smothered in smoky red enchilada sauce, and baked until bubbling. A Mexican family staple.",
    ingredients: ["ground beef", "onion", "garlic", "tomato", "cumin", "chili powder", "cheddar cheese", "tortilla"],
    missingIngredients: ["dried ancho chili", "corn tortillas", "enchilada sauce"],
    steps: [
      { step: 1, title: "Make the enchilada sauce", instruction: "Blend 3 dried ancho chilies (soaked in hot water), 2 garlic cloves, 1 can tomatoes, 1 tsp cumin, 1 tsp oregano, salt, and 200ml chicken broth. Strain and simmer 10 mins." },
      { step: 2, title: "Cook the beef filling", instruction: "Brown 500g ground beef with diced onion and garlic. Season with cumin, chili powder, salt. Add ½ cup enchilada sauce to the filling. Cook 3 mins." },
      { step: 3, title: "Roll and bake", instruction: "Warm corn tortillas in a dry pan 20 secs to soften. Fill each with beef and cheese. Roll tightly and place seam-side down in a baking dish. Pour remaining enchilada sauce over. Top with grated cheese. Bake at 190°C for 20 mins until bubbly." },
    ],
    proTip: "Dip each tortilla in warm enchilada sauce before filling — it adds flavour and prevents cracking when rolling.",
  },
  {
    id: 45, title: "Guacamole", cuisine: "Mexican",
    image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=700",
    readyInMinutes: 10, servings: 4, difficulty: "Easy",
    tags: ["guacamole", "avocado dip", "mexican dip", "fresh guacamole"],
    description: "The real deal — ripe avocados chunky-mashed with lime, cilantro, jalapeño, and onion. Simple, fresh, and far better than anything from a jar.",
    ingredients: ["avocado", "lemon", "onion", "tomato", "cilantro", "garlic"],
    missingIngredients: ["jalapeño"],
    steps: [
      { step: 1, title: "Mash the avocados", instruction: "Halve 3 ripe avocados and scoop into a bowl. Add juice of 1 lime and ½ tsp salt. Mash with a fork to a chunky texture — not smooth.", tip: "Ripe avocados only — they should feel soft but not mushy when pressed. Unripe avocados never become good guacamole." },
      { step: 2, title: "Add the flavours", instruction: "Fold in: ¼ diced white onion, ½ diced jalapeño (seeds removed for less heat), 1 small diced tomato, a generous handful of chopped cilantro. Add more lime and salt to taste." },
    ],
    proTip: "Press plastic wrap directly onto the surface of the guacamole before refrigerating — this prevents browning.",
  },
  {
    id: 46, title: "Chicken Quesadillas", cuisine: "Mexican",
    image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=700",
    readyInMinutes: 20, servings: 3, difficulty: "Easy",
    tags: ["quesadilla", "chicken quesadilla", "mexican quesadilla", "cheese tortilla"],
    description: "Crispy flour tortillas filled with seasoned chicken, melted cheese, and peppers. Ready in 20 minutes and infinitely customisable — a weeknight hero.",
    ingredients: ["chicken", "cheddar cheese", "tortilla", "onion", "bell pepper", "garlic", "cumin", "chili powder"],
    missingIngredients: ["monterey jack cheese"],
    steps: [
      { step: 1, title: "Season and cook the chicken", instruction: "Slice 400g chicken breast thinly. Season with cumin, chili powder, garlic powder, salt. Cook in a hot pan with oil 3–4 mins per side until cooked. Slice or shred." },
      { step: 2, title: "Sauté peppers and onion", instruction: "In the same pan, sauté sliced bell pepper and onion 5 mins until soft and lightly caramelised." },
      { step: 3, title: "Assemble and cook", instruction: "Place a tortilla on the pan over medium heat. Sprinkle cheese on one half. Add chicken and vegetables. Fold tortilla over. Cook 2–3 mins per side until golden and crispy and cheese is fully melted. Cut into wedges and serve with sour cream, guacamole, and salsa." },
    ],
    proTip: "Medium heat is the key — high heat burns the tortilla before the cheese melts. Patient medium heat gives you crispy and melted.",
  },

  /* ── JAPANESE (4) ─────────────────────────────────────────────────── */
  {
    id: 47, title: "Chicken Teriyaki", cuisine: "Japanese",
    image: "https://images.unsplash.com/photo-1611143669185-af224c5e3252?w=700",
    readyInMinutes: 25, servings: 3, difficulty: "Easy",
    tags: ["teriyaki", "chicken teriyaki", "japanese chicken", "glazed chicken"],
    description: "Juicy chicken glazed in a shiny teriyaki sauce of soy, mirin, and honey. Reduced until lacquered and caramelised on the chicken — beautiful and delicious.",
    ingredients: ["chicken", "soy sauce", "honey", "garlic", "ginger", "sesame oil", "rice", "green onion"],
    missingIngredients: ["mirin", "sake"],
    steps: [
      { step: 1, title: "Make the teriyaki sauce", instruction: "Combine: 4 tbsp soy sauce, 2 tbsp mirin, 2 tbsp sake (or dry sherry), 1 tbsp honey, 1 tsp grated ginger, 1 clove garlic. Simmer 4–5 mins until reduced by one-third and coats the back of a spoon.", tip: "Don't over-reduce — it should flow off a spoon. It thickens much more when it hits the hot chicken." },
      { step: 2, title: "Pan-fry skin-side down", instruction: "Pat 500g chicken thighs completely dry. Poke skin with a fork. Place skin-side down in a cold skillet over medium heat — no oil. Press gently 30 secs. Cook undisturbed 7–8 mins until skin is deep golden and crispy.", tip: "Starting cold and medium heat renders fat slowly — the secret to perfectly crispy chicken skin." },
      { step: 3, title: "Glaze and rest", instruction: "Flip, cook 4 mins. Pour teriyaki sauce over — it will sizzle and caramelise. Baste continuously 2–3 mins. Rest 3 mins, then slice diagonally. Serve over rice with sesame seeds and green onion." },
    ],
    proTip: "Poking the skin before cooking prevents it from balling up — a classic Japanese technique for even crisping.",
  },
  {
    id: 48, title: "Miso Soup", cuisine: "Japanese",
    image: "https://images.unsplash.com/photo-1547592180-85f173990554?w=700",
    readyInMinutes: 15, servings: 3, difficulty: "Easy",
    tags: ["miso soup", "japanese miso", "tofu miso soup", "miso broth"],
    description: "Japan's soul food — a delicate dashi broth with dissolved miso paste, silken tofu, and wakame seaweed. Made fresh in 15 minutes and endlessly comforting.",
    ingredients: ["tofu", "green onion", "soy sauce", "ginger"],
    missingIngredients: ["white miso paste", "dashi stock", "wakame seaweed"],
    steps: [
      { step: 1, title: "Make the dashi", instruction: "Bring 800ml water to 60–70°C (tiny bubbles, not boiling). Add 10g dried kombu, steep 10 mins. Remove kombu. Add 10g bonito flakes, steep 5 mins. Strain. This is your dashi.", tip: "Never boil dashi — high heat makes it bitter. Gentle extraction is everything." },
      { step: 2, title: "Rehydrate wakame", instruction: "Place 5g dried wakame in cold water 5 mins until softened and silky green. Drain and roughly chop." },
      { step: 3, title: "Dissolve miso and serve", instruction: "Bring dashi to a gentle simmer. Place 3–4 tbsp white miso in a ladle and dip partially into the hot broth, stirring to dissolve — never add miso to boiling liquid. Add silken tofu cubes and wakame. Serve immediately, garnished with green onion.", tip: "Miso should never be boiled — heat destroys the probiotic flavour compounds." },
    ],
    proTip: "White miso (shiro miso) is mild and sweet — perfect for beginners. Red miso is stronger and saltier.",
  },
  {
    id: 49, title: "Tonkatsu (Crispy Pork Cutlet)", cuisine: "Japanese",
    image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=700",
    readyInMinutes: 25, servings: 2, difficulty: "Easy",
    tags: ["tonkatsu", "pork katsu", "japanese pork", "katsu curry", "breaded pork"],
    description: "Thick-cut pork loin coated in panko breadcrumbs and deep-fried to a golden crisp. The panko coating creates a uniquely light, shatter-crisp crust unlike any Western breadcrumb.",
    ingredients: ["pork chops", "eggs", "flour", "breadcrumbs", "vegetable oil", "cabbage"],
    missingIngredients: ["panko breadcrumbs", "tonkatsu sauce"],
    steps: [
      { step: 1, title: "Prepare the pork", instruction: "Use 2 thick (2cm) pork loin cutlets. Score the fat along the edges with a knife to prevent curling. Season with salt and pepper. Dredge in flour, dip in beaten egg, then coat generously in panko breadcrumbs, pressing them on firmly.", tip: "Panko (not regular breadcrumbs) gives tonkatsu its signature light, shatter-crisp crust." },
      { step: 2, title: "Deep fry", instruction: "Heat oil to 170°C in a deep pot. Gently lower the tonkatsu. Fry 5–6 mins per side until deeply golden all over. The internal temperature should be 65°C. Drain on a wire rack (not paper towels — they steam and soften the crust)." },
      { step: 3, title: "Rest, slice and serve", instruction: "Rest 3 mins before slicing into 2cm strips — this redistributes the juices. Serve over finely shredded raw cabbage (its refreshing crunch is traditional). Add tonkatsu sauce and Japanese mustard." },
    ],
    proTip: "Rest on a wire rack, not paper towels — the steam from paper towels softens the crispy coating.",
  },
  {
    id: 50, title: "Gyoza (Pan-Fried Dumplings)", cuisine: "Japanese",
    image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=700",
    readyInMinutes: 45, servings: 4, difficulty: "Medium",
    tags: ["gyoza", "dumplings", "japanese dumplings", "pan fried dumplings", "potstickers"],
    description: "Crispy-bottomed Japanese dumplings filled with seasoned pork and cabbage. The cook-steam-crisp method creates a caramelised bottom with a tender steamed top — the perfect textural contrast.",
    ingredients: ["ground beef", "cabbage", "garlic", "ginger", "soy sauce", "sesame oil", "green onion"],
    missingIngredients: ["gyoza wrappers", "rice vinegar"],
    steps: [
      { step: 1, title: "Make the filling", instruction: "Finely shred ¼ cabbage. Toss with 1 tsp salt and squeeze out ALL moisture — this is critical to prevent soggy gyoza. Mix with 300g minced pork, 2 minced garlic cloves, 1 tsp grated ginger, 2 tbsp soy sauce, 1 tsp sesame oil, and sliced green onion." },
      { step: 2, title: "Fold the dumplings", instruction: "Place a gyoza wrapper on your palm. Add 1 tsp filling in the centre. Moisten the edge with water. Fold in half and pleat the front edge, pressing against the back, to make 5–6 pleats. Press firmly to seal." },
      { step: 3, title: "Pan-steam-crisp method", instruction: "Heat a non-stick pan over medium-high. Add 1 tbsp oil. Place gyoza flat-side down. Fry 2 mins until bottoms are golden. Add ½ cup water (it will splatter), cover immediately and steam 4–5 mins until water evaporates. Remove lid and cook until bottoms are crispy again. Serve crispy-side up with dipping sauce (soy sauce + rice vinegar + chili oil).", tip: "The three-stage cook method (fry-steam-fry) is what creates the signature caramelised bottom and tender top." },
    ],
    proTip: "Squeezing all moisture from the cabbage is non-negotiable — excess water causes soggy, falling-apart gyoza.",
  },
  // ── Extra Indian Dishes ──────────────────────────────────────────────────
  {
    id: 51, title: "Egg Bhurji (Indian Scrambled Eggs)", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=700",
    readyInMinutes: 15, servings: 2, difficulty: "Easy",
    tags: ["egg bhurji", "indian eggs", "quick breakfast", "spicy eggs", "easy indian"],
    description: "Mumbai street-style scrambled eggs loaded with onion, tomato, green chilli and spices. Ready in 15 minutes — the easiest Indian dish you can make.",
    ingredients: ["eggs", "onion", "tomato", "green chilli", "ginger", "cumin", "turmeric", "cilantro"],
    missingIngredients: [],
    steps: [
      { step: 1, title: "Sauté the base", instruction: "Heat 1 tbsp oil in a pan. Add 1 tsp cumin seeds — let them splutter. Add 1 finely chopped onion and 1 slit green chilli. Cook 3 mins until onion softens." },
      { step: 2, title: "Add tomato & spices", instruction: "Add 1 chopped tomato, ½ tsp turmeric, ½ tsp chilli powder, salt to taste. Cook 3 mins until tomato breaks down." },
      { step: 3, title: "Scramble the eggs", instruction: "Crack 4 eggs directly into the pan. Stir continuously on medium heat, folding the eggs through the masala. Cook 2–3 mins — keep them slightly soft. Finish with chopped cilantro and serve hot with bread or roti.", tip: "Don't overcook — remove from heat while eggs look just barely done, they continue cooking in the pan." },
    ],
    proTip: "A pinch of garam masala stirred in right at the end takes the flavour up a notch.",
  },
  {
    id: 52, title: "Tadka Dal (Lentil Soup)", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=700",
    readyInMinutes: 30, servings: 4, difficulty: "Easy",
    tags: ["dal", "lentils", "comfort food", "vegan indian", "easy dal", "tadka"],
    description: "Comforting yellow lentils tempered with a sizzling tadka of ghee, cumin, garlic and dried chilli. A staple in every Indian household.",
    ingredients: ["lentils", "onion", "tomato", "garlic", "ginger", "turmeric", "cumin", "ghee"],
    missingIngredients: ["dried red chilli", "mustard seeds"],
    steps: [
      { step: 1, title: "Boil the dal", instruction: "Rinse 1 cup yellow lentils (moong or toor dal) thoroughly. Pressure cook or simmer with 3 cups water, ½ tsp turmeric and salt for 20 mins until completely soft and mushy. Whisk smooth." },
      { step: 2, title: "Make the base", instruction: "In a separate pan, heat 1 tbsp oil. Add chopped onion, cook 5 mins. Add 1 tsp ginger-garlic paste and 1 chopped tomato. Cook until oil separates, about 5 mins. Stir into the cooked dal." },
      { step: 3, title: "Make the tadka", instruction: "In a small pan, heat 2 tbsp ghee until very hot. Add 1 tsp cumin seeds, 2 dried red chillies and 3 minced garlic cloves. They will sizzle and turn golden in 30 seconds. Pour this sizzling tadka directly over the dal and cover immediately to trap the aroma.", tip: "The ghee must be really hot when you add the spices — that's what creates the signature nutty flavour." },
    ],
    proTip: "Dal thickens as it cools. Add hot water to loosen and simmer for 2 mins before serving.",
  },
  {
    id: 53, title: "Aloo Paratha", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=700",
    readyInMinutes: 40, servings: 3, difficulty: "Medium",
    tags: ["paratha", "aloo paratha", "stuffed bread", "punjabi", "breakfast", "flatbread"],
    description: "Punjab's favourite stuffed flatbread — wheat dough filled with spiced mashed potato and cooked with butter until golden. Served with yogurt and pickle.",
    ingredients: ["potato", "flour", "cumin", "ginger", "cilantro", "butter", "chilli powder"],
    missingIngredients: ["carom seeds", "amchur powder"],
    steps: [
      { step: 1, title: "Make the dough", instruction: "Mix 2 cups whole wheat flour with water and a pinch of salt. Knead into a soft, smooth dough. Cover and rest 20 mins." },
      { step: 2, title: "Make the filling", instruction: "Boil and mash 3 potatoes. Mix with 1 tsp cumin, 1 tsp ginger (grated), ½ tsp chilli powder, ½ tsp amchur (dry mango powder), fresh cilantro, and salt." },
      { step: 3, title: "Stuff and cook", instruction: "Roll a dough ball flat. Place 2 tbsp filling in the centre. Gather edges and seal. Gently roll into a flat disc, being careful not to break the filling through. Cook on a hot tawa with butter for 2 mins each side until golden brown spots appear.", tip: "Roll gently with even pressure from the centre outward to keep the filling intact." },
    ],
    proTip: "Serve immediately with cold yogurt and a dollop of butter on top — this is non-negotiable.",
  },
  {
    id: 54, title: "Chana Masala", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=700",
    readyInMinutes: 35, servings: 4, difficulty: "Easy",
    tags: ["chana masala", "chickpea curry", "vegan", "protein rich", "north indian"],
    description: "Bold, tangy chickpea curry with a deep spiced tomato-onion gravy. One of India's most popular street foods — hearty, vegan, and packed with protein.",
    ingredients: ["chickpeas", "onion", "tomato", "garlic", "ginger", "cumin", "garam masala", "coriander powder"],
    missingIngredients: ["anardana", "kashmiri chili"],
    steps: [
      { step: 1, title: "Build the masala", instruction: "Heat 2 tbsp oil. Add 1 tsp cumin seeds. Add 2 finely chopped onions and cook 8 mins until deeply golden. Add 1 tbsp ginger-garlic paste, cook 2 mins. Add 2 chopped tomatoes and all dry spices: 1 tsp coriander, ½ tsp chilli powder, 1 tsp cumin powder. Cook until oil separates, about 8 mins." },
      { step: 2, title: "Add chickpeas", instruction: "Add 2 cans drained chickpeas (or 400g cooked). Add ½ cup water, stir well. Simmer 15 mins to let chickpeas absorb the masala." },
      { step: 3, title: "Finish and serve", instruction: "Add 1 tsp garam masala, 1 tsp amchur (or a squeeze of lemon), and salt. Crush a few chickpeas against the side of the pan to thicken the gravy. Garnish with cilantro, sliced ginger and green chilli.", tip: "Crushing some chickpeas naturally thickens the curry without any flour or cornstarch." },
    ],
    proTip: "The longer you simmer, the better the flavour. Tastes even better the next day.",
  },
  {
    id: 55, title: "Vegetable Pulao", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1596797038530-2c107229654b?w=700",
    readyInMinutes: 30, servings: 4, difficulty: "Easy",
    tags: ["pulao", "rice", "vegetable rice", "one pot", "easy indian", "vegan"],
    description: "Fragrant basmati rice cooked with whole spices and mixed vegetables. A lighter, simpler cousin of biryani that's perfect for a weeknight dinner.",
    ingredients: ["basmati rice", "onion", "carrot", "peas", "potato", "cumin", "bay leaves", "ghee"],
    missingIngredients: ["cloves", "cardamom", "cinnamon"],
    steps: [
      { step: 1, title: "Fry the aromatics", instruction: "Heat 2 tbsp ghee in a heavy pot. Add whole spices: 1 bay leaf, 2 cloves, 1 cardamom, 1 inch cinnamon, 1 tsp cumin seeds. Let splutter 30 sec. Add sliced onion and cook 6 mins until golden." },
      { step: 2, title: "Add vegetables", instruction: "Add 1 diced carrot, 1 diced potato, ½ cup peas, 1 tsp ginger-garlic paste. Stir-fry 3 mins. Season with salt and ½ tsp garam masala." },
      { step: 3, title: "Cook the rice", instruction: "Add 1.5 cups rinsed basmati rice. Stir to coat in the ghee. Add 2.5 cups hot water. Bring to boil, then cover tightly and cook on lowest heat for 15 mins. Rest covered for 5 mins, then fluff with a fork.", tip: "Never open the lid during the 15-minute cook — the steam is what cooks the rice perfectly." },
    ],
    proTip: "Rinsing the rice until water runs clear removes excess starch and keeps grains fluffy and separate.",
  },
  {
    id: 56, title: "Paneer Tikka", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=700",
    readyInMinutes: 35, servings: 4, difficulty: "Medium",
    tags: ["paneer tikka", "tandoori", "starter", "grilled paneer", "vegetarian"],
    description: "Chunks of paneer and peppers marinated in spiced yogurt and chargrilled until smoky. The classic Indian starter that doubles as a main.",
    ingredients: ["paneer", "yogurt", "bell pepper", "onion", "garam masala", "kashmiri chili", "ginger", "garlic"],
    missingIngredients: ["chaat masala", "carom seeds"],
    steps: [
      { step: 1, title: "Marinate the paneer", instruction: "Mix 4 tbsp thick yogurt with 1 tbsp ginger-garlic paste, 1 tsp Kashmiri chilli powder (for colour), 1 tsp garam masala, 1 tsp cumin powder, 1 tbsp lemon juice, 1 tbsp oil, and salt. Add 300g paneer cubes and bell pepper chunks. Marinate at least 30 mins (overnight is better)." },
      { step: 2, title: "Grill", instruction: "Thread paneer and peppers onto skewers alternating with onion chunks. Cook on a very hot griddle pan or grill for 3–4 mins each side until charred spots appear. Brush with butter halfway through." },
      { step: 3, title: "Serve", instruction: "Sprinkle with chaat masala and a squeeze of lemon. Serve with mint chutney and sliced raw onion.", tip: "The marinade must coat every surface — massage it in well for maximum flavour." },
    ],
    proTip: "A squeeze of lemon and pinch of chaat masala right before serving brings the whole dish alive.",
  },
  // ── Simple / Quick Dishes ─────────────────────────────────────────────────
  {
    id: 57, title: "Classic Omelette", cuisine: "American",
    image: "https://images.unsplash.com/photo-1510693206972-df098062cb71?w=700",
    readyInMinutes: 10, servings: 1, difficulty: "Easy",
    tags: ["omelette", "eggs", "quick", "breakfast", "simple", "easy"],
    description: "A perfectly folded French-style omelette with a silky interior and golden exterior. The simplest egg dish done properly.",
    ingredients: ["eggs", "butter", "salt", "black pepper"],
    missingIngredients: ["chives"],
    steps: [
      { step: 1, title: "Beat the eggs", instruction: "Crack 3 eggs into a bowl. Season with salt and pepper. Beat vigorously with a fork until completely combined — no streaks of white." },
      { step: 2, title: "Cook", instruction: "Heat a non-stick pan over medium heat. Add 1 tbsp butter — it should foam but not brown. Pour in eggs. Stir constantly with a rubber spatula for 30 seconds while shaking the pan." },
      { step: 3, title: "Fold and serve", instruction: "When the eggs are just barely set but still glossy on top, add any fillings (cheese, herbs) to the centre. Tilt the pan and fold the omelette in thirds using the spatula. Slide onto a plate seam-side down. It should be pale yellow with no brown.", tip: "The pan must be hot enough that butter foams immediately but cool enough that it doesn't brown." },
    ],
    proTip: "Pull the pan off heat a moment too early — residual heat finishes the cooking perfectly.",
  },
  {
    id: 58, title: "Tomato Pasta (5 ingredients)", cuisine: "Italian",
    image: "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=700",
    readyInMinutes: 20, servings: 2, difficulty: "Easy",
    tags: ["pasta", "tomato pasta", "quick pasta", "easy dinner", "5 ingredients", "simple"],
    description: "The simplest pasta you can make — just pasta, canned tomatoes, garlic, olive oil and parmesan. Ready in 20 minutes and endlessly satisfying.",
    ingredients: ["pasta", "tomato paste", "garlic", "olive oil", "parmesan"],
    missingIngredients: ["canned tomatoes", "basil"],
    steps: [
      { step: 1, title: "Cook pasta", instruction: "Boil heavily salted water. Cook 200g pasta (spaghetti or penne) 1 minute less than packet says — it will finish in the sauce. Reserve 1 cup pasta water before draining." },
      { step: 2, title: "Make the sauce", instruction: "While pasta cooks, sauté 3 sliced garlic cloves in 3 tbsp olive oil on medium heat for 2 mins until fragrant (not brown). Add 1 can crushed tomatoes and a pinch of chilli flakes. Simmer 8 mins, season with salt." },
      { step: 3, title: "Marry the pasta", instruction: "Add drained pasta to the sauce. Toss vigorously, adding pasta water a splash at a time until sauce is glossy and clings to the pasta. Finish with parmesan and fresh basil.", tip: "Pasta water is starchy and acts as a sauce binder — it's the secret to restaurant-quality pasta." },
    ],
    proTip: "Heavily salted pasta water (it should taste like the sea) is what seasons the pasta from the inside.",
  },
  {
    id: 59, title: "Garlic Fried Rice", cuisine: "Chinese",
    image: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=700",
    readyInMinutes: 15, servings: 2, difficulty: "Easy",
    tags: ["fried rice", "leftover rice", "quick", "easy", "garlic rice", "simple"],
    description: "The ultimate use for leftover rice — tossed with garlic, egg and soy sauce in a screaming hot wok in under 15 minutes.",
    ingredients: ["rice", "garlic", "eggs", "soy sauce", "sesame oil", "green onion", "vegetable oil"],
    missingIngredients: [],
    steps: [
      { step: 1, title: "Prep", instruction: "Use day-old cold rice — fresh rice is too wet and will clump. Break up any clumps with your hands. Mince 6 garlic cloves. Beat 2 eggs. Have everything ready before you start — this cooks fast." },
      { step: 2, title: "High-heat fry", instruction: "Heat a wok or large pan on maximum heat until smoking. Add 2 tbsp oil. Add garlic and fry 30 seconds. Push to side, add eggs and scramble quickly. Add rice immediately — spread across the whole pan." },
      { step: 3, title: "Season and serve", instruction: "Let rice sit 1 min to get some crust. Toss everything together. Add 2 tbsp soy sauce and 1 tsp sesame oil around the edges of the pan. Toss and finish with chopped green onion.", tip: "Maximum heat is essential — low heat steams the rice instead of frying it." },
    ],
    proTip: "Day-old rice is drier and fries properly. Freshly cooked rice turns into mush.",
  },
  {
    id: 60, title: "Avocado Toast", cuisine: "American",
    image: "https://images.unsplash.com/photo-1541519227354-08fa5d50c820?w=700",
    readyInMinutes: 10, servings: 1, difficulty: "Easy",
    tags: ["avocado toast", "breakfast", "quick", "healthy", "simple", "easy"],
    description: "Creamy smashed avocado on crispy toast with lemon, chilli flakes and a perfectly fried egg. Simple, fast, and genuinely delicious.",
    ingredients: ["avocado", "bread", "lemon", "chili flakes", "eggs", "olive oil", "salt", "black pepper"],
    missingIngredients: [],
    steps: [
      { step: 1, title: "Toast and prep", instruction: "Toast 2 thick slices of sourdough or bread until deeply golden and crispy. While toasting, halve 1 ripe avocado, remove stone, scoop flesh into a bowl." },
      { step: 2, title: "Smash the avocado", instruction: "Add a squeeze of lemon juice, a pinch of salt, pinch of chilli flakes to the avocado. Smash with a fork — leave it chunky, not smooth. Taste and adjust seasoning." },
      { step: 3, title: "Assemble", instruction: "Spread avocado generously over toast. Top with a fried egg if desired. Drizzle with a little olive oil. Finish with flaky salt, extra chilli flakes, and a squeeze of lemon.", tip: "Salt the avocado more than you think you need — it brings out the flavour significantly." },
    ],
    proTip: "Use flaky sea salt for finishing — it gives little bursts of seasoning that make each bite interesting.",
  },

  // ── 50 New Indian Recipes (ids 61–110) ───────────────────────────────────
  {
    id: 61, title: "Chicken Curry (Dhaba Style)", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=700",
    readyInMinutes: 45, servings: 4, difficulty: "Medium",
    tags: ["chicken curry", "dhaba", "north indian", "spicy chicken"],
    description: "Bold, rustic chicken curry the way roadside dhabas make it — loads of whole spices, onion-tomato masala and chicken on the bone for maximum flavour.",
    ingredients: ["chicken", "onion", "tomato", "garlic", "ginger", "garam masala", "cumin", "coriander powder", "yogurt"],
    missingIngredients: ["kashmiri chili", "bay leaves"],
    steps: [
      { step: 1, title: "Brown the chicken", instruction: "Heat 3 tbsp oil in a heavy pot. Add chicken pieces (bone-in) and sear on high heat until golden brown on all sides, about 8 mins. Remove and set aside." },
      { step: 2, title: "Build the masala", instruction: "In the same oil, add 2 bay leaves, 1 tsp cumin seeds. Add 2 sliced onions and cook 10 mins until deep golden. Add 2 tbsp ginger-garlic paste, cook 3 mins. Add 3 chopped tomatoes and all dry spices. Cook until oil separates." },
      { step: 3, title: "Simmer the chicken", instruction: "Return chicken to pot. Add ½ cup yogurt (stirred in gradually), 1 cup water. Simmer covered 25 mins until chicken is cooked through. Finish with garam masala and cilantro.", tip: "Cooking chicken on the bone gives much richer flavour than boneless." },
    ],
    proTip: "A piece of coal lit and placed in a small bowl inside the pot for 2 minutes gives authentic smoky dhaba flavour.",
  },
  {
    id: 62, title: "Fish Curry (Goan Style)", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=700",
    readyInMinutes: 35, servings: 4, difficulty: "Medium",
    tags: ["fish curry", "goan", "coconut curry", "seafood indian"],
    description: "Goa's famous tangy-spicy fish curry with a creamy coconut milk base, tempered with mustard seeds and curry leaves.",
    ingredients: ["salmon", "coconut milk", "onion", "tomato", "garlic", "ginger", "turmeric", "cumin"],
    missingIngredients: ["kokum", "mustard seeds", "curry leaves"],
    steps: [
      { step: 1, title: "Make the base", instruction: "Grind 1 cup grated coconut, 4 dried red chillies, 1 tsp cumin, ½ tsp turmeric and 4 garlic cloves with a little water into a smooth paste." },
      { step: 2, title: "Cook the curry", instruction: "Temper mustard seeds and curry leaves in oil. Add sliced onion, cook 5 mins. Add ground paste and tomatoes. Cook 8 mins. Add coconut milk and kokum (or tamarind), simmer 5 mins." },
      { step: 3, title: "Add fish", instruction: "Add fish pieces gently. Simmer 8–10 mins on low heat — do not stir vigorously or the fish will break. Season with salt and serve with steamed rice.", tip: "Add fish right at the end and cook gently — overcooked fish becomes rubbery." },
    ],
    proTip: "Kokum is what gives authentic Goan curry its distinctive tang. Tamarind is a good substitute.",
  },
  {
    id: 63, title: "Lamb Rogan Josh", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1574653853027-5382a3d23a15?w=700",
    readyInMinutes: 75, servings: 4, difficulty: "Hard",
    tags: ["rogan josh", "lamb curry", "kashmiri", "slow cooked"],
    description: "Kashmir's most celebrated dish — slow-cooked lamb in a deeply fragrant sauce of Kashmiri chillies, yogurt and whole spices. Rich, warming and complex.",
    ingredients: ["chicken", "yogurt", "onion", "garlic", "ginger", "kashmiri chili", "garam masala", "cardamom", "cloves"],
    missingIngredients: ["lamb", "fennel powder", "dry ginger powder"],
    steps: [
      { step: 1, title: "Sear the lamb", instruction: "Heat 4 tbsp oil until smoking. Add lamb pieces (bone-in shoulder or leg), sear in batches until deep brown, about 4 mins per side. Remove." },
      { step: 2, title: "Build the sauce", instruction: "Add whole spices to the oil: cardamom, cloves, cinnamon, bay leaves. Add sliced onions and cook 15 mins until golden. Add ginger-garlic paste. Add Kashmiri chilli paste (soaked dried chillies blended) — this gives colour without extreme heat." },
      { step: 3, title: "Slow cook", instruction: "Add lamb back. Whisk yogurt and add gradually. Add ½ cup water. Cook covered on very low heat for 50–60 mins until lamb is falling-off-the-bone tender. Finish with fennel powder and dry ginger powder.", tip: "Patience is key — slow cooking on low heat is what makes the lamb tender and deepens the sauce." },
    ],
    proTip: "Kashmiri chilli gives vibrant red colour with mild heat. Don't substitute regular chilli powder.",
  },
  {
    id: 64, title: "Prawn Masala", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=700",
    readyInMinutes: 25, servings: 3, difficulty: "Easy",
    tags: ["prawn masala", "shrimp curry", "quick seafood", "coastal indian"],
    description: "Juicy prawns cooked in a bold onion-tomato masala with coastal spices. Quick enough for a weeknight, impressive enough for guests.",
    ingredients: ["shrimp", "onion", "tomato", "garlic", "ginger", "turmeric", "coriander powder", "garam masala"],
    missingIngredients: ["curry leaves", "tamarind"],
    steps: [
      { step: 1, title: "Prep prawns", instruction: "Clean and devein 500g prawns. Marinate with ½ tsp turmeric, ½ tsp chilli powder and salt for 10 mins." },
      { step: 2, title: "Make the masala", instruction: "Heat oil, add curry leaves and sliced onion. Cook 8 mins until golden. Add ginger-garlic paste, chopped tomatoes, coriander powder, chilli powder. Cook until oil separates, about 8 mins." },
      { step: 3, title: "Cook prawns", instruction: "Add prawns to the masala and toss to coat. Cook 4–5 mins on medium heat — prawns are done when they curl and turn pink. Do not overcook. Finish with garam masala and lemon juice.", tip: "Prawns cook in minutes — the moment they curl and turn fully pink, take them off heat." },
    ],
    proTip: "Squeeze fresh lemon right before serving to brighten all the flavours.",
  },
  {
    id: 65, title: "Methi Chicken", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=700",
    readyInMinutes: 40, servings: 4, difficulty: "Medium",
    tags: ["methi chicken", "fenugreek chicken", "healthy", "north indian"],
    description: "Succulent chicken cooked with fresh fenugreek leaves — slightly bitter, aromatic and incredibly fragrant. One of North India's most beloved home-cooked dishes.",
    ingredients: ["chicken", "onion", "tomato", "garlic", "ginger", "yogurt", "cumin", "turmeric"],
    missingIngredients: ["fenugreek leaves", "kasuri methi"],
    steps: [
      { step: 1, title: "Marinate chicken", instruction: "Mix chicken with ½ cup yogurt, 1 tsp turmeric, 1 tsp chilli powder, 1 tbsp ginger-garlic paste, salt. Marinate 30 mins minimum." },
      { step: 2, title: "Build the base", instruction: "Cook onions in oil until golden. Add ginger-garlic paste, tomatoes and dry spices. Cook until thick and oil surfaces." },
      { step: 3, title: "Add chicken & methi", instruction: "Add marinated chicken and cook 5 mins. Add washed, chopped fresh methi leaves (or 2 tbsp dried kasuri methi). Add ½ cup water and simmer 20 mins until chicken is cooked. Crush kasuri methi between palms before adding for extra aroma.", tip: "Crushing dried kasuri methi between your palms releases its essential oils and multiplies the aroma." },
    ],
    proTip: "Fresh methi is more intense than dried. If using dried kasuri methi, use only 2 tbsp.",
  },
  {
    id: 66, title: "Baingan Bharta", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=700",
    readyInMinutes: 40, servings: 3, difficulty: "Easy",
    tags: ["baingan bharta", "roasted eggplant", "vegan", "punjabi", "smoky"],
    description: "Whole eggplant charred directly over flame until smoky, then mashed and cooked with onion, tomato and spices. The smokiness is the soul of this dish.",
    ingredients: ["eggplant", "onion", "tomato", "garlic", "ginger", "cumin", "turmeric", "cilantro"],
    missingIngredients: ["mustard oil"],
    steps: [
      { step: 1, title: "Char the eggplant", instruction: "Pierce 1 large eggplant all over with a fork. Place directly on a gas flame, turning every 2–3 mins until completely charred and collapsed, about 15 mins. The skin should be black and crispy. Let cool slightly, then peel off all the charred skin." },
      { step: 2, title: "Mash the eggplant", instruction: "Roughly mash the roasted flesh with a fork. Keep it slightly chunky. Mix in 1 tbsp mustard oil for authentic flavour." },
      { step: 3, title: "Cook the bharta", instruction: "Cook onions in oil until golden. Add ginger-garlic paste, tomatoes and spices. Cook until thick. Add mashed eggplant, mix well and cook 5 mins. Garnish with cilantro and green chilli.", tip: "Holding the eggplant on an open flame gives irreplaceable smokiness. Do not use an oven for this step." },
    ],
    proTip: "The more charred the skin, the smokier the bharta. Don't rush this step.",
  },
  {
    id: 67, title: "Kadai Paneer", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=700",
    readyInMinutes: 35, servings: 4, difficulty: "Medium",
    tags: ["kadai paneer", "bell pepper", "restaurant style", "punjabi paneer"],
    description: "Paneer and bell peppers cooked in a robust tomato-based gravy with freshly ground kadai masala. A restaurant staple that's easy to make at home.",
    ingredients: ["paneer", "bell pepper", "onion", "tomato", "garlic", "ginger", "cumin", "coriander powder", "garam masala"],
    missingIngredients: ["kashmiri chili", "dried fenugreek"],
    steps: [
      { step: 1, title: "Make kadai masala", instruction: "Dry roast 2 tbsp coriander seeds, 1 tsp cumin seeds, 3 dried red chillies, ½ tsp black pepper until fragrant. Cool and grind coarsely." },
      { step: 2, title: "Build the gravy", instruction: "Cook onion paste in oil until golden. Add ginger-garlic paste, then blended tomato puree. Add half the kadai masala. Cook until oil separates." },
      { step: 3, title: "Add paneer and peppers", instruction: "Add cubed paneer and sliced bell peppers. Cook 5 mins — keep peppers slightly crunchy. Add remaining kadai masala, kasuri methi and cream. Simmer 3 mins. Garnish with julienned ginger.", tip: "Don't cook bell peppers until fully soft — some crunch is essential to this dish's character." },
    ],
    proTip: "Freshly grinding the kadai masala just before cooking makes a huge difference to the aroma.",
  },
  {
    id: 68, title: "Dum Aloo", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=700",
    readyInMinutes: 45, servings: 4, difficulty: "Medium",
    tags: ["dum aloo", "potato curry", "kashmiri", "vegetarian"],
    description: "Baby potatoes slow-cooked under steam (dum) in a fragrant yogurt-based sauce. A Kashmiri classic that transforms humble potatoes into something extraordinary.",
    ingredients: ["potato", "yogurt", "onion", "garlic", "ginger", "cumin", "turmeric", "kashmiri chili", "garam masala"],
    missingIngredients: ["fennel powder", "dry ginger powder"],
    steps: [
      { step: 1, title: "Fry the potatoes", instruction: "Boil 500g baby potatoes until just tender. Prick all over with a fork. Deep fry or shallow fry in oil until golden and slightly crispy on the outside." },
      { step: 2, title: "Make yogurt sauce", instruction: "Whisk 1 cup yogurt with Kashmiri chilli powder, fennel powder, dry ginger powder and salt. In a separate pan, fry sliced onions until deep golden. Add the yogurt mixture and cook, stirring constantly, until oil separates." },
      { step: 3, title: "Dum cook", instruction: "Add potatoes to the gravy. Cover tightly and cook on lowest heat for 15 mins. The potatoes absorb the sauce. Finish with garam masala and fresh mint.", tip: "Seal the lid with dough or a tight foil to trap the steam — this is the 'dum' technique." },
    ],
    proTip: "Pricking the potatoes helps the sauce penetrate deep inside, flavouring every bite.",
  },
  {
    id: 69, title: "Keema Matar", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1574653853027-5382a3d23a15?w=700",
    readyInMinutes: 35, servings: 4, difficulty: "Easy",
    tags: ["keema matar", "minced meat", "peas", "quick curry", "north indian"],
    description: "Spiced minced lamb or beef with sweet green peas — a humble, hearty Indian classic that's quick, cheap and deeply satisfying.",
    ingredients: ["ground beef", "peas", "onion", "tomato", "garlic", "ginger", "cumin", "garam masala", "turmeric"],
    missingIngredients: ["coriander powder"],
    steps: [
      { step: 1, title: "Brown the mince", instruction: "Heat 2 tbsp oil. Add sliced onions and cook 8 mins until golden. Add 1 tbsp ginger-garlic paste. Add 500g minced meat and cook on high heat, breaking it up, until all moisture evaporates and meat is browned, about 10 mins." },
      { step: 2, title: "Add spices and tomato", instruction: "Add chopped tomatoes and all dry spices. Cook until tomatoes break down and oil surfaces. Season with salt." },
      { step: 3, title: "Add peas and simmer", instruction: "Add 1 cup green peas. Add ¼ cup water if needed. Cook 8 mins until peas are tender. Finish with garam masala and chopped cilantro. Serve with warm roti.", tip: "Cook the mince until completely dry before adding spices — wet mince steams instead of frying and tastes bland." },
    ],
    proTip: "A squeeze of lemon juice at the end brightens the flavour of the whole dish.",
  },
  {
    id: 70, title: "Saag (Mustard Greens)", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=700",
    readyInMinutes: 50, servings: 4, difficulty: "Medium",
    tags: ["saag", "sarson ka saag", "mustard greens", "punjabi", "winter"],
    description: "Punjab's iconic winter dish — slow-cooked mustard greens with spinach, finished with a generous tadka of ghee and garlic. Served with makki di roti.",
    ingredients: ["spinach", "garlic", "ginger", "onion", "ghee", "cumin", "turmeric", "butter"],
    missingIngredients: ["mustard greens", "cornmeal", "makki flour"],
    steps: [
      { step: 1, title: "Boil the greens", instruction: "Wash and roughly chop 500g mustard greens and 250g spinach. Boil in a little water with ½ tsp turmeric, chopped ginger and green chillies for 20 mins until very soft. Cool and blend to a coarse puree." },
      { step: 2, title: "Cook the saag", instruction: "Heat ghee in a pan. Cook chopped onion until golden. Add the blended greens, 2 tbsp maize flour (cornmeal) to thicken, salt and a generous pinch of sugar. Stir and cook 15 mins on low heat." },
      { step: 3, title: "Make the tadka", instruction: "Heat 2 tbsp ghee until very hot. Add sliced garlic and cook until golden and crispy. Pour this sizzling garlic-ghee over the saag. Top with a large knob of butter and serve.", tip: "The maize flour thickens the saag authentically — don't skip it." },
    ],
    proTip: "Traditionally cooked for hours in a clay pot. The longer you cook it, the richer it gets.",
  },
  {
    id: 71, title: "Malai Kofta", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=700",
    readyInMinutes: 60, servings: 4, difficulty: "Hard",
    tags: ["malai kofta", "dumplings", "restaurant style", "celebration"],
    description: "Soft, creamy paneer and potato dumplings in a rich, mildly spiced tomato-cream sauce. The ultimate Indian celebration dish.",
    ingredients: ["paneer", "potato", "onion", "tomato", "garlic", "ginger", "heavy cream", "cashews", "garam masala"],
    missingIngredients: ["khoya", "raisins", "cardamom"],
    steps: [
      { step: 1, title: "Make the koftas", instruction: "Mash 200g paneer and 2 boiled potatoes together. Add 2 tbsp cornflour, salt, cardamom powder and a few raisins as stuffing. Shape into smooth balls and deep fry until golden." },
      { step: 2, title: "Make the sauce", instruction: "Blend soaked cashews, onion, tomatoes and ginger-garlic into a smooth paste. Cook in oil until deeply coloured. Add spices and cook until thick." },
      { step: 3, title: "Combine", instruction: "Add cream to the sauce, simmer 5 mins. Add koftas just before serving — they become soggy if left in the gravy. Pour sauce around or gently over koftas at the table.", tip: "Add koftas to the gravy only right before serving to keep them from absorbing too much sauce and falling apart." },
    ],
    proTip: "Fry koftas at medium heat — too hot and they brown before cooking through, too cool and they absorb oil.",
  },
  {
    id: 72, title: "Chicken Handi", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=700",
    readyInMinutes: 50, servings: 4, difficulty: "Medium",
    tags: ["chicken handi", "clay pot", "restaurant", "creamy chicken"],
    description: "Tender chicken slow-cooked in a handi (clay pot) with aromatic spices, yogurt and cream. Rich, fragrant and deeply satisfying.",
    ingredients: ["chicken", "yogurt", "onion", "garlic", "ginger", "heavy cream", "garam masala", "cardamom"],
    missingIngredients: ["mace", "rose water"],
    steps: [
      { step: 1, title: "Marinate", instruction: "Mix chicken with yogurt, ginger-garlic paste, chilli powder, turmeric and salt. Marinate 2 hours or overnight." },
      { step: 2, title: "Cook the base", instruction: "In a heavy pot, fry onion paste in oil until golden. Add marinated chicken. Cook on high 5 mins to seal. Add tomato puree and spices." },
      { step: 3, title: "Handi style finish", instruction: "Add cream and a pinch of saffron in warm milk. Cover and cook on lowest heat 25 mins. The chicken steams in its own juices. Finish with mace, cardamom and rose water for authenticity.", tip: "Cooking covered on lowest heat traps steam and makes the chicken extremely tender." },
    ],
    proTip: "The longer the marinade, the more tender and flavourful the chicken.",
  },
  {
    id: 73, title: "Dhokla", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=700",
    readyInMinutes: 40, servings: 6, difficulty: "Medium",
    tags: ["dhokla", "gujarati", "steamed snack", "healthy snack", "fermented"],
    description: "Gujarat's famous steamed fermented chickpea flour cake — soft, spongy, tangy and topped with a mustard-sesame tempering. Light, healthy and delicious.",
    ingredients: ["chickpeas", "yogurt", "ginger", "lemon", "cumin", "mustard seeds", "cilantro"],
    missingIngredients: ["besan", "fruit salt", "curry leaves"],
    steps: [
      { step: 1, title: "Make the batter", instruction: "Mix 2 cups besan (chickpea flour) with 1 cup yogurt, 1 tsp ginger paste, 1 tbsp lemon juice, turmeric, and salt. Add water to make a smooth, thick but pourable batter. Rest 30 mins." },
      { step: 2, title: "Steam", instruction: "Add 1 tsp fruit salt (Eno) to the batter, mix gently — it will foam. Immediately pour into a greased plate. Steam in a steamer for 20 mins until a toothpick comes out clean." },
      { step: 3, title: "Add the tempering", instruction: "Let dhokla cool slightly, cut into squares. Heat 2 tbsp oil, add mustard seeds, curry leaves, green chilli, 1 tbsp sugar dissolved in 2 tbsp water. Pour over dhokla. Garnish with coconut and cilantro.", tip: "Add the Eno and pour immediately — the moment you see foam, the leavening is active and must go into the steamer." },
    ],
    proTip: "The sugar-water tempering is what makes dhokla moist and gives it the characteristic sweet-savoury balance.",
  },
  {
    id: 74, title: "Poha (Flattened Rice)", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=700",
    readyInMinutes: 20, servings: 2, difficulty: "Easy",
    tags: ["poha", "breakfast", "flattened rice", "quick", "maharashtrian"],
    description: "Maharashtra's beloved breakfast — lightly spiced flattened rice with onion, peas and mustard seeds. Ready in 20 minutes, light yet filling.",
    ingredients: ["onion", "peas", "mustard seeds", "cumin", "turmeric", "lemon", "cilantro", "peanuts"],
    missingIngredients: ["poha", "curry leaves"],
    steps: [
      { step: 1, title: "Prep the poha", instruction: "Rinse 2 cups thick poha in a colander under running water for 30 seconds. Drain. Sprinkle with turmeric and salt, toss gently. Let it sit — it will soften on its own in 5 mins." },
      { step: 2, title: "Temper", instruction: "Heat 2 tbsp oil. Add mustard seeds — wait for them to pop. Add curry leaves, green chilli, roasted peanuts, and diced onion. Cook 4 mins until onion softens." },
      { step: 3, title: "Combine", instruction: "Add peas and cook 2 mins. Add the soaked poha and toss gently on low heat for 2 mins. Squeeze lemon juice, garnish with cilantro and sev (crunchy chickpea noodles).", tip: "Don't soak poha for too long — it should be soft but hold its shape, not mushy." },
    ],
    proTip: "A squeeze of lemon and fresh cilantro right before serving is essential for the bright, fresh flavour.",
  },
  {
    id: 75, title: "Upma", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=700",
    readyInMinutes: 25, servings: 3, difficulty: "Easy",
    tags: ["upma", "semolina", "south indian breakfast", "quick", "healthy"],
    description: "South India's staple breakfast — semolina cooked with vegetables, mustard seeds and curry leaves. Simple, nutritious and deeply comforting.",
    ingredients: ["onion", "tomato", "peas", "carrot", "mustard seeds", "cumin", "ginger", "ghee"],
    missingIngredients: ["semolina", "urad dal", "curry leaves"],
    steps: [
      { step: 1, title: "Roast semolina", instruction: "Dry roast 1 cup semolina in a pan on medium heat, stirring continuously, until it turns slightly golden and aromatic, about 4 mins. Set aside." },
      { step: 2, title: "Temper and cook vegetables", instruction: "Heat 2 tbsp ghee. Add mustard seeds, urad dal, curry leaves, dried red chilli. Add grated ginger and onions. Cook 5 mins. Add mixed vegetables and salt." },
      { step: 3, title: "Cook the upma", instruction: "Add 2.5 cups boiling water — it will splatter. Stir immediately. Add roasted semolina gradually while stirring to prevent lumps. Cook 4 mins on low heat, stirring, until upma leaves the sides of the pan. Serve with coconut chutney.", tip: "Use boiling water, not cold — it prevents lumps from forming." },
    ],
    proTip: "Roasting the semolina before cooking prevents it from becoming sticky and gives nutty depth.",
  },
  {
    id: 76, title: "Pav Bhaji (Mumbai Style)", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=700",
    readyInMinutes: 45, servings: 4, difficulty: "Easy",
    tags: ["pav bhaji", "street food", "mumbai", "butter", "mashed vegetables"],
    description: "Mumbai's most iconic street food — a thick, buttery mash of vegetables cooked with pav bhaji masala, served with toasted buttered dinner rolls.",
    ingredients: ["potato", "peas", "cauliflower", "bell pepper", "tomato", "onion", "butter", "garlic"],
    missingIngredients: ["pav bhaji masala", "pav bread"],
    steps: [
      { step: 1, title: "Boil and mash vegetables", instruction: "Boil potatoes, cauliflower and peas until very soft. Mash roughly — the bhaji should have some texture." },
      { step: 2, title: "Cook the bhaji", instruction: "Heat 3 tbsp butter in a flat pan. Cook onions until golden. Add ginger-garlic paste, bell peppers, tomatoes. Cook until soft. Add mashed vegetables and 2 tbsp pav bhaji masala. Mix and mash everything together. Cook 10 mins, adding water for consistency. Finish with a large knob of butter." },
      { step: 3, title: "Toast the pav", instruction: "Slice dinner rolls (pav) in half. Spread generous butter on cut sides. Toast on the flat pan until golden. Serve bhaji topped with raw onion, lemon and cilantro alongside the buttered pav.", tip: "Press the pav onto the pan in the leftover bhaji for the best buttery, masala-infused toast." },
    ],
    proTip: "The butter quantity is not a mistake — Mumbai pav bhaji is gloriously rich and buttery.",
  },
  {
    id: 77, title: "Rasam", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=700",
    readyInMinutes: 25, servings: 4, difficulty: "Easy",
    tags: ["rasam", "south indian soup", "pepper", "digestive", "comfort food"],
    description: "South India's beloved thin peppery soup — tangy, spicy and deeply warming. Sipped as a digestive, served over rice, or drunk when sick.",
    ingredients: ["tomato", "garlic", "cumin", "black pepper", "turmeric", "mustard seeds", "cilantro"],
    missingIngredients: ["tamarind", "toor dal", "curry leaves", "rasam powder"],
    steps: [
      { step: 1, title: "Make tamarind water", instruction: "Soak 1 tbsp tamarind in 2 cups warm water for 10 mins. Squeeze and strain to extract the liquid. Discard pulp." },
      { step: 2, title: "Cook the rasam", instruction: "Heat tamarind water with 2 chopped tomatoes, ½ tsp turmeric, salt and rasam powder. Simmer 10 mins. Add 2 cups thinned dal water (or plain water). Simmer 5 mins." },
      { step: 3, title: "Temper", instruction: "Heat 1 tsp ghee. Add mustard seeds, cumin, dried red chilli, curry leaves and crushed garlic. When fragrant, pour into rasam. Garnish with cilantro and a generous crack of black pepper.", tip: "The tadka must go in right before serving to keep the aromatics fresh and pungent." },
    ],
    proTip: "Rasam should be watery and thin — it's a broth, not a curry. If it's thick, add more water.",
  },
  {
    id: 78, title: "Curd Rice (Thayir Sadam)", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1596797038530-2c107229654b?w=700",
    readyInMinutes: 20, servings: 3, difficulty: "Easy",
    tags: ["curd rice", "thayir sadam", "south indian", "comfort", "cooling"],
    description: "Tamil Nadu's ultimate comfort food — soft cooked rice mixed with yogurt and tempered with mustard seeds, curry leaves and green chilli. Cooling and soothing.",
    ingredients: ["rice", "yogurt", "milk", "ginger", "mustard seeds", "cilantro"],
    missingIngredients: ["urad dal", "curry leaves", "dried red chilli"],
    steps: [
      { step: 1, title: "Prepare rice", instruction: "Cook 1 cup rice until very soft (more water than usual — about 1:3 ratio). While still warm, mash slightly with the back of a spoon. Let cool to room temperature." },
      { step: 2, title: "Mix with curd", instruction: "Mix cooled rice with 1.5 cups yogurt and ¼ cup milk. The milk prevents the yogurt from turning too sour. Add salt, mix well. Consistency should be soft and flowing." },
      { step: 3, title: "Temper", instruction: "Heat 1 tbsp oil. Add mustard seeds, urad dal, dried red chilli, curry leaves and finely grated ginger. Pour over the curd rice and mix. Garnish with pomegranate seeds and cilantro.", tip: "Rest for 10 mins after making — the rice absorbs the yogurt and flavours meld beautifully." },
    ],
    proTip: "Serving slightly chilled is traditional and particularly refreshing in summer.",
  },
  {
    id: 79, title: "Idli with Sambar", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=700",
    readyInMinutes: 30, servings: 4, difficulty: "Easy",
    tags: ["idli", "sambar", "south indian", "healthy", "steamed", "breakfast"],
    description: "South India's most iconic breakfast — fluffy steamed rice cakes with a tangy, spiced lentil and vegetable soup. Light, nutritious and beloved across India.",
    ingredients: ["lentils", "onion", "tomato", "carrot", "mustard seeds", "cumin", "turmeric", "tamarind"],
    missingIngredients: ["idli batter", "sambar powder", "curry leaves"],
    steps: [
      { step: 1, title: "Steam idlis", instruction: "Use ready-made idli batter (or fermented overnight). Fill greased idli moulds. Steam 12–15 mins until a toothpick comes out clean. Rest 2 mins before removing." },
      { step: 2, title: "Make sambar", instruction: "Boil ½ cup toor dal until mushy. In another pan, temper mustard seeds, curry leaves in oil. Add onion, tomato, carrot, drumstick. Add tamarind water and sambar powder. Simmer 15 mins. Add cooked dal and simmer 5 mins more." },
      { step: 3, title: "Serve", instruction: "Serve hot idlis alongside sambar and coconut chutney. Dip idlis into sambar for the traditional experience.", tip: "Idli mould must be well-greased — use oil or ghee to prevent sticking." },
    ],
    proTip: "Idlis are done when they start to pull away from the mould edges slightly.",
  },
  {
    id: 80, title: "Dosa (Plain)", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=700",
    readyInMinutes: 20, servings: 3, difficulty: "Medium",
    tags: ["dosa", "south indian", "crispy crepe", "breakfast", "gluten free"],
    description: "South India's famous thin, crispy fermented rice crepe. The batter must be fermented overnight, but the actual cooking is a satisfying skill to master.",
    ingredients: ["rice", "lentils", "salt"],
    missingIngredients: ["dosa batter", "ghee"],
    steps: [
      { step: 1, title: "Prep the pan", instruction: "Heat a cast iron or non-stick pan until very hot. Sprinkle a few drops of water — they should sizzle and evaporate immediately. Rub the pan with half an onion dipped in oil to season it." },
      { step: 2, title: "Spread the batter", instruction: "Pour a ladle of dosa batter in the centre. Immediately spread it in concentric circles using the bottom of the ladle, moving outward. Make it thin. Drizzle a tsp of oil around the edges." },
      { step: 3, title: "Cook until crispy", instruction: "Cook on medium-high heat until edges turn golden and the dosa lifts easily, about 2 mins. Fold in half or roll and serve with coconut chutney and sambar.", tip: "Only spread on one side — never flip a dosa. The steam cooks the top while the bottom crisps." },
    ],
    proTip: "The first dosa often sticks — it's the pan calibration dosa. The second one will be perfect.",
  },
  {
    id: 81, title: "Chicken 65", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=700",
    readyInMinutes: 35, servings: 4, difficulty: "Medium",
    tags: ["chicken 65", "fried chicken", "south indian", "starter", "crispy"],
    description: "Chennai's iconic deep-fried chicken — marinated in yogurt and spices, fried crispy then tossed in a tangy curry leaf tempering. Addictively good.",
    ingredients: ["chicken", "yogurt", "garlic", "ginger", "lemon", "cumin", "coriander powder", "turmeric"],
    missingIngredients: ["curry leaves", "kashmiri chili", "corn flour"],
    steps: [
      { step: 1, title: "Marinate", instruction: "Mix 500g boneless chicken pieces with yogurt, ginger-garlic paste, Kashmiri chilli powder, cumin powder, lemon juice, cornflour and salt. Marinate 30 mins." },
      { step: 2, title: "Deep fry", instruction: "Heat oil to 175°C. Fry chicken in batches until crispy golden, about 4–5 mins. Don't crowd the pan. Drain on paper towel." },
      { step: 3, title: "Toss and serve", instruction: "In a pan, heat 1 tbsp oil. Add curry leaves (they will splutter), green chillies, a pinch of food colour if using. Add fried chicken and toss 1 min. Squeeze lemon and serve immediately.", tip: "Frying in batches keeps the oil temperature stable — crowded pan = soggy chicken." },
    ],
    proTip: "The curry leaf toss at the end is what makes Chicken 65 taste authentic — don't skip it.",
  },
  {
    id: 82, title: "Vada Pav", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=700",
    readyInMinutes: 40, servings: 4, difficulty: "Medium",
    tags: ["vada pav", "mumbai street food", "potato fritter", "spicy"],
    description: "Mumbai's favourite street food — a spiced potato fritter in a crispy chickpea batter, stuffed inside a bread roll with three chutneys. India's best burger.",
    ingredients: ["potato", "garlic", "ginger", "mustard seeds", "turmeric", "lemon", "cilantro"],
    missingIngredients: ["besan", "pav bread", "curry leaves"],
    steps: [
      { step: 1, title: "Make the vada filling", instruction: "Boil and mash 4 potatoes. Temper mustard seeds and curry leaves in oil. Add grated ginger-garlic, turmeric and mashed potato. Mix well. Add lemon juice and cilantro. Cool and shape into balls." },
      { step: 2, title: "Make batter and fry", instruction: "Mix besan with turmeric, chilli powder, salt and water to thick batter. Dip potato balls in batter and deep fry until golden and crispy, about 3 mins." },
      { step: 3, title: "Assemble", instruction: "Slice pav rolls but don't fully separate. Spread green garlic chutney on one side, sweet tamarind chutney on the other. Place hot vada inside. Press together. Eat immediately.", tip: "Both chutneys together are essential — the heat, sweetness and tang are what make vada pav legendary." },
    ],
    proTip: "The garlic chutney (dry coconut, garlic, chilli, salt) is the heart of vada pav. Make extra.",
  },
  {
    id: 83, title: "Aloo Tikki", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1485963631004-f2f00b1d6606?w=700",
    readyInMinutes: 30, servings: 4, difficulty: "Easy",
    tags: ["aloo tikki", "potato patty", "street food", "chaat", "crispy"],
    description: "Crispy-on-the-outside, soft-on-the-inside spiced potato patties — the base of countless Indian chaat dishes and irresistible on their own.",
    ingredients: ["potato", "cumin", "coriander powder", "ginger", "lemon", "cilantro", "bread crumbs"],
    missingIngredients: ["amchur powder", "chaat masala"],
    steps: [
      { step: 1, title: "Make the mixture", instruction: "Boil and completely cool 4 potatoes. Cold potatoes are important — warm ones absorb too much oil. Mash thoroughly. Mix with grated ginger, cumin, coriander powder, amchur, green chilli, cilantro and salt." },
      { step: 2, title: "Shape and coat", instruction: "Divide into equal balls. Flatten into patties. Coat lightly with breadcrumbs or poha (beaten rice) for extra crunch." },
      { step: 3, title: "Pan fry", instruction: "Heat a flat pan with 2 tbsp oil on medium-high. Cook tikkis 3–4 mins each side without moving until deeply golden and crispy. Resist the urge to press them down — let them develop a crust naturally.", tip: "Don't flip too early — the tikki needs time to form a crust, otherwise it will stick and break." },
    ],
    proTip: "Using cold cooked potatoes (not warm) makes tikkis that hold shape and don't absorb excess oil.",
  },
  {
    id: 84, title: "Lassi (Sweet & Salted)", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=700",
    readyInMinutes: 5, servings: 2, difficulty: "Easy",
    tags: ["lassi", "yogurt drink", "punjabi", "summer", "sweet lassi"],
    description: "Punjab's cooling yogurt drink — thick, creamy and refreshing. Made sweet with sugar and cardamom or salted with cumin. Perfect for any time of day.",
    ingredients: ["yogurt", "milk", "sugar", "cardamom"],
    missingIngredients: ["rose water"],
    steps: [
      { step: 1, title: "Sweet lassi", instruction: "Blend 2 cups full-fat yogurt, ½ cup cold milk, 3 tbsp sugar, a pinch of cardamom powder and a few drops of rose water for 1 minute until frothy." },
      { step: 2, title: "Salted lassi", instruction: "For the salted version: blend yogurt, milk, ½ tsp roasted cumin powder, black salt and a pinch of chilli powder." },
      { step: 3, title: "Serve", instruction: "Pour into tall glasses over ice. Top sweet lassi with clotted cream (malai). Sprinkle cardamom on top. Serve immediately.", tip: "Blend vigorously for a frothy top — the foam is part of the authentic experience." },
    ],
    proTip: "Use full-fat yogurt and whole milk for the authentic rich, creamy Punjab lassi experience.",
  },
  {
    id: 85, title: "Paneer Bhurji", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=700",
    readyInMinutes: 20, servings: 3, difficulty: "Easy",
    tags: ["paneer bhurji", "scrambled paneer", "quick", "breakfast", "protein"],
    description: "Crumbled paneer scrambled with onion, tomato and spices — the vegetarian version of egg bhurji. Quick, protein-rich and incredibly satisfying.",
    ingredients: ["paneer", "onion", "tomato", "garlic", "ginger", "cumin", "turmeric", "cilantro", "bell pepper"],
    missingIngredients: ["kasuri methi"],
    steps: [
      { step: 1, title: "Sauté the base", instruction: "Heat 1 tbsp oil. Add cumin seeds, then diced onion and green chilli. Cook 4 mins. Add ginger-garlic paste and bell pepper, cook 3 mins." },
      { step: 2, title: "Add tomato and spices", instruction: "Add chopped tomato, turmeric, chilli powder, coriander powder, salt. Cook until tomatoes break down, about 5 mins." },
      { step: 3, title: "Scramble the paneer", instruction: "Crumble paneer directly into the pan. Toss and cook 3 mins on medium-high heat. Add a pinch of garam masala and crushed kasuri methi. Garnish with cilantro. Serve with roti or toast.", tip: "Crumble paneer by hand into uneven pieces — irregular pieces hold the masala better than uniform cubes." },
    ],
    proTip: "Add a squeeze of lemon juice right before serving — it brightens the paneer's flavour significantly.",
  },
  {
    id: 86, title: "Chicken Xacuti", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1574653853027-5382a3d23a15?w=700",
    readyInMinutes: 55, servings: 4, difficulty: "Hard",
    tags: ["chicken xacuti", "goan", "coconut spice", "complex"],
    description: "Goa's most complex and layered chicken curry — toasted coconut, poppy seeds and a long list of whole spices create a uniquely aromatic gravy.",
    ingredients: ["chicken", "onion", "garlic", "ginger", "coconut milk", "cumin", "coriander powder", "turmeric"],
    missingIngredients: ["dried red chillies", "poppy seeds", "star anise", "stone flower"],
    steps: [
      { step: 1, title: "Make xacuti paste", instruction: "Dry roast until fragrant: grated coconut, poppy seeds, coriander seeds, cumin, dried chillies, cloves, peppercorns, star anise. Blend with a little water to a smooth paste." },
      { step: 2, title: "Build the curry", instruction: "Fry onion in oil until golden. Add ginger-garlic paste. Add the xacuti paste and cook 10 mins stirring frequently until oil surfaces." },
      { step: 3, title: "Cook the chicken", instruction: "Add chicken pieces. Coat with the masala. Add 1 cup water or thin coconut milk. Simmer covered 30 mins. The gravy should be thick and dark. Finish with tamarind and a touch of jaggery for balance.", tip: "Dry roasting the spices is the most critical step — this activates all their essential oils and is what makes xacuti uniquely fragrant." },
    ],
    proTip: "Stone flower (dagad phool) is what gives xacuti its distinctive forest-like aroma. Worth seeking out.",
  },
  {
    id: 87, title: "Bread Pakoda", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1485963631004-f2f00b1d6606?w=700",
    readyInMinutes: 20, servings: 4, difficulty: "Easy",
    tags: ["bread pakoda", "fritter", "street food", "snack", "monsoon food"],
    description: "The ultimate Indian monsoon snack — bread stuffed with spiced potato, dipped in chickpea batter and fried until crispy. Best with chai.",
    ingredients: ["bread", "potato", "cumin", "turmeric", "ginger", "cilantro", "lemon"],
    missingIngredients: ["besan", "ajwain", "green chutney"],
    steps: [
      { step: 1, title: "Make potato filling", instruction: "Boil and mash 2 potatoes. Mix with cumin, green chilli, grated ginger, cilantro, lemon juice, salt and amchur powder." },
      { step: 2, title: "Stuff the bread", instruction: "Spread green chutney on one slice of bread. Spread potato filling on the other. Press together to make a sandwich. Cut diagonally." },
      { step: 3, title: "Batter and fry", instruction: "Make a thick batter with besan, turmeric, chilli powder, ajwain (carom seeds) and water. Dip stuffed bread in batter, coating all sides. Deep fry until golden and crispy. Serve immediately with chutney and ketchup.", tip: "Fry at medium heat — the bread must heat through and the batter must cook properly without burning." },
    ],
    proTip: "Eat immediately — bread pakodas lose their crunch within minutes of frying.",
  },
  {
    id: 88, title: "Chicken Cafreal", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=700",
    readyInMinutes: 50, servings: 4, difficulty: "Medium",
    tags: ["chicken cafreal", "goan", "green masala", "grilled", "portuguese"],
    description: "Goa's vibrant green chicken — marinated in a bold herb and spice paste, then pan-fried until dark and charred at the edges. A Goan Indo-Portuguese classic.",
    ingredients: ["chicken", "garlic", "ginger", "cilantro", "lemon", "cumin", "black pepper", "vegetable oil"],
    missingIngredients: ["kashmiri chili", "star anise", "cinnamon"],
    steps: [
      { step: 1, title: "Make cafreal masala", instruction: "Blend to smooth paste: 1 cup cilantro, 6 garlic cloves, 1 inch ginger, 4 green chillies, 1 tsp cumin, ½ tsp black pepper, 1 tsp vinegar, juice of 1 lemon, salt." },
      { step: 2, title: "Marinate", instruction: "Make deep slashes in chicken pieces. Apply cafreal paste, pressing into the cuts. Marinate minimum 2 hours, preferably overnight in the fridge." },
      { step: 3, title: "Pan fry", instruction: "Heat 3 tbsp oil in a flat pan on medium-high. Cook chicken pieces, pressing down occasionally, until charred on both sides and cooked through, about 8 mins per side. The green paste will char and darken — that's the flavour.", tip: "Don't be alarmed by the blackening — the charred bits are where all the flavour is." },
    ],
    proTip: "Overnight marinating makes a dramatic difference — the paste penetrates deep into the chicken.",
  },
  {
    id: 89, title: "Dal Makhani", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=700",
    readyInMinutes: 90, servings: 6, difficulty: "Medium",
    tags: ["dal makhani", "black lentil", "slow cooked", "restaurant", "butter"],
    description: "The king of all dals — black lentils slow-cooked overnight with butter, cream and whole spices until silky smooth and deeply flavourful. A true restaurant classic.",
    ingredients: ["lentils", "butter", "heavy cream", "onion", "tomato", "garlic", "ginger", "garam masala", "cumin"],
    missingIngredients: ["black lentils", "kidney beans"],
    steps: [
      { step: 1, title: "Slow cook the lentils", instruction: "Soak 1 cup whole black lentils (urad) and ¼ cup kidney beans overnight. Pressure cook 45 mins with salt and a knob of butter until lentils are completely soft and starting to break down." },
      { step: 2, title: "Make the makhani base", instruction: "Char 4 tomatoes over flame or broil in oven. Blend with onion, ginger-garlic. Cook this paste in 4 tbsp butter until deeply coloured and thick, about 20 mins." },
      { step: 3, title: "Combine and simmer", instruction: "Add cooked lentils to the tomato-butter base. Simmer on the lowest possible heat for 30+ mins, stirring often. Add cream and garam masala. The dal should be thick, velvety and buttery. Finish with a generous dollop of butter.", tip: "The secret to restaurant-quality dal makhani is time — the longer it simmers, the creamier it becomes." },
    ],
    proTip: "Traditional dal makhani simmers for 8+ hours on a tandoor. Even 2–3 hours on your stovetop makes a dramatic difference.",
  },
  {
    id: 90, title: "Murgh Musallam", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1574653853027-5382a3d23a15?w=700",
    readyInMinutes: 90, servings: 6, difficulty: "Hard",
    tags: ["murgh musallam", "whole chicken", "mughal", "celebration", "stuffed"],
    description: "The Mughal imperial dish — a whole chicken marinated in a saffron-cream paste, stuffed with spiced egg and meat, then slow-roasted in an aromatic gravy.",
    ingredients: ["chicken", "yogurt", "onion", "garlic", "ginger", "heavy cream", "garam masala", "cashews", "eggs"],
    missingIngredients: ["saffron", "mace", "kewra water"],
    steps: [
      { step: 1, title: "Marinate whole chicken", instruction: "Score a whole chicken all over. Marinate in a paste of yogurt, ginger-garlic, Kashmiri chilli, garam masala and saffron milk for 4 hours." },
      { step: 2, title: "Stuff and seal", instruction: "Make a filling with hard-boiled eggs, fried minced meat, fried onion and garam masala. Stuff inside the chicken cavity. Truss the chicken to hold shape." },
      { step: 3, title: "Cook in gravy", instruction: "Brown the whole chicken in ghee on all sides. Build a cashew-onion gravy. Place chicken in gravy, cover and cook 45 mins basting often. Finish in oven at 200°C for 15 mins to crisp the skin. Garnish with saffron cream and kewra water.", tip: "Basting frequently is crucial to keep the chicken moist and to develop a lacquered, flavourful crust." },
    ],
    proTip: "This is a show-stopping party dish — worth the effort for special occasions.",
  },
  {
    id: 91, title: "Misal Pav", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=700",
    readyInMinutes: 40, servings: 4, difficulty: "Medium",
    tags: ["misal pav", "maharashtrian", "spicy", "street food", "sprouted lentils"],
    description: "Maharashtra's fiery, crunchy street food — spicy sprouted moth bean curry topped with crunchy farsan, raw onion and lemon, served with buttered rolls.",
    ingredients: ["onion", "tomato", "garlic", "ginger", "cumin", "turmeric", "coriander powder", "coconut"],
    missingIngredients: ["sprouted moth beans", "farsan", "pav bread"],
    steps: [
      { step: 1, title: "Cook the usal", instruction: "Sprout moth beans overnight. Cook them soft in water with salt and turmeric. In a pan, make masala with onion, tomato, coconut paste, ginger-garlic and Kolhapuri masala. Add sprouted beans and simmer 15 mins. The gravy should be thin and spicy." },
      { step: 2, title: "Make kat (thin spicy broth)", instruction: "The thin spicy liquid floating on top of the usal is the 'kat'. Add extra water and more masala to make it thinner and hotter. This is poured over the top." },
      { step: 3, title: "Assemble misal", instruction: "In a bowl, place usal. Pour kat over it. Top generously with farsan (crunchy mix), diced onion, chopped cilantro, lemon juice. Serve with buttered pav. Eat while the farsan is still crunchy.", tip: "The farsan must be added right before eating — it loses its crunch quickly." },
    ],
    proTip: "The Pune and Kolhapur styles vary wildly in spice level. Kolhapuri misal is notoriously fiery.",
  },
  {
    id: 92, title: "Shahi Paneer", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=700",
    readyInMinutes: 40, servings: 4, difficulty: "Medium",
    tags: ["shahi paneer", "mughlai", "rich", "cream", "nuts"],
    description: "Mughal-inspired royal paneer — soft paneer in a rich, mildly sweet cashew and onion gravy with cream and whole spices. Elegant and luxurious.",
    ingredients: ["paneer", "onion", "heavy cream", "cashews", "garlic", "ginger", "cardamom", "garam masala"],
    missingIngredients: ["saffron", "rose water", "mace"],
    steps: [
      { step: 1, title: "Make the royal base", instruction: "Boil onion, cashews, garlic and ginger in ½ cup water until soft. Cool and blend to a very smooth paste." },
      { step: 2, title: "Cook the sauce", instruction: "Fry the paste in ghee over medium heat, stirring constantly, until it turns a deep golden colour, about 12 mins. Add whole spices (cardamom, mace, bay leaf), white pepper and salt." },
      { step: 3, title: "Finish with paneer and cream", instruction: "Add cream, saffron milk and a touch of sugar. Simmer 5 mins. Gently fold in paneer cubes. Cook 3 mins. Finish with rose water and a garnish of slivered almonds and cream swirled on top.", tip: "Don't skip the browning step — it transforms a raw paste into a deeply flavourful, complex sauce." },
    ],
    proTip: "Use warm saffron milk rather than dry saffron — it distributes the colour and aroma more evenly.",
  },
  {
    id: 93, title: "Aloo Chaat", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1485963631004-f2f00b1d6606?w=700",
    readyInMinutes: 25, servings: 3, difficulty: "Easy",
    tags: ["aloo chaat", "potato snack", "street food", "tangy", "chaat"],
    description: "Delhi's favourite street snack — crispy fried potatoes tossed with tangy-sweet chutneys, yogurt, chaat masala and crunchy toppings. Explosion of flavours.",
    ingredients: ["potato", "yogurt", "lemon", "cumin", "cilantro", "onion"],
    missingIngredients: ["tamarind chutney", "mint chutney", "chaat masala", "sev"],
    steps: [
      { step: 1, title: "Fry the potatoes", instruction: "Cut potatoes into small cubes or wedges. Deep fry or air fry until golden and crispy. Season with salt immediately." },
      { step: 2, title: "Season with chaat masala", instruction: "While still hot, toss with chaat masala, roasted cumin powder, black salt and chilli powder." },
      { step: 3, title: "Assemble chaat", instruction: "Place potatoes in a bowl. Drizzle generously with whisked yogurt, tamarind chutney and green mint chutney. Top with chopped onion, tomato, cilantro and sev. Eat immediately before it gets soggy.", tip: "All the elements must be assembled right before eating — aloo chaat waits for no one." },
    ],
    proTip: "The holy trinity is chaat masala + tamarind chutney + green chutney — these three together create the authentic chaat flavour.",
  },
  {
    id: 94, title: "Nihari", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1574653853027-5382a3d23a15?w=700",
    readyInMinutes: 180, servings: 6, difficulty: "Hard",
    tags: ["nihari", "slow cooked", "mughal", "delhi", "lamb shank"],
    description: "Delhi and Lucknow's famous slow-cooked lamb shank stew — traditionally simmered overnight until the meat falls off the bone. Rich, unctuous and deeply spiced.",
    ingredients: ["onion", "garlic", "ginger", "ghee", "garam masala", "cumin", "coriander powder", "flour"],
    missingIngredients: ["lamb shanks", "nihari masala", "bone marrow"],
    steps: [
      { step: 1, title: "Start the slow cook", instruction: "Brown onions in generous ghee until deeply caramelised, 20 mins. Add lamb shanks and brown all sides. Add ginger-garlic paste, nihari masala, whole spices. Cover with water — ratio should be generous." },
      { step: 2, title: "Simmer for hours", instruction: "Cook on the lowest possible heat for 2.5–3 hours until lamb is pulling away from the bone. The broth should be deeply coloured and fragrant." },
      { step: 3, title: "Thicken and finish", instruction: "Mix 2 tbsp flour with water, add to nihari while stirring to thicken. Adjust salt. The consistency should be like a thin gravy — not too thick. Garnish with julienned ginger, fried onions, green chilli, cilantro and a squeeze of lemon.", tip: "This dish's soul is in long, patient cooking. There are no shortcuts." },
    ],
    proTip: "Nihari means 'morning' — traditionally eaten at dawn after simmering all night. Leftovers taste even better the next day.",
  },
  {
    id: 95, title: "Chicken Sukkha", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=700",
    readyInMinutes: 50, servings: 4, difficulty: "Medium",
    tags: ["chicken sukkha", "mangalore", "dry curry", "coastal", "coconut"],
    description: "Mangalore's famous dry chicken roast — coated in a thick, almost-dry coconut and spice masala. Intensely flavoured and perfect with rice and dal.",
    ingredients: ["chicken", "onion", "garlic", "ginger", "cumin", "coriander powder", "turmeric", "coconut"],
    missingIngredients: ["byadagi chillies", "curry leaves"],
    steps: [
      { step: 1, title: "Make the masala paste", instruction: "Grind 1 cup grated coconut, 6 dried Byadagi chillies, 2 tsp coriander seeds, 1 tsp cumin, 6 peppercorns, 3 garlic cloves and turmeric with a little water to a thick paste." },
      { step: 2, title: "Cook the chicken", instruction: "Sauté onion and curry leaves in oil until golden. Add ginger-garlic paste. Add chicken pieces, cook on high heat 5 mins. Add ground masala paste and mix to coat." },
      { step: 3, title: "Dry roast", instruction: "Cook on medium heat, stirring frequently. Add water in small splashes only to prevent burning. Cook until all water evaporates and the masala coats the chicken like a dry crust. The chicken should be almost dry, not saucy.", tip: "Stirring continuously prevents burning while the masala dries out around the chicken." },
    ],
    proTip: "The sukkha (dry) texture is its defining characteristic — resist adding too much water.",
  },
  {
    id: 96, title: "Pesarattu", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=700",
    readyInMinutes: 20, servings: 3, difficulty: "Easy",
    tags: ["pesarattu", "andhra", "moong dal crepe", "protein", "healthy breakfast"],
    description: "Andhra's protein-packed green moong dal crepe — crispy, earthy and deeply nutritious. Served with ginger chutney, it's one of India's healthiest breakfasts.",
    ingredients: ["lentils", "ginger", "cumin", "green chilli", "cilantro", "onion"],
    missingIngredients: ["whole moong dal"],
    steps: [
      { step: 1, title: "Soak and blend", instruction: "Soak 1 cup whole green moong dal in water for 6+ hours. Drain. Blend with ¼ cup water, grated ginger, green chillies, cumin and salt to a coarse batter — not completely smooth." },
      { step: 2, title: "Make the crepes", instruction: "Heat a flat pan over medium-high. Spread a ladle of batter in a circle. Sprinkle diced onion and cilantro. Drizzle oil around edges. Cook 2 mins until edges brown and crisp." },
      { step: 3, title: "Serve", instruction: "Fold and serve with allam pachadi (ginger-tamarind chutney). Eat immediately for maximum crunch.", tip: "The batter should be slightly coarse — the texture is part of what makes pesarattu unique." },
    ],
    proTip: "No fermentation needed — pesarattu batter is used fresh, making it ideal for breakfast without overnight prep.",
  },
  {
    id: 97, title: "Hyderabadi Haleem", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1574653853027-5382a3d23a15?w=700",
    readyInMinutes: 180, servings: 8, difficulty: "Hard",
    tags: ["haleem", "hyderabadi", "slow cooked", "wheat", "lamb", "ramadan"],
    description: "Hyderabad's Ramadan staple and world-famous dish — slow-cooked lamb blended with wheat, lentils and aromatic spices into a thick, porridge-like stew. GI-tagged for authenticity.",
    ingredients: ["onion", "garlic", "ginger", "ghee", "garam masala", "lemon", "cilantro"],
    missingIngredients: ["lamb", "broken wheat", "haleem masala", "fried onions"],
    steps: [
      { step: 1, title: "Cook the wheat and dal", instruction: "Soak broken wheat and mixed lentils overnight. Boil until very soft. Mash together." },
      { step: 2, title: "Cook the lamb", instruction: "Cook lamb with ginger-garlic, onion, haleem masala and ghee until very tender — about 2 hours. Shred the meat completely." },
      { step: 3, title: "Blend and simmer", instruction: "Mix shredded lamb into the wheat-dal mixture. Stir vigorously on low heat — the mixture should become homogeneous and thick like porridge. Cook 30 more mins. Garnish with fried onions, lemon, ginger and cilantro.", tip: "The constant stirring during the final stage is what creates the characteristic smooth yet textured consistency." },
    ],
    proTip: "Haleem must be a labour of love — this dish cannot be rushed. The minimum cooking time is 3 hours.",
  },
  {
    id: 98, title: "Thepla", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=700",
    readyInMinutes: 30, servings: 4, difficulty: "Easy",
    tags: ["thepla", "gujarati flatbread", "travel food", "healthy", "fenugreek"],
    description: "Gujarat's famous travel flatbread — whole wheat flour kneaded with fresh fenugreek leaves and spices. Stays fresh for days, making it the perfect food for journeys.",
    ingredients: ["flour", "yogurt", "cumin", "turmeric", "ginger", "garlic", "sesame oil"],
    missingIngredients: ["fenugreek leaves", "ajwain", "besan"],
    steps: [
      { step: 1, title: "Make the dough", instruction: "Mix 2 cups whole wheat flour with ¼ cup besan, 1 cup finely chopped fresh methi, 1 tsp turmeric, 1 tsp cumin, 1 tsp chilli powder, ginger-garlic paste, 2 tbsp yogurt, 1 tbsp oil, salt. Knead to soft dough using water as needed." },
      { step: 2, title: "Roll and cook", instruction: "Divide into balls. Roll into thin circles. Cook on a hot tawa with oil, pressing and rotating, until golden spots appear on both sides, about 2 mins per side." },
      { step: 3, title: "Store or serve", instruction: "Theplas can be stored at room temperature for 2–3 days or refrigerated for up to a week. Serve with yogurt, pickle or just on their own.", tip: "The theplas should be thin — thick ones take longer to cook and don't stay as fresh." },
    ],
    proTip: "Smearing with ghee right off the tawa makes them extra soft and improves shelf life.",
  },
  {
    id: 99, title: "Chicken Chettinad", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=700",
    readyInMinutes: 60, servings: 4, difficulty: "Hard",
    tags: ["chicken chettinad", "tamil", "spicy", "complex", "black pepper"],
    description: "One of India's most complex spice profiles — Chettinad chicken uses kalpasi (stone flower), marathi mokku (dried flower pods) and Chettinad masala for an unforgettable curry.",
    ingredients: ["chicken", "onion", "tomato", "garlic", "ginger", "black pepper", "cumin", "coconut"],
    missingIngredients: ["kalpasi", "marathi mokku", "kunjikkal", "curry leaves"],
    steps: [
      { step: 1, title: "Make Chettinad masala", instruction: "Dry roast and grind: black pepper, cumin, coriander, kalpasi (stone flower), marathi mokku (dried kapok flowers), cloves, cinnamon, star anise, fennel seeds. This ground masala is the heart of the dish." },
      { step: 2, title: "Build the curry", instruction: "Fry onion in gingelly oil until golden. Add ginger-garlic paste. Add tomatoes and fresh coconut paste. Cook until thick. Add Chettinad masala and a generous amount of curry leaves." },
      { step: 3, title: "Cook the chicken", instruction: "Add chicken and toss to coat. Add water, cook covered 30 mins. Remove lid and cook on high heat to thicken. The curry should be thick and deeply coloured.", tip: "The gingelly (sesame) oil is traditional and contributes a unique nutty flavour that cannot be replicated." },
    ],
    proTip: "Chettinad cuisine uses the most complex spice profile in India. Seek out the specialty spices — they make all the difference.",
  },
  {
    id: 100, title: "Pani Puri", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1485963631004-f2f00b1d6606?w=700",
    readyInMinutes: 30, servings: 4, difficulty: "Medium",
    tags: ["pani puri", "gol gappa", "street food", "chaat", "water balls"],
    description: "India's most beloved street food — hollow crispy shells filled with spiced potato and chickpeas, then dunked in an icy cold, tangy-spicy mint water. Pure joy in one bite.",
    ingredients: ["potato", "chickpeas", "cumin", "cilantro", "lemon", "black pepper", "ginger"],
    missingIngredients: ["puri shells", "tamarind", "mint", "black salt", "kala namak"],
    steps: [
      { step: 1, title: "Make pani (spiced water)", instruction: "Blend 1 cup mint, ½ cup cilantro, 2 green chillies, 1 tbsp tamarind paste, 1 tsp roasted cumin powder, black salt, regular salt and 3 cups cold water. Strain. Chill in fridge." },
      { step: 2, title: "Make the filling", instruction: "Mix boiled potato cubes with boiled chickpeas, finely diced onion, salt, cumin powder, chilli powder and chaat masala." },
      { step: 3, title: "Assemble and eat", instruction: "Crack a small hole in the top of a puri. Fill with potato-chickpea mixture. Dunk fully in the icy green pani. Pop the whole thing in your mouth in one go. Never bite halfway.", tip: "The entire puri must be eaten in one bite — this is not optional. The explosion of cold tangy water inside is the whole point." },
    ],
    proTip: "The pani must be ice cold. Serve with ice cubes floating in the bowl for the full street food experience.",
  },
  {
    id: 101, title: "Momos (Tibetan Dumplings)", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=700",
    readyInMinutes: 50, servings: 4, difficulty: "Medium",
    tags: ["momos", "tibetan", "dumplings", "north east india", "steamed"],
    description: "The beloved dumplings from India's Northeast and Tibetan communities — stuffed with spiced meat or vegetables, steamed and served with fiery red chutney.",
    ingredients: ["flour", "onion", "garlic", "ginger", "soy sauce", "sesame oil", "cilantro"],
    missingIngredients: ["cabbage", "chicken mince"],
    steps: [
      { step: 1, title: "Make the dough and filling", instruction: "Knead plain flour with water to stiff dough. Rest 30 mins. For filling: mix finely minced chicken (or vegetables), cabbage, spring onion, garlic, ginger, soy sauce, sesame oil, salt, pepper. Mix well." },
      { step: 2, title: "Shape the momos", instruction: "Roll dough into thin circles. Place 1 tbsp filling in centre. Fold edges and pleat repeatedly to make a half-moon or round parcel. The pleating seals and shapes the momo." },
      { step: 3, title: "Steam and serve", instruction: "Steam in a greased steamer for 12–15 mins until dough looks slightly translucent. Serve immediately with momo chutney (tomato-chilli-garlic).", tip: "Don't leave gaps in the pleating — steam enters unsealed momos and the filling gets watery." },
    ],
    proTip: "Chilling the filling before using makes it firmer and easier to wrap.",
  },
  {
    id: 102, title: "Sindhi Curry", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=700",
    readyInMinutes: 40, servings: 4, difficulty: "Medium",
    tags: ["sindhi curry", "chickpea flour", "vegetables", "tangy", "north indian"],
    description: "Sindhi cuisine's unique gram flour-based curry — tangy, nutty and full of vegetables. Unlike any other Indian curry, it's thickened with roasted besan for a unique flavour.",
    ingredients: ["potato", "tomato", "onion", "carrot", "mustard seeds", "turmeric", "lemon", "cilantro"],
    missingIngredients: ["besan", "drumstick", "tamarind", "curry leaves"],
    steps: [
      { step: 1, title: "Roast the besan", instruction: "Dry roast 3 tbsp besan (chickpea flour) in oil, stirring constantly until golden brown and fragrant. This is the base that gives Sindhi curry its unique character." },
      { step: 2, title: "Build the curry", instruction: "Temper mustard seeds and curry leaves. Add onion, tomatoes. Add the roasted besan and mix. Add water gradually to prevent lumps, whisking until smooth. Add tamarind, turmeric, chilli." },
      { step: 3, title: "Add vegetables and simmer", instruction: "Add potato, drumstick pieces, cluster beans, tomatoes. Simmer 20 mins until all vegetables are tender. Season with salt, sugar (a pinch) and lemon. Serve over rice with papad.", tip: "The besan must be well-roasted — raw besan has a bitter, floury taste." },
    ],
    proTip: "Adding a small piece of jaggery balances the tamarind and gives Sindhi curry its characteristic sweet-sour-tangy taste.",
  },
  {
    id: 103, title: "Kakori Kebab", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1574653853027-5382a3d23a15?w=700",
    readyInMinutes: 45, servings: 4, difficulty: "Hard",
    tags: ["kakori kebab", "lucknawi", "seekh kebab", "minced lamb", "mughal"],
    description: "Lucknow's legendary melt-in-the-mouth kebab — minced lamb kneaded with raw papaya and exotic spices until so fine it almost becomes a paste, then grilled on skewers.",
    ingredients: ["ground beef", "onion", "garlic", "ginger", "garam masala", "cumin", "cardamom", "cashews"],
    missingIngredients: ["raw papaya", "charcoal", "mace", "ittar"],
    steps: [
      { step: 1, title: "Prepare the mince", instruction: "Pass minced lamb through a food processor twice to make it extremely fine — almost a paste. This is essential for the smooth texture. Mix in grated raw papaya (tenderiser), cashew paste, and all ground spices." },
      { step: 2, title: "Rest and shape", instruction: "Rest the mixture 2 hours in the fridge. Wet your hands and mould portions onto flat skewers, pressing firmly. The mixture should stick without gaps." },
      { step: 3, title: "Grill", instruction: "Grill over charcoal (or gas flame), turning slowly, until cooked through and lightly charred, 8–10 mins. Serve with mint chutney, onion rings and a squeeze of lemon.", tip: "If the mixture is too wet to hold shape, add a tbsp of roasted chickpea flour as binder." },
    ],
    proTip: "Raw papaya enzymes tenderise the meat to the characteristic silky texture. Don't skip it.",
  },
  {
    id: 104, title: "Kosha Mangsho", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1574653853027-5382a3d23a15?w=700",
    readyInMinutes: 90, servings: 4, difficulty: "Hard",
    tags: ["kosha mangsho", "bengali", "slow cooked mutton", "kolkata"],
    description: "Kolkata's most celebrated dish — mutton slow-cooked with an intense onion-ginger-garlic masala until the oil surfaces and the meat is fall-apart tender. Served at all Bengali celebrations.",
    ingredients: ["onion", "garlic", "ginger", "yogurt", "mustard oil", "cumin", "coriander powder", "garam masala"],
    missingIngredients: ["mutton", "bay leaves", "mustard oil"],
    steps: [
      { step: 1, title: "Marinate mutton", instruction: "Marinate mutton pieces with yogurt, ginger-garlic paste, turmeric, chilli powder and salt for at least 2 hours." },
      { step: 2, title: "The 'kosha' process", instruction: "Heat mustard oil until smoking, reduce heat. Add whole spices. Add onion paste and cook 20 mins stirring constantly until deep golden. Add marinated mutton. The key: cook on medium heat WITHOUT covering, stirring every few minutes, letting the moisture evaporate continuously." },
      { step: 3, title: "Low and slow", instruction: "After 30 mins the oil should be surfacing. Add ½ cup warm water, cover, and cook on lowest heat 40 mins until mutton is tender. The gravy should be thick and the oil should have separated. Finish with garam masala.", tip: "The 'kosha' technique means cooking on low-medium heat without covering, which is opposite to most curries." },
    ],
    proTip: "Mustard oil is essential for authentic flavour. The smoking of mustard oil before use (called 'kadai') removes its raw pungency.",
  },
  {
    id: 105, title: "Avial", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=700",
    readyInMinutes: 35, servings: 4, difficulty: "Easy",
    tags: ["avial", "kerala", "mixed vegetables", "coconut", "yogurt"],
    description: "Kerala's iconic mixed vegetable dish — drumstick, yam, raw banana and other vegetables cooked in a thick coconut-cumin sauce with yogurt. A staple at every Kerala sadya.",
    ingredients: ["carrot", "potato", "peas", "yogurt", "coconut", "cumin", "turmeric", "garlic"],
    missingIngredients: ["drumstick", "raw banana", "yam", "curry leaves", "coconut oil"],
    steps: [
      { step: 1, title: "Cook the vegetables", instruction: "Cut 5–6 different vegetables into finger-length pieces (raw banana, drumstick, carrot, yam, raw mango, beans). Cook in just enough water with turmeric and salt until tender." },
      { step: 2, title: "Make coconut paste", instruction: "Grind 1 cup grated coconut, 3 green chillies, 1 tsp cumin and 3 garlic cloves to a coarse paste — not smooth." },
      { step: 3, title: "Combine", instruction: "Add coconut paste to vegetables. Stir and cook 3 mins. Remove from heat. Add whisked yogurt and mix — do not cook after adding yogurt or it will split. Finish with coconut oil and curry leaves.", tip: "Add yogurt off heat — avial should never be cooked after the yogurt is added." },
    ],
    proTip: "The more variety of vegetables, the better the avial. Aim for at least 5 different ones.",
  },
  {
    id: 106, title: "Chhole Puri", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=700",
    readyInMinutes: 40, servings: 4, difficulty: "Medium",
    tags: ["chhole puri", "fried bread", "north indian", "sunday breakfast", "chickpeas"],
    description: "North India's favourite Sunday breakfast — spicy chickpea curry paired with hot, puffed fried bread. The combination is greater than the sum of its parts.",
    ingredients: ["chickpeas", "onion", "tomato", "garlic", "ginger", "flour", "cumin", "garam masala"],
    missingIngredients: ["anardana", "tea bags"],
    steps: [
      { step: 1, title: "Make dark chhole", instruction: "Soak chickpeas overnight. Cook with tea bags — this turns the chickpeas deep brown. Make masala with onion, tomato, whole and ground spices. Add chickpeas. Add anardana (dry pomegranate) for tang. Simmer 20 mins. Mash some chickpeas to thicken." },
      { step: 2, title: "Make puri dough", instruction: "Mix 2 cups flour, 1 tbsp semolina, salt, a pinch of ajwain and water to stiff dough. Knead well. Rest 20 mins. Divide into balls." },
      { step: 3, title: "Fry puris", instruction: "Roll each ball into a small disc. Deep fry in medium-hot oil, pressing gently with a spoon to help them puff. They should balloon up in 30 seconds. Drain. Serve immediately with hot chhole.", tip: "Stiff dough and right oil temperature (not too hot) are both needed for properly puffed puris." },
    ],
    proTip: "Tea bags during cooking give authentic dark colour to the chickpeas without using artificial colour.",
  },
  {
    id: 107, title: "Stuffed Karela (Bitter Gourd)", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=700",
    readyInMinutes: 45, servings: 3, difficulty: "Medium",
    tags: ["karela", "bitter gourd", "stuffed", "healthy", "north indian", "diabetic friendly"],
    description: "Whole bitter gourds stuffed with a tangy onion-spice filling and pan-fried until caramelised. A dish that converts bitter gourd sceptics.",
    ingredients: ["onion", "cumin", "coriander powder", "turmeric", "lemon", "mustard seeds"],
    missingIngredients: ["bitter gourd", "amchur powder", "fennel seeds"],
    steps: [
      { step: 1, title: "Prep the karela", instruction: "Scrape the karela skin lightly and make a slit down the length of each one. Rub generously with salt inside and out. Rest 30 mins. Squeeze out all the water — this removes bitterness." },
      { step: 2, title: "Make the filling", instruction: "Sauté finely chopped onion until golden. Add all spices — cumin, fennel, amchur, chilli, salt. Add scraped karela flesh mixed with the onion. Cook 5 mins." },
      { step: 3, title: "Stuff and pan fry", instruction: "Fill each karela with the stuffing and tie with kitchen string. Pan fry in oil on medium heat, turning every 5 mins until caramelised and tender all over, about 25 mins. Serve with dal and rice.", tip: "Tying with string keeps the filling inside during frying. Remove strings before serving." },
    ],
    proTip: "Salting and squeezing is the key step — properly treated karela is nowhere near as bitter as untreated.",
  },
  {
    id: 108, title: "Chicken Rezala", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1574653853027-5382a3d23a15?w=700",
    readyInMinutes: 55, servings: 4, difficulty: "Medium",
    tags: ["chicken rezala", "bengali", "white curry", "mughal", "mild", "yogurt"],
    description: "Kolkata's aristocratic white chicken curry — pale, aromatic and mildly spiced with white pepper, cardamom and rose water. Subtle yet deeply complex.",
    ingredients: ["chicken", "yogurt", "onion", "garlic", "ginger", "cardamom", "heavy cream"],
    missingIngredients: ["white pepper", "kewra water", "rose water", "mace", "poppy seeds"],
    steps: [
      { step: 1, title: "Marinate", instruction: "Marinate chicken in yogurt, white pepper, cardamom powder, mace, poppy seed paste, ginger-garlic paste and salt for 2 hours." },
      { step: 2, title: "Cook in white gravy", instruction: "Fry onion paste in ghee until golden (not brown — this dish must remain pale). Add marinated chicken. Cook on medium heat without browning." },
      { step: 3, title: "Finish", instruction: "Add ½ cup cream, reduce heat. Cook 20 mins until chicken is done. The gravy should be pale and creamy. Add kewra water and rose water only at the end — these aromatics evaporate if added early.", tip: "This dish must never brown — keep heat medium and use ghee, not oil, for the authentic pale colour." },
    ],
    proTip: "Kewra water is the defining flavour of rezala — it gives the curry its unique floral, pandanus aroma.",
  },
  {
    id: 109, title: "Gajar Halwa (Carrot Pudding)", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=700",
    readyInMinutes: 60, servings: 6, difficulty: "Easy",
    tags: ["gajar halwa", "carrot halwa", "dessert", "winter", "milk dessert"],
    description: "North India's beloved winter dessert — grated carrots slow-cooked in full-fat milk with sugar and cardamom until thick and fudgy. Pure sweet comfort.",
    ingredients: ["carrot", "milk", "sugar", "ghee", "cardamom", "cashews"],
    missingIngredients: ["khoya", "saffron"],
    steps: [
      { step: 1, title: "Cook carrots in milk", instruction: "Grate 1 kg red carrots (the sweeter variety). Cook in 1 litre full-fat milk on medium heat, stirring every few minutes, until all milk is absorbed, about 40 mins." },
      { step: 2, title: "Add sugar and ghee", instruction: "Add ¾ cup sugar — it will make the halwa liquid again. Continue cooking. Add 3 tbsp ghee. Cook until the mixture leaves the sides of the pan and thickens." },
      { step: 3, title: "Finish and serve", instruction: "Add khoya (optional but makes it richer), cardamom powder and saffron. Fry cashews and raisins in ghee and mix in. Serve warm. Heavenly with a scoop of vanilla ice cream.", tip: "Red carrots give sweeter halwa than orange ones. If only orange available, add slightly more sugar." },
    ],
    proTip: "Patience is the only ingredient you cannot substitute — gajar halwa cannot be rushed.",
  },
  {
    id: 110, title: "Gulab Jamun", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=700",
    readyInMinutes: 45, servings: 8, difficulty: "Medium",
    tags: ["gulab jamun", "dessert", "sweet", "celebration", "rose syrup"],
    description: "India's most beloved sweet — soft milk-solid dumplings fried golden then soaked in fragrant rose-cardamom sugar syrup until they absorb it completely.",
    ingredients: ["milk", "sugar", "ghee", "cardamom"],
    missingIngredients: ["khoya", "rose water", "maida"],
    steps: [
      { step: 1, title: "Make the dough", instruction: "Knead khoya (evaporated milk solids) with a little maida (plain flour) and a pinch of baking soda to a smooth, soft dough. Do not over-knead. Rest 10 mins. Roll into smooth balls with no cracks." },
      { step: 2, title: "Make the syrup", instruction: "Make 1-string sugar syrup (1 cup sugar, 1 cup water). Add cardamom pods, a few saffron strands and 1 tbsp rose water. Keep warm." },
      { step: 3, title: "Fry and soak", instruction: "Deep fry the balls in oil or ghee on the lowest heat — they must colour slowly and evenly (this takes 8–10 mins). They should become deep golden-brown. Drop hot into warm syrup immediately. Soak 2 hours minimum before serving.", tip: "Frying on low heat ensures the inside cooks before the outside browns — medium or high heat gives a raw centre." },
    ],
    proTip: "The syrup must be warm when you add the fried jamuns — cold syrup causes them to harden instead of soaking.",
  },
  // ═══════════════════════════════════════════════════════════════════════════
// 50 NEW INDIAN RECIPES  (IDs 211–260)
//
// ── WHERE TO PASTE ──────────────────────────────────────────────────────────
//  1. Open App.tsx in VS Code
//  2. Press Ctrl+F and search for:   id: 110
//  3. Scroll DOWN past that recipe until you see the closing ];  of ALL_RECIPES
//  4. Place your cursor on the line JUST BEFORE that ];
//  5. Paste everything between the ═══ lines below
//
//  The array should look like this after pasting:
//    ...
//    { id: 110, title: "Gulab Jamun", ... },   ← existing last recipe
//    { id: 111, ... },                          ← from previous file
//    ...
//    { id: 210, ... },                          ← last of previous file
//    { id: 211, ... },                          ← START PASTING HERE
//    ...
//    { id: 260, ... },                          ← end of this file
//  ];                                           ← closing bracket stays
// ════════════════════════════════════════════════════════════════════════════

  // ── NORTH INDIAN (211–235) ────────────────────────────────────────────────

  {
    id: 211, title: "Aloo Tamatar Sabzi", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1574484284002-952d92456975?w=700",
    readyInMinutes: 25, servings: 4, difficulty: "Easy",
    tags: ["aloo tamatar", "potato tomato", "dhaba", "north indian", "everyday"],
    description: "The simplest and most comforting everyday North Indian dish — potatoes cooked in a tangy, spiced tomato gravy. Found in every dhaba (roadside eatery) and home kitchen across North India. Pairs perfectly with puri or roti.",
    ingredients: ["potato", "tomato", "onion", "garlic", "ginger", "cumin", "turmeric", "coriander powder", "ghee"],
    missingIngredients: ["kasuri methi", "amchur powder"],
    steps: [
      { step: 1, title: "Fry the potatoes first", instruction: "Peel and cube 4 large potatoes into 2.5cm pieces. Heat 3 tbsp oil or ghee in a kadai on medium-high heat. Add potato cubes and fry, turning occasionally, for 8–10 minutes until golden on the outside and just cooked through. Remove and set aside. This frying step gives the potatoes a golden crust that holds up in the gravy without going mushy.", tip: "Frying the potatoes separately before adding to the gravy is the dhaba secret — it gives them a golden crust and prevents them from becoming soggy." },
      { step: 2, title: "Build the tomato masala", instruction: "In the same pan, heat 1 tbsp ghee. Add 1 tsp cumin seeds — let them splutter for 10 seconds. Add 1 large finely chopped onion and cook on medium heat for 6–7 minutes until golden. Add 1 tbsp ginger-garlic paste and cook 2 minutes until the raw smell disappears. Add 3 large tomatoes (finely chopped or blended) along with 1 tsp coriander powder, 1/2 tsp turmeric, 1/2 tsp chilli powder and salt. Cook on medium heat for 8–10 minutes, stirring frequently, until the tomatoes are completely broken down and oil begins to separate from the masala at the edges of the pan." },
      { step: 3, title: "Combine and simmer", instruction: "Add the fried potatoes back into the tomato masala. Add 1/2 cup water and mix gently so the potatoes are coated in the masala. Bring to a simmer, cover with a lid and cook on low heat for 8 minutes so the potatoes fully absorb the masala flavours. Add crushed kasuri methi and a pinch of amchur powder for tanginess. Garnish with fresh coriander leaves.", tip: "Adding a pinch of amchur (dried mango powder) at the end adds a brightness that balances the richness of the tomato masala." },
    ],
    proTip: "Use ripe, juicy red tomatoes for the most flavourful gravy. Underripe or pale tomatoes result in a thin, acidic masala.",
  },
  {
    id: 212, title: "Kali Dal (Whole Black Lentils)", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=700",
    readyInMinutes: 60, servings: 4, difficulty: "Medium",
    tags: ["kali dal", "whole urad", "punjabi", "north indian", "protein"],
    description: "The whole black urad dal version — less rich than dal makhani but equally satisfying. Cooked until the lentils are completely tender, then seasoned with a simple ginger-garlic tadka. Earthy, nutty and deeply nourishing.",
    ingredients: ["onion", "tomato", "garlic", "ginger", "cumin", "ghee", "turmeric", "coriander powder"],
    missingIngredients: ["whole black urad dal", "kasuri methi"],
    steps: [
      { step: 1, title: "Soak and pressure cook", instruction: "Soak 1 cup whole black urad dal overnight — this is non-negotiable as whole black lentils are very dense and take forever to cook without soaking. Drain and pressure cook with 3.5 cups fresh water, 1/2 tsp turmeric, a pinch of asafoetida and salt for 20–25 minutes (6–7 whistles). The dal is done when you can crush a lentil easily between two fingers. Undercooked dal has an unpleasant grainy texture." },
      { step: 2, title: "Make the tomato-onion masala", instruction: "Heat 2 tbsp ghee in a pan. Add 1 tsp cumin seeds. Add 1 large finely chopped onion and cook 8 minutes until deep golden — patience here builds flavour. Add 1 tbsp ginger-garlic paste and cook 2 minutes. Add 2 chopped tomatoes, 1 tsp coriander powder, 1/2 tsp chilli powder. Cook 10 minutes until the masala is thick and glossy and oil has separated." },
      { step: 3, title: "Combine and finish", instruction: "Pour the cooked dal into the masala. Mix well and simmer together for 10 minutes on low heat so the dal absorbs the masala flavours. If the dal is too thick, add a splash of water. Crush kasuri methi between your palms and stir in. Finish with a squeeze of lemon and a final drizzle of ghee." },
    ],
    proTip: "Kali dal improves overnight — make it the evening before and reheat the next day for the deepest flavour.",
  },
  {
    id: 213, title: "Aloo Gobi", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1574484284002-952d92456975?w=700",
    readyInMinutes: 30, servings: 4, difficulty: "Easy",
    tags: ["aloo gobi", "potato cauliflower", "dry sabzi", "north indian", "everyday"],
    description: "North India's most popular dry vegetable dish — potato and cauliflower florets stir-fried with cumin and fragrant spices until tender with slightly crispy edges. Absolutely delicious in its simplicity.",
    ingredients: ["potato", "cauliflower", "onion", "garlic", "ginger", "cumin", "turmeric", "coriander powder", "ghee", "cilantro"],
    missingIngredients: ["ajwain", "kasuri methi"],
    steps: [
      { step: 1, title: "Prep the vegetables", instruction: "Break 1 large cauliflower into medium florets — not too small or they disintegrate. Peel and cube 3 medium potatoes into 2cm pieces. Dry both vegetables thoroughly with a kitchen towel — excess moisture causes steaming instead of frying and makes the vegetables soft rather than lightly crispy." },
      { step: 2, title: "Fry in batches", instruction: "Heat 3 tbsp oil or ghee in a wide kadai on medium-high heat. Add 1/2 tsp ajwain seeds and 1 tsp cumin seeds — wait for them to splutter. Add potatoes first and cook 5 minutes without stirring, letting them develop colour. Add cauliflower florets and toss everything together. Add 1/2 tsp turmeric, 1 tsp coriander powder, 1/2 tsp chilli powder and salt. Toss to coat." },
      { step: 3, title: "Cover and cook on low", instruction: "Add 1 tbsp ginger-garlic paste. Toss. Reduce heat to low, cover with a lid and cook for 10–12 minutes, lifting the lid and tossing gently every 4 minutes. The vegetables cook in their own steam — do not add water. When potatoes are tender and cauliflower has some charred edges, the dish is done. Finish with crushed kasuri methi and fresh coriander.", tip: "Do NOT add water at any point. The vegetables release enough moisture to cook through on low heat. Water makes aloo gobi mushy." },
    ],
    proTip: "The ajwain (carom seeds) in this dish is non-negotiable — it adds a distinctive herby, thyme-like aroma specific to aloo gobi.",
  },
  {
    id: 214, title: "Rajma Chawal", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=700",
    readyInMinutes: 60, servings: 4, difficulty: "Medium",
    tags: ["rajma chawal", "red kidney beans", "punjabi comfort", "north indian", "rice and beans"],
    description: "Punjab's ultimate Sunday comfort food — thick, deeply spiced red kidney bean curry served over steamed basmati rice. Every Punjabi home has a slightly different recipe; this is the classic version.",
    ingredients: ["onion", "tomato", "garlic", "ginger", "cumin", "coriander powder", "garam masala", "ghee", "rice"],
    missingIngredients: ["red kidney beans", "bay leaf", "kasuri methi"],
    steps: [
      { step: 1, title: "Soak and pressure cook rajma", instruction: "Soak 1.5 cups dried red kidney beans overnight in plenty of water — they roughly double in size. Drain and rinse. Pressure cook with 4 cups fresh water, 2 bay leaves, a pinch of baking soda (speeds cooking) and salt for 20–25 minutes (8 whistles) until each bean is completely soft and you can crush it easily. Reserve all cooking liquid — it becomes the base of the curry." },
      { step: 2, title: "Make the masala base", instruction: "Heat 3 tbsp ghee in a heavy pan. Add 1 tsp cumin seeds. Add 2 large onions (finely chopped) and cook on medium heat for 12–15 minutes, stirring regularly, until deep golden brown — this is the flavour foundation so do not rush it. Add 1 tbsp ginger-garlic paste, cook 2 minutes. Add 3 large blended tomatoes, 2 tsp coriander powder, 1 tsp cumin powder, 1/2 tsp chilli powder and 1/4 tsp turmeric. Cook stirring for 12 minutes until oil surfaces and the masala is thick and dark." },
      { step: 3, title: "Add beans and slow simmer", instruction: "Add the cooked rajma along with ALL the reserved cooking liquid. Bring to a boil then reduce to a low simmer. Partially mash some beans against the side of the pot — this thickens the gravy naturally. Simmer uncovered for 15–20 minutes until the curry is thick, glossy and the beans are coated in the masala. Add garam masala, crushed kasuri methi and a knob of butter at the end." },
    ],
    proTip: "Mashing some beans against the pot is the technique that gives rajma its characteristic thick, velvety gravy without any thickeners.",
  },
  {
    id: 215, title: "Shahi Paneer", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=700",
    readyInMinutes: 40, servings: 4, difficulty: "Medium",
    tags: ["shahi paneer", "mughal", "cashew gravy", "royal", "mild paneer"],
    description: "The Mughal royal paneer dish — paneer in an ivory-white, mildly spiced cashew and cream gravy fragrant with cardamom and rose water. Shahi means 'royal' — this is the most delicate and sophisticated paneer curry.",
    ingredients: ["paneer", "heavy cream", "cashews", "onion", "garlic", "ginger", "cardamom", "ghee", "milk"],
    missingIngredients: ["rose water", "saffron", "kewra water"],
    steps: [
      { step: 1, title: "Make the white gravy base", instruction: "In a pot, gently cook 2 large roughly chopped onions, 15 cashews, 4 garlic cloves, 1 inch ginger, 4 green cardamom pods and 1 cup milk together on low-medium heat for 15 minutes until onion is completely soft. Do NOT brown — shahi paneer must remain pale and ivory-coloured. Cool completely and blend to a completely smooth, silky paste. Strain through a fine sieve." },
      { step: 2, title: "Cook the gravy", instruction: "Heat 2 tbsp ghee in a pan. Add the strained white paste. Cook on medium heat, stirring continuously for 8–10 minutes until the paste thickens and the ghee surfaces at the edges. Add 1/2 tsp white pepper powder (not red chilli — this stays white), 1/2 tsp cardamom powder and salt. Add 1/2 cup water to adjust consistency." },
      { step: 3, title: "Add cream and paneer", instruction: "Pour in 100ml cream and stir gently. Bring to a gentle simmer. Add 300g paneer cubes (gently pan-fried in butter until golden, optional). Simmer 5 minutes. Remove from heat and add a few drops of rose water and kewra water — just a drop or two of each, as they are intensely fragrant. Garnish with a pinch of saffron dissolved in warm milk.", tip: "Rose water and kewra water are very powerful — one or two drops is all you need. More will make the dish taste like perfume." },
    ],
    proTip: "Shahi paneer should taste mild, creamy and floral — not spicy. The spicing is intentionally gentle to let the cashew-cream base shine.",
  },
  {
    id: 216, title: "Pindi Chana", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=700",
    readyInMinutes: 50, servings: 4, difficulty: "Medium",
    tags: ["pindi chana", "dry chana", "punjabi", "no gravy", "roadside"],
    description: "Rawalpindi-style dry chickpeas — cooked with spices until completely dry, almost blackened from the masala. Unlike chana masala which has a thick gravy, pindi chana is entirely dry with intensely concentrated flavour.",
    ingredients: ["onion", "tomato", "garlic", "ginger", "cumin", "coriander powder", "ghee", "lemon"],
    missingIngredients: ["dried chickpeas", "pomegranate seeds", "chana masala powder", "bay leaf", "tea bag"],
    steps: [
      { step: 1, title: "Cook chickpeas with tea", instruction: "Soak 1.5 cups dried chickpeas overnight. Drain. Pressure cook with 4 cups fresh water, 2 bay leaves, 1 black cardamom, 1 cinnamon stick and 1 black tea bag (gives a dark colour). Cook 20 minutes until completely tender. Remove tea bag and whole spices. Drain chickpeas but save 1/2 cup cooking liquid." },
      { step: 2, title: "Make the dry masala", instruction: "Heat 3 tbsp ghee in a heavy kadai until very hot. Add 1 tsp cumin seeds. Add 2 finely chopped onions and cook on high heat for 10 minutes until deep brown and slightly charred at edges. Add ginger-garlic paste, cook 2 minutes. Add finely chopped tomatoes, 2 tsp chole/chana masala powder, 1 tsp coriander powder, 1/2 tsp chilli powder. Cook on high heat 10 minutes, stirring continuously, until completely dry and deeply coloured." },
      { step: 3, title: "Add chickpeas and dry roast", instruction: "Add cooked chickpeas to the masala. Add the reserved cooking liquid. Toss everything on high heat, cooking without a lid for 8–10 minutes until all liquid evaporates and the masala clings to every chickpea. Add crushed pomegranate seeds (anardana), a squeeze of lemon and fresh ginger juliennes. The chickpeas should look dark, sticky and dry." },
    ],
    proTip: "The tea bag is the traditional trick for giving pindi chana its characteristic deep mahogany colour without any food colouring.",
  },
  {
    id: 217, title: "Pyaz Ki Kachori", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1485963631004-f2f00b1d6606?w=700",
    readyInMinutes: 60, servings: 8, difficulty: "Medium",
    tags: ["pyaz ki kachori", "onion kachori", "rajasthani breakfast", "jodhpur", "street food"],
    description: "Jodhpur's legendary breakfast — crispy fried pastry filled with a pungent, spiced caramelised onion filling. Sold from roadside shops since morning, eaten with green and tamarind chutneys.",
    ingredients: ["flour", "onion", "fennel seeds", "coriander powder", "ginger", "ghee", "vegetable oil"],
    missingIngredients: ["ajwain", "besan", "amchur powder", "nigella seeds"],
    steps: [
      { step: 1, title: "Make the filling", instruction: "Heat 2 tbsp oil in a pan. Add 1/2 tsp fennel seeds and 1/4 tsp nigella seeds. Add 3 large onions (very finely chopped) and cook on medium-high heat for 15 minutes, stirring, until deep golden and slightly charred — the caramelisation is what makes this filling special. Add 2 tbsp besan and toast for 2 minutes. Add 1 tsp coriander powder, 1/2 tsp chilli powder, 1/2 tsp amchur, 1 tsp finely grated ginger and salt. Mix well. Cool completely.", tip: "Toasting the besan in the filling serves two purposes — it absorbs moisture (preventing soggy pastry) and adds a nutty flavour." },
      { step: 2, title: "Make pastry dough", instruction: "Mix 2 cups plain flour with 1/2 tsp ajwain, 1/2 tsp salt and 4 tbsp melted ghee. Rub the ghee in until the mixture resembles fine breadcrumbs — this creates the flaky texture. Add water gradually to make a stiff, firm dough. Do not over-knead. Rest covered for 20 minutes." },
      { step: 3, title: "Fill and fry", instruction: "Take a lemon-sized ball of dough. Flatten into a small circle. Place 1.5 tsp filling in the centre. Bring edges up and seal tightly into a ball, making sure there are no gaps. Flatten gently into a thick round disc. Deep fry in oil at 160°C (low heat is key) for 10–12 minutes, turning, until evenly golden and crispy all over." },
    ],
    proTip: "Frying at low temperature (160°C not 180°C) is essential — slow frying allows the pastry to cook through and become crispy rather than burning outside while remaining raw inside.",
  },
  {
    id: 218, title: "Dum Aloo (Kashmiri)", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1574484284002-952d92456975?w=700",
    readyInMinutes: 45, servings: 4, difficulty: "Medium",
    tags: ["dum aloo", "kashmiri", "spiced baby potatoes", "fennel yogurt", "north indian"],
    description: "Kashmir's elegant baby potato curry — whole fried baby potatoes cooked in a vivid red, fennel-scented yogurt gravy. The Kashmiri flavour profile of dried ginger, fennel and Kashmiri chilli is completely unlike any other Indian potato dish.",
    ingredients: ["baby potatoes", "yogurt", "cumin", "ghee", "garlic"],
    missingIngredients: ["kashmiri chilli powder", "fennel powder", "dried ginger powder", "black cardamom"],
    steps: [
      { step: 1, title: "Fry baby potatoes", instruction: "Boil 500g baby potatoes until just tender. Peel them. Prick each potato all over with a fork or toothpick — this allows the gravy to penetrate deeply. Heat generous oil in a pan and deep fry the pricked potatoes until golden-brown all over. Remove and set aside." },
      { step: 2, title: "Make Kashmiri yogurt gravy", instruction: "Whisk 1 cup thick yogurt with 2 tsp Kashmiri chilli powder, 1 tsp fennel powder (saunf powder), 1/2 tsp dried ginger powder (sonth), 1/4 tsp turmeric and salt. This spiced yogurt is the entire sauce base. Heat 3 tbsp mustard oil to smoking, then reduce heat. Add the yogurt mixture all at once — stir vigorously to prevent curdling. Cook on medium heat, stirring continuously, for 8–10 minutes until the oil surfaces and the masala is thick and deep red." },
      { step: 3, title: "Add potatoes and dum cook", instruction: "Add the fried potatoes to the yogurt gravy. Add 1/2 cup warm water. Stir gently. Cover with a tight lid and cook on the lowest possible heat for 15–20 minutes. The potatoes absorb the fragrant Kashmiri masala slowly. Finish with a pinch of garam masala.", tip: "The 'dum' (slow steam cooking under a sealed lid) is what makes this dish — the potatoes soak up the yogurt masala completely." },
    ],
    proTip: "Pricking the potatoes all over before frying is the step that makes dum aloo extraordinary — the masala penetrates every part of the potato.",
  },
  {
    id: 219, title: "Amritsari Kulcha", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=700",
    readyInMinutes: 90, servings: 4, difficulty: "Medium",
    tags: ["amritsari kulcha", "stuffed kulcha", "punjabi", "north indian", "amritsar"],
    description: "Amritsar's iconic stuffed bread — leavened kulcha stuffed with spiced potato and fried onion, cooked on a tawa and finished with an extraordinary amount of butter. Served with chole (chickpea curry) as the definitive Amritsari breakfast.",
    ingredients: ["flour", "yogurt", "potato", "onion", "cumin", "coriander powder", "ginger", "ghee", "butter"],
    missingIngredients: ["ajwain", "nigella seeds", "amchur powder", "pomegranate seeds"],
    steps: [
      { step: 1, title: "Make kulcha dough", instruction: "Mix 2 cups plain flour with 1/2 tsp baking powder, 1/4 tsp baking soda, 1 tsp sugar and 1/2 tsp salt. Add 4 tbsp yogurt and mix. Add warm water gradually to form a smooth, soft, slightly sticky dough. Knead for 5 minutes. Coat in oil, cover with a damp cloth and rest at room temperature for 1 hour — the resting develops the dough's softness." },
      { step: 2, title: "Make the stuffing", instruction: "Boil and peel 3 medium potatoes. Mash completely smooth. Mix with 1 medium onion (very finely chopped), 1 tsp grated ginger, 2 green chillies (finely chopped), 1 tsp coriander powder, 1/2 tsp cumin powder, 1/2 tsp amchur, crushed pomegranate seeds (anardana), fresh coriander and salt. The stuffing must be completely dry and well-seasoned." },
      { step: 3, title: "Stuff and cook", instruction: "Divide dough into 6 balls. Flatten each into a small disc. Place 2 tbsp filling in the centre. Seal into a ball. Sprinkle nigella seeds and ajwain on top. Gently roll into an oval, about 8mm thick. Cook on a very hot tawa with butter, pressing down gently. Cook 3 minutes per side until golden with charred spots. Apply a very generous amount of butter immediately when it comes off the tawa. Serve with chole and raw onion." },
    ],
    proTip: "The butter quantity on Amritsari kulcha is deliberately excessive — this is the authentic experience. Do not hold back.",
  },
  {
    id: 220, title: "Baingan Bharta", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1574484284002-952d92456975?w=700",
    readyInMinutes: 40, servings: 4, difficulty: "Easy",
    tags: ["baingan bharta", "roasted eggplant", "smoky", "punjabi", "north indian"],
    description: "The ultimate smoky Indian eggplant dish — whole brinjal charred directly over a flame until completely collapsed, then mixed with fried onions, tomatoes and spices. The smoke from charring is the dish's defining flavour.",
    ingredients: ["eggplant", "onion", "tomato", "garlic", "ginger", "cumin", "coriander powder", "ghee", "cilantro"],
    missingIngredients: ["mustard oil"],
    steps: [
      { step: 1, title: "Char the brinjal directly over flame", instruction: "Rub 1 large brinjal (baingan) with mustard oil all over — the oil protects the skin and adds flavour. Place the entire brinjal directly on the gas flame (or under the highest grill setting if using electric). Turn with tongs every 3–4 minutes for 15–20 minutes until the skin is completely charred and black and the brinjal has collapsed and feels completely soft when pressed. A knife inserted should meet no resistance. The heavy charring is essential — do not remove early.", tip: "The more charred the skin, the smokier the bharta. Do not be afraid of the black exterior — this is exactly correct." },
      { step: 2, title: "Peel and mash the brinjal", instruction: "Place the charred brinjal in a bowl and cover with another bowl for 5 minutes — the steam loosens the skin. Peel off all the charred black skin under running water. Some small char bits staying in is fine and adds flavour. Roughly mash the flesh with a fork — keep it chunky, not smooth. Add 1 tsp mustard oil to the mashed brinjal." },
      { step: 3, title: "Make the masala and combine", instruction: "Heat 2 tbsp mustard oil or ghee in a pan. Add 1 tsp cumin seeds. Add 2 medium onions (finely chopped) and cook on medium-high heat for 10 minutes until deep golden. Add 1 tbsp ginger-garlic paste and cook 2 minutes. Add 2 chopped tomatoes, 1 tsp coriander powder, 1/2 tsp chilli powder. Cook 8 minutes until oil surfaces. Add the mashed brinjal. Mix well and cook together for 5 minutes. Finish with fresh coriander and green chilli." },
    ],
    proTip: "Baingan bharta must be made with the largest brinjal available — the large globe variety (bharta brinjal) has fewer seeds and more flesh than other varieties.",
  },
  {
    id: 221, title: "Moong Dal Halwa", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=700",
    readyInMinutes: 60, servings: 6, difficulty: "Hard",
    tags: ["moong dal halwa", "winter sweet", "ghee halwa", "rajasthani", "wedding sweet"],
    description: "Rajasthan's spectacular winter dessert — split yellow moong dal roasted in ghee for 45 minutes until golden and nutty, then cooked with saffron-milk and sugar into a rich, crumbly halwa. Rich beyond imagination.",
    ingredients: ["ghee", "sugar", "cardamom", "cashews", "milk", "saffron"],
    missingIngredients: ["split yellow moong dal", "rose water"],
    steps: [
      { step: 1, title: "Soak and grind dal", instruction: "Soak 1 cup split yellow moong dal for 3 hours. Drain and grind with very little water (2 tbsp maximum) to a slightly coarse paste — not completely smooth. The coarse texture is intentional and gives the halwa its characteristic crumbly structure." },
      { step: 2, title: "The long roast — patience required", instruction: "Heat 3/4 cup ghee in a heavy non-stick pan on medium-low heat. Add the dal paste. This is the most critical and demanding step: roast the dal continuously, stirring without stopping, for 35–45 minutes. The dal will initially splutter then gradually dry out, change colour from pale to golden to deep nutty-brown, and fill the kitchen with an extraordinary toasted, nutty fragrance. Do not increase heat — low and slow is the only way. If you stop stirring it burns instantly.", tip: "This roasting step cannot be rushed. Every minute of stirring builds flavour. Set a timer and commit — 40 minutes of stirring transforms the dal from raw to extraordinary." },
      { step: 3, title: "Add milk and sugar", instruction: "Boil 1.5 cups milk with a pinch of saffron. When the dal is deep golden, carefully add the hot saffron milk — it will splutter dramatically. Stir vigorously. Add 3/4 cup sugar and stir continuously on medium heat for 8–10 minutes until the halwa comes together, leaves the pan sides and ghee starts to ooze from the edges. Add cardamom powder and fried cashews." },
    ],
    proTip: "The minimum roasting time is 35 minutes. Less than that and the raw dal taste remains. The deep golden colour tells you when it is ready.",
  },
  {
    id: 222, title: "Mewa Pulao", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=700",
    readyInMinutes: 40, servings: 4, difficulty: "Medium",
    tags: ["mewa pulao", "dry fruit rice", "mughal", "festive", "nawabi"],
    description: "A fragrant Mughal-era festive rice dish loaded with fried dry fruits and whole spices. Aromatic with saffron, cardamom and rose water — it is the vegetarian centrepiece of any celebratory meal.",
    ingredients: ["rice", "ghee", "cardamom", "cashews", "cumin", "milk", "sugar"],
    missingIngredients: ["basmati rice", "almonds", "pistachios", "raisins", "saffron", "kewra water", "whole spices"],
    steps: [
      { step: 1, title: "Fry the dry fruits", instruction: "Heat 4 tbsp ghee in a heavy pot. Add 2 tbsp each of cashews, blanched almonds and pistachios — fry until golden. Add 2 tbsp raisins — fry until they puff up. Remove with a slotted spoon and set aside. The fried dry fruits will be added both during cooking and as garnish." },
      { step: 2, title: "Make saffron milk and cook rice", instruction: "Dissolve a generous pinch of saffron in 3 tbsp warm milk. Wash and soak 1.5 cups basmati rice for 30 minutes. In the same ghee, add whole spices (4 cardamom, 2 cloves, 1 inch cinnamon, 1 bay leaf, 1 star anise). Add drained rice and fry gently for 2 minutes. Add 2.5 cups hot water with salt and 1 tsp sugar. Bring to a boil, reduce heat to the lowest, cover tightly and cook 12 minutes." },
      { step: 3, title: "Layer saffron and dry fruits", instruction: "Open the lid, drizzle saffron milk over the rice, scatter half the fried dry fruits and add a few drops of kewra water. Cover and cook on the lowest heat for 5 more minutes (dum). Fluff gently with a fork. Serve garnished with remaining dry fruits." },
    ],
    proTip: "The saffron milk drizzled over the top creates beautiful golden patches in the white rice — this contrast is the visual signature of mewa pulao.",
  },
  {
    id: 223, title: "Bharwa Bhindi", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1574484284002-952d92456975?w=700",
    readyInMinutes: 30, servings: 3, difficulty: "Medium",
    tags: ["bharwa bhindi", "stuffed okra", "north indian", "dry sabzi", "masala"],
    description: "Whole okra (ladyfingers) slit and stuffed with a fragrant spice mixture, then pan-fried in mustard oil until tender and slightly crispy. One of North India's most elegant and distinctive vegetable dishes.",
    ingredients: ["okra", "onion", "cumin", "coriander powder", "turmeric", "mustard oil", "lemon"],
    missingIngredients: ["amchur powder", "fennel powder"],
    steps: [
      { step: 1, title: "Prepare the stuffing", instruction: "Mix together: 2 tsp coriander powder, 1 tsp cumin powder, 1 tsp fennel powder (saunf), 1 tsp amchur, 1/2 tsp chilli powder, 1/4 tsp turmeric and 1 tsp salt. This dry spice mixture is the stuffing. Add 1 finely chopped small onion to the spice mix and mix well." },
      { step: 2, title: "Stuff the okra", instruction: "Select 400g fresh, firm okra of roughly equal size. Wash and dry completely — wet okra becomes slimy when cooked. Cut off both ends. Make a slit lengthwise through each okra without cutting all the way through — create a pocket. Using a small spoon or your fingers, stuff the spice mixture into each okra pocket, pressing firmly. Do not overfill or they will burst open while cooking." },
      { step: 3, title: "Pan fry until tender", instruction: "Heat 3 tbsp mustard oil in a wide flat pan until smoking, then reduce heat to medium. Place stuffed okra in a single layer in the pan. Cook undisturbed for 4 minutes until the bottom is golden. Flip carefully. Cook another 4 minutes. Toss gently and cook a final 3–4 minutes until all sides are slightly crispy and the okra is tender but not mushy. Sprinkle a little extra amchur at the end.", tip: "Never cover okra while cooking — steam makes it slimy. Always cook uncovered on medium heat." },
    ],
    proTip: "Completely dry okra before cooking is non-negotiable. Even a drop of moisture creates sliminess that nothing can fix.",
  },
  {
    id: 224, title: "Dahi Ke Kebab", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=700",
    readyInMinutes: 40, servings: 4, difficulty: "Medium",
    tags: ["dahi ke kebab", "yogurt kebab", "awadhi", "soft kebab", "north indian"],
    description: "Lucknow's melt-in-the-mouth yogurt kebabs — hung curd mixed with paneer, cashews and aromatic spices, shaped into patties and shallow fried until golden. Delicate, sophisticated and utterly unique.",
    ingredients: ["yogurt", "paneer", "cashews", "onion", "ginger", "cardamom", "garam masala", "ghee"],
    missingIngredients: ["hung curd", "bread crumbs", "rose petals"],
    steps: [
      { step: 1, title: "Make hung curd", instruction: "Place 2 cups thick yogurt in a muslin cloth. Tie the top and hang over a bowl in the refrigerator for 4–6 hours or overnight. The whey drains out leaving hung curd — thick, creamy and almost cheese-like. You should end up with about 3/4 cup of hung curd. This drying step is what allows the kebab to hold its shape." },
      { step: 2, title: "Make the kebab mixture", instruction: "Mix the hung curd with 100g grated paneer, 2 tbsp finely chopped cashews, 1 small onion (very finely chopped and squeezed dry), 1 tsp grated ginger, 1 chopped green chilli, 1/4 tsp cardamom powder, 1/2 tsp garam masala, 2 tbsp breadcrumbs (for binding) and salt. Mix well. Refrigerate the mixture for 30 minutes — cold mixture is much easier to shape." },
      { step: 3, title: "Shape and shallow fry", instruction: "Take 2 tbsp of mixture and shape into a round patty. If it is too sticky to shape, add a little more breadcrumb. Shallow fry in ghee on medium heat for 3 minutes per side until golden. These are very delicate — handle gently when flipping. Serve immediately with mint chutney and pomegranate seeds on top." },
    ],
    proTip: "The colder the mixture before shaping, the easier it is to form patties. Work quickly with cold hands.",
  },
  {
    id: 225, title: "Sindhi Kadhi", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=700",
    readyInMinutes: 45, servings: 4, difficulty: "Medium",
    tags: ["sindhi kadhi", "besan curry", "sindhi food", "tangy", "north indian"],
    description: "Sindhi cuisine's signature kadhi — made entirely from besan (no yogurt) with an extraordinary mix of vegetables in a tangy tamarind-based broth. Completely different from Punjabi kadhi and uniquely flavoured.",
    ingredients: ["potato", "carrot", "eggplant", "onion", "tomato", "cumin", "mustard seeds", "turmeric", "ghee"],
    missingIngredients: ["besan", "tamarind", "drumstick", "lotus stem", "curry leaves"],
    steps: [
      { step: 1, title: "Roast the besan", instruction: "Heat 3 tbsp ghee in a heavy pot. Add 3 tbsp besan and roast on medium heat, stirring continuously for 4–5 minutes until it turns golden and smells nutty. This roasting removes the raw flavour. Add 1 tsp cumin seeds and a pinch of asafoetida." },
      { step: 2, title: "Add water and make the base", instruction: "Gradually add 4 cups water to the roasted besan while whisking continuously to prevent lumps. Add tamarind extract (3 tbsp), 1/4 tsp turmeric, chilli powder and salt. Bring to a boil, stirring frequently, until the broth thickens slightly from the besan." },
      { step: 3, title: "Add vegetables and cook", instruction: "Add chopped vegetables — potato, carrot, drumstick pieces, lotus stem (if available) and eggplant. Bring to a boil then reduce heat and simmer covered for 20 minutes until all vegetables are completely tender. Taste and adjust sourness with more tamarind if needed." },
      { step: 4, title: "Temper", instruction: "Heat 1 tbsp ghee. Add mustard seeds — pop. Add dried red chilli and curry leaves. Pour over the kadhi. Serve with steamed rice and papad." },
    ],
    proTip: "Sindhi kadhi uses tamarind (not yogurt) for sourness — this is what makes it completely different from other Indian kadhis.",
  },
  {
    id: 226, title: "Methi Aloo", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1574484284002-952d92456975?w=700",
    readyInMinutes: 25, servings: 3, difficulty: "Easy",
    tags: ["methi aloo", "fenugreek potato", "winter dish", "north indian", "dry sabzi"],
    description: "A winter North Indian favourite — fresh fenugreek leaves stir-fried with potatoes and spices. The slightly bitter methi balances the earthy potatoes beautifully. Quick, nutritious and delicious.",
    ingredients: ["potato", "onion", "garlic", "ginger", "cumin", "turmeric", "mustard oil"],
    missingIngredients: ["fenugreek leaves", "ajwain"],
    steps: [
      { step: 1, title: "Prep methi leaves", instruction: "Pick 2 large bunches of fresh methi (fenugreek) leaves, discarding thick stems. Wash thoroughly. Finely chop all the leaves. Sprinkle with salt, rest 5 minutes then lightly squeeze out excess moisture — this reduces bitterness." },
      { step: 2, title: "Cook potatoes first", instruction: "Heat 2 tbsp mustard oil until smoking, then reduce heat. Add 1/2 tsp ajwain seeds and 1 tsp cumin seeds. Add 3 medium potatoes (diced into 1.5cm cubes) with 1/4 tsp turmeric and salt. Cook covered on medium heat for 8 minutes, tossing occasionally, until potatoes are almost cooked." },
      { step: 3, title: "Add methi and finish", instruction: "Add finely chopped onion, ginger-garlic paste and 1/2 tsp chilli powder. Cook 3 minutes. Add the chopped methi leaves. Toss well. Cook uncovered on medium-high heat for 5 minutes, stirring, until the methi wilts completely and the excess moisture evaporates. The dish should be dry." },
    ],
    proTip: "Salting and squeezing the methi leaves before cooking is a traditional technique to moderate their bitterness.",
  },
  {
    id: 227, title: "Tilwale Aloo", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1574484284002-952d92456975?w=700",
    readyInMinutes: 25, servings: 3, difficulty: "Easy",
    tags: ["tilwale aloo", "sesame potatoes", "north indian", "quick sabzi", "nutty"],
    description: "Potatoes coated in a sesame-spice crust and pan-fried until golden and crunchy. The toasted sesame seeds add a nutty richness that elevates a simple potato dish to something special.",
    ingredients: ["potato", "cumin", "coriander powder", "turmeric", "lemon", "ghee", "cilantro"],
    missingIngredients: ["sesame seeds", "amchur powder"],
    steps: [
      { step: 1, title: "Par-boil and coat potatoes", instruction: "Boil 500g baby potatoes or cubed potatoes until almost cooked. Drain and cool. Mix together: 3 tbsp white sesame seeds, 1 tsp cumin seeds, 1/2 tsp coriander powder, 1/2 tsp turmeric, 1/2 tsp chilli powder, 1/2 tsp amchur and salt. Toss the parboiled potatoes in this mixture, coating evenly." },
      { step: 2, title: "Pan fry until sesame is golden", instruction: "Heat 2 tbsp ghee in a flat pan on medium heat. Add the sesame-coated potatoes. Cook without stirring for 3–4 minutes until the sesame seeds on the bottom turn golden and nutty-fragrant. Toss gently. Cook another 3–4 minutes until all sides are golden and the sesame seeds are toasted. Do not burn — sesame burns quickly.", tip: "Medium heat is essential — sesame seeds go from golden to burnt in seconds on high heat." },
      { step: 3, title: "Finish and serve", instruction: "Squeeze lemon juice over the potatoes and garnish with fresh coriander. Serve as a side dish or snack." },
    ],
    proTip: "The sesame seeds must be toasted to golden — pale sesame has almost no flavour, toasted sesame has an intense nutty fragrance.",
  },
  {
    id: 228, title: "Arbi Fry (Colocasia)", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1574484284002-952d92456975?w=700",
    readyInMinutes: 30, servings: 3, difficulty: "Easy",
    tags: ["arbi fry", "colocasia", "taro", "north indian", "crispy", "ajwain"],
    description: "Crispy pan-fried taro root with ajwain and amchur — one of North India's most loved root vegetable dishes. The ajwain (carom seeds) is essential as it aids digestion of the starchy taro.",
    ingredients: ["garlic", "cumin", "turmeric", "mustard oil", "lemon"],
    missingIngredients: ["arbi taro root", "ajwain", "amchur powder"],
    steps: [
      { step: 1, title: "Boil arbi carefully", instruction: "Wash 500g arbi (taro root). Boil in salted water for 12–15 minutes until just tender — a knife goes in but it should not be mushy. Drain and cool completely. Peel — the skin slides off easily after boiling. Cut into thick rounds (1.5cm). Handle with care as arbi can cause itching on hands for some people — use gloves or oil your hands first." },
      { step: 2, title: "Shallow fry until crispy", instruction: "Heat 3 tbsp mustard oil in a flat pan until smoking hot, then reduce to medium. Add 1/2 tsp ajwain seeds — let them splutter for 10 seconds. Add arbi rounds in a single layer. Cook undisturbed for 4 minutes until the bottom is golden and crispy. Flip carefully and cook the other side 4 minutes." },
      { step: 3, title: "Season and finish", instruction: "Add 1/2 tsp turmeric, 1/2 tsp chilli powder, 1/2 tsp amchur powder and salt. Toss gently to coat all pieces. Cook 2 more minutes. Squeeze lemon and garnish with cilantro." },
    ],
    proTip: "The golden crust develops only if the oil is hot enough before adding arbi. Test by adding a small piece — it should sizzle immediately.",
  },
  {
    id: 229, title: "Bread Pakora", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1485963631004-f2f00b1d6606?w=700",
    readyInMinutes: 20, servings: 4, difficulty: "Easy",
    tags: ["bread pakora", "street food", "north indian", "monsoon snack", "quick"],
    description: "North India's favourite monsoon street snack — bread sandwiched with spiced potato filling, dipped in thick besan batter and deep fried until golden. Eaten with green chutney and chai.",
    ingredients: ["bread", "potato", "onion", "cumin", "coriander powder", "ginger", "cilantro", "vegetable oil"],
    missingIngredients: ["besan", "ajwain", "amchur powder"],
    steps: [
      { step: 1, title: "Make spiced potato filling", instruction: "Boil and mash 3 medium potatoes until smooth. Mix with 1 finely chopped small onion, 1 tsp grated ginger, 1 green chilli (finely chopped), 1/2 tsp cumin powder, 1/2 tsp amchur, 1/4 tsp chilli powder, chopped coriander and salt. The filling must be well-seasoned — it is the main flavour in the dish." },
      { step: 2, title: "Make the pakora batter", instruction: "Mix 1.5 cups besan with 1/4 tsp ajwain, 1/4 tsp chilli powder, a pinch of baking soda and salt. Add water gradually, whisking to a smooth, thick batter — thick enough to coat the back of a spoon. Rest 10 minutes." },
      { step: 3, title: "Assemble and fry", instruction: "Spread potato filling on one bread slice and cover with another slice. Optionally spread green chutney inside the sandwich. Cut into triangles or leave whole. Dip completely in batter ensuring all surfaces are coated. Deep fry in hot oil at 175°C for 3–4 minutes, turning, until deep golden on all sides. Serve immediately with green chutney and tamarind chutney." },
    ],
    proTip: "Bread pakora must be eaten the moment it comes out of the oil — it goes from crispy to soggy within 5 minutes.",
  },
  {
    id: 230, title: "Lauki Ka Halwa", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=700",
    readyInMinutes: 50, servings: 4, difficulty: "Medium",
    tags: ["lauki halwa", "bottle gourd halwa", "north indian", "light dessert", "kheer"],
    description: "North India's underrated dessert — grated bottle gourd (lauki) cooked in milk until soft and creamy, then sweetened and flavoured with cardamom and khoya. Lighter than other halwas but equally satisfying.",
    ingredients: ["milk", "sugar", "ghee", "cardamom", "cashews"],
    missingIngredients: ["bottle gourd", "khoya", "saffron"],
    steps: [
      { step: 1, title: "Grate and squeeze lauki", instruction: "Peel and grate 800g bottle gourd (lauki). Squeeze out as much water as possible with your hands — this is important as lauki has high water content. The squeezed water can be drunk (it is healthy) or discarded. You should have about 2 cups of squeezed grated lauki." },
      { step: 2, title: "Cook in milk", instruction: "Heat 2 tbsp ghee in a heavy pan. Add grated lauki and fry on medium heat for 5 minutes, stirring, until the raw smell disappears. Add 2 cups full-fat milk. Cook on medium heat, stirring frequently, for 25–30 minutes until the milk is completely absorbed and the lauki mixture is thick and dry-ish." },
      { step: 3, title: "Add khoya and sweeten", instruction: "Add 100g crumbled khoya (or mawa) to the cooked lauki. Cook stirring 5 minutes until the khoya is absorbed. Add sugar to taste (approximately 1/2 cup) and stir until dissolved. Add cardamom powder, saffron dissolved in milk, and fried cashews in ghee. Cook 3 more minutes until glossy. Serve warm or at room temperature." },
    ],
    proTip: "Squeezing out as much water as possible from the lauki before cooking significantly reduces cooking time and prevents a watery halwa.",
  },
  {
    id: 231, title: "Karela Fry (Bitter Gourd)", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1574484284002-952d92456975?w=700",
    readyInMinutes: 30, servings: 3, difficulty: "Easy",
    tags: ["karela fry", "bitter gourd", "north indian", "diabetic friendly", "dry sabzi"],
    description: "The art of making bitter gourd delicious — thin-sliced karela fried crispy with onions and spices. The bitterness is reduced by salting and the caramelisation makes it genuinely addictive.",
    ingredients: ["onion", "garlic", "cumin", "turmeric", "coriander powder", "mustard oil"],
    missingIngredients: ["bitter gourd karela", "ajwain", "amchur powder"],
    steps: [
      { step: 1, title: "Reduce bitterness", instruction: "Scrape the ridged skin of 300g karela lightly with a peeler. Slice into thin rounds (4–5mm). Sprinkle generously with salt and 1/2 tsp turmeric. Toss well and rest for 20–30 minutes. The salt draws out bitter juices. Squeeze out all liquid thoroughly with your hands. Rinse lightly and pat completely dry with a kitchen towel.", tip: "Squeezing out the liquid after salting is the traditional method to reduce bitterness — do not skip it." },
      { step: 2, title: "Fry karela until crispy", instruction: "Heat 3 tbsp mustard oil until smoking, then reduce to medium. Add karela slices — do not crowd the pan, fry in two batches if needed. Fry on medium heat for 12–15 minutes, stirring occasionally, until the slices are dark, crispy and slightly shrunken. The longer they fry the crispier they become." },
      { step: 3, title: "Add onion and spices", instruction: "Add 1 large onion (thinly sliced) to the fried karela. Cook 5 minutes until the onion is golden and slightly caramelised. Add 1/2 tsp cumin powder, 1/2 tsp coriander powder, 1/4 tsp chilli powder and amchur. Toss well. Serve with dal and rice." },
    ],
    proTip: "The darker the karela fries, the crisper and less bitter it becomes. Aim for a deep golden-brown, almost mahogany colour.",
  },
  {
    id: 232, title: "Sabudana Khichdi", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=700",
    readyInMinutes: 20, servings: 3, difficulty: "Medium",
    tags: ["sabudana khichdi", "sago", "fasting food", "maharashtrian", "navratri"],
    description: "Maharashtra's beloved fasting dish — sago pearls (tapioca) stir-fried with potatoes, peanuts and curry leaves. Eaten during religious fasts when grains are not permitted. Light but incredibly satisfying.",
    ingredients: ["potato", "peanuts", "cumin", "lemon", "cilantro", "ghee"],
    missingIngredients: ["sabudana tapioca pearls", "curry leaves", "green chilli"],
    steps: [
      { step: 1, title: "Soak sabudana correctly", instruction: "Rinse 1.5 cups sabudana (tapioca pearls) in cold water until water runs clear. Soak in just enough water to cover them by 1cm — no more water than this. Soak for 4–6 hours. After soaking, each pearl should be soft and translucent and you should be able to crush it between your fingers easily. If still hard and chalky, soak 1–2 hours more. Correct soaking is the entire difference between good and bad sabudana khichdi.", tip: "Too much water during soaking = sticky, gummy sabudana that clumps together. Just enough water = separate, fluffy pearls." },
      { step: 2, title: "Dry roast and crush peanuts", instruction: "Dry roast 1/2 cup peanuts until golden and crunchy. Cool and crush coarsely — some fine powder and some larger pieces. Mix peanuts with the soaked and drained sabudana, 1/2 tsp cumin powder and salt. The peanuts absorb excess moisture and add crunch." },
      { step: 3, title: "Cook and toss", instruction: "Heat 2 tbsp ghee in a wide pan. Add 1 tsp cumin seeds. Add 2 medium potatoes (boiled and cubed), 1 slit green chilli and curry leaves. Toss potatoes for 2 minutes. Add the sabudana-peanut mixture. Toss gently on medium heat for 4–5 minutes until sabudana turns translucent — this means it is cooked. Do not over-cook or it becomes sticky and gummy. Add lemon juice and coriander." },
    ],
    proTip: "Sabudana is done when it turns completely translucent. White/opaque pearls are undercooked. Translucent and slightly sticky is correct.",
  },
  {
    id: 233, title: "Hara Bhara Kebab", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=700",
    readyInMinutes: 35, servings: 4, difficulty: "Easy",
    tags: ["hara bhara kebab", "green kebab", "spinach potato", "north indian", "starter"],
    description: "Vivid green tikki-style kebabs made from spinach, peas and potato — crispy outside, soft inside and packed with vegetables. The green colour comes entirely from fresh spinach and peas, making them as beautiful as they are nutritious.",
    ingredients: ["spinach", "peas", "potato", "garlic", "ginger", "cumin", "coriander powder", "ghee"],
    missingIngredients: ["besan", "chaat masala"],
    steps: [
      { step: 1, title: "Blanch greens", instruction: "Blanch 2 cups spinach in boiling salted water for 1 minute until wilted and bright green. Immediately transfer to ice cold water — this preserves the vivid green colour. Drain and squeeze out all water thoroughly. Blend to a smooth green paste. Boil 1 cup peas and lightly mash. The spinach must be completely squeezed dry before using." },
      { step: 2, title: "Make the kebab mixture", instruction: "Boil and mash 2 large potatoes completely smooth. Mix with the spinach paste, mashed peas, 1 tsp grated ginger, 1 chopped green chilli, 1/2 tsp cumin powder, 1/2 tsp coriander powder, chaat masala and salt. Add 2 tbsp roasted besan to bind and absorb moisture. Mix well. Refrigerate 20 minutes." },
      { step: 3, title: "Shape and shallow fry", instruction: "Shape into round, flat tikkis. Roll each tikki in breadcrumbs or extra besan for a crispy coating. Shallow fry in ghee on medium heat for 3 minutes per side until beautifully golden and crispy on the outside. The green interior will be revealed when cut. Serve with mint chutney." },
    ],
    proTip: "The ice-water bath for the blanched spinach is what keeps the kebabs brilliantly green even after cooking.",
  },
  {
    id: 234, title: "Khoya Gulab Jamun", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=700",
    readyInMinutes: 45, servings: 20, difficulty: "Hard",
    tags: ["khoya gulab jamun", "mawa", "traditional", "festival sweet", "diwali", "north indian"],
    description: "The original, traditional gulab jamun made entirely from khoya (reduced milk solids) — far superior to the modern milk powder version. Dense, rich and soaking in rose-scented sugar syrup.",
    ingredients: ["ghee", "sugar", "cardamom", "milk"],
    missingIngredients: ["khoya mawa", "maida", "rose water", "saffron"],
    steps: [
      { step: 1, title: "Make the dough", instruction: "Grate or crumble 250g soft khoya into a bowl. Add 2 tbsp plain flour (maida) and 1/4 tsp baking soda. Mix gently with your fingers until it comes together into a smooth, soft dough. Do not over-knead — too much kneading makes the gulab jamun hard. If the dough cracks, add 1 tsp warm milk at a time. Rest 10 minutes covered." },
      { step: 2, title: "Make sugar syrup first", instruction: "Dissolve 2 cups sugar in 1.5 cups water. Bring to a boil, add a pinch of saffron and simmer 5 minutes until a very light, thin syrup forms (no string consistency). Add rose water and 1/4 tsp cardamom powder. Keep warm on the lowest heat — syrup must be warm when gulab jamuns are added." },
      { step: 3, title: "Shape and fry", instruction: "Divide dough into 20 equal smooth balls with no cracks. Heat ghee or oil to 140°C — very low. Add a few balls and fry on very low heat for 8–10 minutes, gently stirring, until evenly deep golden-brown. The low heat allows the inside to cook before the outside browns. Immediately transfer hot gulab jamuns to the warm sugar syrup. They will swell as they soak." },
    ],
    proTip: "140°C oil temperature is correct — most people fry too hot and get gulab jamuns that are brown outside and raw inside.",
  },
  {
    id: 235, title: "Nimbu Achar (Lemon Pickle)", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=700",
    readyInMinutes: 30, servings: 20, difficulty: "Easy",
    tags: ["nimbu achar", "lemon pickle", "north indian", "condiment", "instant"],
    description: "North India's essential lemon pickle — quartered lemons preserved in salt, spices and mustard oil. This instant version is ready to eat in a few days, unlike traditional pickles that take weeks.",
    ingredients: ["lemon", "mustard seeds", "cumin", "turmeric", "mustard oil"],
    missingIngredients: ["black salt", "fenugreek seeds", "fennel seeds", "asafoetida"],
    steps: [
      { step: 1, title: "Prepare lemons", instruction: "Take 10 firm, thin-skinned lemons. Wipe completely dry — even a drop of water causes moulds in pickles. Quarter each lemon but do not cut all the way through — keep the base attached so it stays in one piece. Stuff a pinch of salt deep inside each quartered lemon." },
      { step: 2, title: "Make the masala", instruction: "Dry roast 1 tsp fenugreek seeds and 1 tsp fennel seeds until fragrant. Grind coarsely. Mix with 2 tsp salt, 1 tsp turmeric, 1 tsp red chilli powder, 1/2 tsp black salt and the ground fenugreek-fennel. This is the pickle masala." },
      { step: 3, title: "Combine and preserve", instruction: "Pack the stuffed lemons tightly into a sterilised glass jar. Pour in the pickle masala and 3 tbsp raw mustard oil. Seal and keep in a sunny spot for 3–5 days, shaking the jar daily. The lemons will soften and the flavours will meld. Ready when the skin has softened." },
    ],
    proTip: "Every utensil, jar and hand that touches the pickle must be completely dry. Moisture is the enemy of any pickle.",
  },

  // ── SOUTH INDIAN (236–260) ────────────────────────────────────────────────

  {
    id: 236, title: "Pongal Vadai Combo", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=700",
    readyInMinutes: 45, servings: 4, difficulty: "Medium",
    tags: ["pongal vada", "south indian breakfast", "combo", "temple food", "Tamil Nadu"],
    description: "Tamil Nadu's classic temple-style breakfast combination — soft, peppery ven pongal served alongside crispy medu vadas with sambar and coconut chutney. The contrast of textures and temperatures is the entire experience.",
    ingredients: ["rice", "ghee", "cumin", "black pepper", "ginger", "cashews", "curry leaves", "mustard seeds"],
    missingIngredients: ["moong dal", "urad dal", "asafoetida"],
    steps: [
      { step: 1, title: "Make ven pongal base", instruction: "Dry roast 1/2 cup moong dal until lightly golden and fragrant. Wash with 1 cup raw rice. Pressure cook together with 4 cups water, 1/2 tsp turmeric and salt for 4–5 whistles until completely mushy. Mash to a creamy, porridge-like consistency. Season generously with salt." },
      { step: 2, title: "Make pongal tempering", instruction: "Heat 3 tbsp ghee until very hot. Add 1 tsp cumin seeds and 1 tsp coarsely cracked black pepper — these two together are the defining flavour. Add a pinch of asafoetida, 10 fresh curry leaves (they will splutter), 1 tsp grated ginger and 12 cashews. Fry until cashews are golden. Pour over pongal and mix." },
      { step: 3, title: "Make medu vadas", instruction: "Grind soaked urad dal with minimal water to a light, fluffy batter that floats in water. Season with salt, green chilli, curry leaves and black pepper. Deep fry in circular doughnut shape at 175°C until golden. The pongal and vada should be served together while both are hot." },
    ],
    proTip: "Pongal must be eaten immediately — it thickens into a solid mass within 10 minutes of cooling.",
  },
  {
    id: 237, title: "Chana Dal Sundal", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=700",
    readyInMinutes: 30, servings: 4, difficulty: "Easy",
    tags: ["sundal", "chana dal", "navratri", "beach snack", "south indian", "protein"],
    description: "South India's protein-packed beach and festival snack — cooked chana dal tossed with coconut, curry leaves and mustard seeds. Sold on Chennai's Marina Beach and prepared as naivedyam (offering) during Navratri.",
    ingredients: ["coconut", "mustard seeds", "cumin", "curry leaves", "lemon", "garlic"],
    missingIngredients: ["chana dal", "urad dal", "dried red chilli", "asafoetida"],
    steps: [
      { step: 1, title: "Cook chana dal perfectly", instruction: "Soak 1 cup chana dal for 2 hours. Pressure cook with just enough water to cover, salt and a pinch of turmeric for 2–3 whistles. The dal should be cooked through but each grain must remain separate — not mushy. Drain any excess water. Overcooked sundal is not sundal." },
      { step: 2, title: "Make the tempering", instruction: "Heat 2 tbsp oil in a pan. Add 1 tsp mustard seeds — let pop completely. Add 1 tsp urad dal — fry golden. Add 1 dried red chilli, a generous pinch of asafoetida and a generous bunch of fresh curry leaves. They will splutter dramatically." },
      { step: 3, title: "Toss and finish", instruction: "Add the cooked chana dal to the tempering. Toss on high heat for 2 minutes. Remove from heat. Add 3 tbsp fresh grated coconut, 2 tsp lemon juice, salt to taste. Toss well. Serve warm or at room temperature." },
    ],
    proTip: "Sundal is all about the textural contrast — each grain firm and separate. Never overcook the lentils.",
  },
  {
    id: 238, title: "Avial", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=700",
    readyInMinutes: 35, servings: 5, difficulty: "Medium",
    tags: ["avial", "onam sadya", "mixed vegetables", "kerala", "coconut yogurt"],
    description: "Kerala's magnificent mixed vegetable dish — up to 11 different vegetables cooked in a thick coconut-cumin paste and finished with yogurt and fresh curry leaves. The Onam sadya's centrepiece vegetable preparation.",
    ingredients: ["carrot", "potato", "eggplant", "peas", "drumstick", "yogurt", "coconut", "cumin", "turmeric", "curry leaves"],
    missingIngredients: ["raw banana", "ash gourd", "yam", "coconut oil", "raw mango"],
    steps: [
      { step: 1, title: "Cut and cook vegetables", instruction: "The beauty of avial is the variety — use any combination of at least 5 different vegetables. Classic choices: carrot, raw banana, yam, ash gourd, drumstick, potato, eggplant and raw mango. Cut all into uniform 5cm long, 1cm wide baton shapes so they cook at the same rate. Cook in a pot with 1/2 cup water, 1/4 tsp turmeric and salt on medium heat for 8–10 minutes until just tender but still firm." },
      { step: 2, title: "Make coconut-cumin paste", instruction: "Grind 3/4 cup fresh grated coconut with 1 tsp cumin seeds, 3 green chillies and a pinch of turmeric to a coarse, thick paste. Add to the cooked vegetables. Cook together 5 minutes, mixing gently so the paste coats every piece of vegetable." },
      { step: 3, title: "Add yogurt and finish with curry leaves", instruction: "Remove from heat. Add 1/2 cup slightly sour yogurt and mix gently. Return to very low heat for 2 minutes — do not cook the yogurt. Add a generous bunch of fresh curry leaves and 2 tbsp raw coconut oil — the uncooked coconut oil adds a distinct freshness. Mix gently. The avial should be thick and creamy." },
    ],
    proTip: "Never boil avial after adding yogurt — it curdles and separates. Remove from heat first, then add yogurt.",
  },
  {
    id: 239, title: "Kozhi Varutharacha Curry", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=700",
    readyInMinutes: 55, servings: 4, difficulty: "Hard",
    tags: ["varutharacha curry", "roasted coconut chicken", "kerala", "special occasion"],
    description: "Kerala's most flavourful chicken curry — made with a deeply roasted coconut paste (varutharacha means 'roasted and ground'). The coconut is roasted until almost black, giving the curry a uniquely smoky, intense flavour impossible to achieve any other way.",
    ingredients: ["chicken", "onion", "garlic", "ginger", "coconut", "turmeric", "black pepper", "curry leaves", "coconut oil"],
    missingIngredients: ["whole spices", "shallots", "kashmiri chilli"],
    steps: [
      { step: 1, title: "Make the roasted coconut paste — the heart of this dish", instruction: "Heat a dry pan on medium heat. Add 1 cup fresh grated coconut with 5 shallots (halved) and 5 garlic cloves. Roast, stirring constantly, for 10–15 minutes until the coconut turns deep mahogany-brown — almost black at some edges. The colour should alarm you slightly — this is correct. Add 1 tsp coriander seeds and 1/2 tsp black pepper and roast 1 more minute. Cool and blend with a little water to a fine paste.", tip: "The deep brown to almost black colour is the goal. Pale roasted coconut makes a pale curry. Dark roasted coconut makes a dark, extraordinarily flavourful curry." },
      { step: 2, title: "Build the curry base", instruction: "Heat 3 tbsp coconut oil. Add whole spices (cardamom, cloves, cinnamon). Add sliced onions and cook 10 minutes until golden. Add ginger-garlic paste and curry leaves. Add 2 tsp Kashmiri chilli powder and 1/4 tsp turmeric. Cook 2 minutes." },
      { step: 3, title: "Add chicken and roasted coconut paste", instruction: "Add chicken pieces and brown on all sides. Add the roasted coconut paste and mix to coat all the chicken. Add 1.5 cups warm water. Simmer covered 25 minutes until chicken is completely tender. Uncover and cook on high heat 5 minutes to thicken the gravy. Temper with fresh curry leaves in coconut oil." },
    ],
    proTip: "This curry improves dramatically the next day as the roasted coconut paste flavours fully infuse the gravy.",
  },
  {
    id: 240, title: "Parippu Curry (Kerala Dal)", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=700",
    readyInMinutes: 25, servings: 4, difficulty: "Easy",
    tags: ["parippu curry", "moong dal", "kerala", "onam sadya", "first course"],
    description: "Kerala's simple yellow moong dal — served as the first course on an Onam sadya banana leaf, poured over rice with a drizzle of ghee. Mild, comforting and always the first thing served at every Kerala feast.",
    ingredients: ["coconut", "cumin", "garlic", "turmeric", "mustard seeds", "curry leaves", "ghee"],
    missingIngredients: ["moong dal", "shallots", "coconut oil"],
    steps: [
      { step: 1, title: "Cook moong dal", instruction: "Pressure cook 1 cup yellow moong dal with 2.5 cups water and 1/2 tsp turmeric for 3 whistles until completely soft and creamy. Whisk smooth. It should be liquid enough to pour over rice." },
      { step: 2, title: "Add coconut paste", instruction: "Grind 1/2 cup fresh coconut with 1/2 tsp cumin and 1 garlic clove to a smooth paste. Add to the cooked dal with salt. Simmer together on low heat 5 minutes until well combined." },
      { step: 3, title: "Make Kerala tadka", instruction: "Heat 2 tbsp coconut oil. Add mustard seeds — pop. Add 2–3 shallots (halved, not chopped) and fry until golden. Add dried red chilli and curry leaves. Pour over the dal. Add a drizzle of raw coconut oil on top. Serve with a spoon of ghee over rice." },
    ],
    proTip: "Onam parippu curry is intentionally mild and liquid — it is the gentle beginning of the feast, not a bold statement.",
  },
  {
    id: 241, title: "Sambar Sadam (Sambar Rice)", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1596797038530-2c107229654b?w=700",
    readyInMinutes: 30, servings: 3, difficulty: "Easy",
    tags: ["sambar sadam", "sambar rice", "one pot", "south indian", "comfort food"],
    description: "Sambar rice — rice and sambar cooked together into one comforting dish, topped with ghee. The simplest, most satisfying South Indian meal.",
    ingredients: ["rice", "tomato", "onion", "garlic", "mustard seeds", "turmeric", "ghee", "curry leaves"],
    missingIngredients: ["toor dal", "tamarind", "sambar powder", "asafoetida"],
    steps: [
      { step: 1, title: "Make a quick sambar", instruction: "Cook 1/2 cup toor dal with 1.5 cups water until soft. In a pot, cook 1 onion, 2 tomatoes, drumstick (if available) and mixed vegetables with tamarind extract and 2 cups water for 10 minutes. Add the cooked dal, 2 tsp sambar powder, turmeric and salt. Simmer 10 minutes." },
      { step: 2, title: "Combine with rice", instruction: "Cook 1.5 cups rice and cool slightly. Mix the hot sambar into the rice — the rice should absorb most of the sambar liquid and the consistency should be semi-dry and porridge-like." },
      { step: 3, title: "Temper and finish", instruction: "Heat 2 tbsp ghee. Add mustard seeds, curry leaves and asafoetida. Pour over the sambar rice. Mix and serve topped with more ghee. Serve with papad and pickle." },
    ],
    proTip: "Sambar sadam should be slightly wetter than plain rice — it will absorb the remaining moisture as it rests.",
  },
  {
    id: 242, title: "Nei Payasam", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=700",
    readyInMinutes: 30, servings: 4, difficulty: "Medium",
    tags: ["nei payasam", "ghee payasam", "kerala", "jaggery rice", "onam"],
    description: "Kerala's intensely ghee-rich rice payasam cooked in jaggery — similar to ada pradhaman but made with rice instead of ada. The name 'nei' means ghee — a generous amount is used.",
    ingredients: ["rice", "ghee", "cardamom", "cashews"],
    missingIngredients: ["jaggery", "raisins", "coconut milk"],
    steps: [
      { step: 1, title: "Fry rice in ghee", instruction: "Heat 3 tbsp ghee in a heavy pot. Add 1/2 cup washed raw rice. Fry stirring on medium heat for 3–4 minutes until the rice turns slightly golden and fragrant. This toasting step adds a nutty depth to the payasam." },
      { step: 2, title: "Cook rice in jaggery syrup", instruction: "Dissolve 1.5 cups jaggery in 2 cups water and strain. Add the strained jaggery syrup to the fried rice. Cook covered on medium heat for 15 minutes until rice is completely soft and has absorbed the jaggery syrup. The mixture will turn a beautiful dark amber colour from the jaggery." },
      { step: 3, title: "Add coconut milk and ghee", instruction: "Add 1 cup thin coconut milk and simmer 5 minutes. Add 1/2 cup thick coconut milk and stir — immediately lower heat. Add cardamom powder. Fry cashews and raisins in 2 tbsp ghee and pour over. The ghee drizzled over the top gives this payasam its characteristic rich gleam." },
    ],
    proTip: "Use the darkest jaggery available — the deeper the colour of the jaggery, the more complex and caramel-like the payasam will taste.",
  },
  {
    id: 243, title: "Gothsu (Raw Mango Curry)", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=700",
    readyInMinutes: 25, servings: 4, difficulty: "Easy",
    tags: ["gothsu", "raw mango curry", "Tamil Nadu", "pongal side", "tangy"],
    description: "Tamil Nadu's tangy, spicy raw mango relish — the traditional companion to ven pongal. Raw mango cooked with onion, tomato and spices into a thick, jammy sauce. Bold, sour and the perfect contrast to mild pongal.",
    ingredients: ["onion", "tomato", "garlic", "ginger", "mustard seeds", "turmeric", "curry leaves", "ghee"],
    missingIngredients: ["raw mango", "tamarind", "urad dal", "asafoetida"],
    steps: [
      { step: 1, title: "Pressure cook raw mango", instruction: "Peel and cut 1 large raw mango into rough pieces. Pressure cook with 1/2 cup water for 2 whistles until completely soft and mashable. Cool and mash completely — skin and flesh together into a rough pulp." },
      { step: 2, title: "Make the masala base", instruction: "Heat 2 tbsp oil. Add mustard seeds — pop. Add urad dal — golden. Add curry leaves and asafoetida. Add 1 medium onion (finely chopped) and cook 6 minutes. Add ginger-garlic paste, 2 tomatoes and all dry spices. Cook 8 minutes until oil surfaces." },
      { step: 3, title: "Add mango and simmer", instruction: "Add the mashed raw mango to the masala. Add 1/4 cup water and salt. Simmer together 8 minutes, stirring, until the gothsu is thick and jammy. Adjust tanginess — add a little tamarind if the mango is not sour enough. Serve with ven pongal." },
    ],
    proTip: "The sourness of gothsu should be assertive — it is meant to cut through the mild richness of pongal.",
  },
  {
    id: 244, title: "Vendakkai Mor Kuzhambu", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=700",
    readyInMinutes: 30, servings: 4, difficulty: "Easy",
    tags: ["okra curry", "mor kuzhambu", "Tamil Nadu", "yogurt curry", "okra"],
    description: "Pan-fried okra in a tangy yogurt-coconut curry — the combination of the slightly crispy fried okra and the sour cooling yogurt curry is extraordinary. A Tamil Nadu home-cooking staple.",
    ingredients: ["okra", "yogurt", "coconut", "cumin", "turmeric", "mustard seeds", "curry leaves"],
    missingIngredients: ["toor dal", "green chilli", "asafoetida", "coconut oil"],
    steps: [
      { step: 1, title: "Fry the okra separately", instruction: "Cut 300g okra into 2cm pieces. Dry completely. Heat oil in a pan and fry okra on medium-high heat for 8–10 minutes until slightly crispy and cooked through. Do not cover — steam makes okra slimy. Set aside." },
      { step: 2, title: "Make the mor kuzhambu", instruction: "Grind 1/4 cup coconut, 1 tsp cumin, 1 tsp coriander seeds, 1/2 tsp turmeric and 2 green chillies with a little water to a smooth paste. Beat 1.5 cups thick yogurt smooth. Mix in the coconut paste, salt and a pinch of sugar. Heat on LOW, stirring, until just warm — never boil." },
      { step: 3, title: "Combine and temper", instruction: "Add the fried okra to the yogurt curry. Mix gently. Temper with mustard seeds, urad dal, dried red chilli and curry leaves in coconut oil. Pour over the curry. Serve immediately with steamed rice." },
    ],
    proTip: "The okra must be fried separately before adding to the yogurt — otherwise it will become slimy and unpleasant in the dairy.",
  },
  {
    id: 245, title: "Vazhaithandu Kootu (Banana Stem)", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=700",
    readyInMinutes: 35, servings: 3, difficulty: "Medium",
    tags: ["vazhaithandu", "banana stem", "kootu", "Kerala", "Tamil Nadu", "digestive"],
    description: "A unique South Indian preparation using banana stem — a fibre-rich ingredient highly valued for digestive health. Cooked with lentils and coconut into a nutritious, mildly flavoured kootu.",
    ingredients: ["coconut", "cumin", "mustard seeds", "turmeric", "garlic", "curry leaves"],
    missingIngredients: ["banana stem", "chana dal", "urad dal", "coconut oil"],
    steps: [
      { step: 1, title: "Prepare banana stem", instruction: "Peeling banana stem requires patience. Remove the outer tough layers until you reach the white, tender core. As you slice, thread-like fibres appear — pull them out and discard (they are tough and stringy). Dice the cleaned white core into small pieces. Immediately place in salted water with a pinch of turmeric to prevent browning." },
      { step: 2, title: "Cook with dal", instruction: "Pressure cook chana dal with 1.5 cups water until soft. Drain banana stem pieces, cook in a separate pot with 1/4 tsp turmeric and salt until tender, about 10 minutes. Combine dal and banana stem." },
      { step: 3, title: "Add coconut paste and temper", instruction: "Grind 1/2 cup coconut with 1 tsp cumin, a garlic clove and 1/4 tsp black pepper to a coarse paste. Add to the dal-banana stem mixture. Cook together 5 minutes. Temper with mustard seeds, urad dal, dried red chilli and curry leaves in coconut oil." },
    ],
    proTip: "The threading fibres in banana stem must ALL be removed — even a single remaining thread ruins the entire dish with its tough, stringy texture.",
  },
  {
    id: 246, title: "Raw Jackfruit Curry", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=700",
    readyInMinutes: 45, servings: 4, difficulty: "Medium",
    tags: ["jackfruit curry", "kathal", "vegetarian meat", "south indian", "Kerala"],
    description: "Young green jackfruit cooked in a spiced coconut curry — the texture of jackfruit is remarkably meat-like, making this a favourite vegetarian dish that satisfies even confirmed meat-eaters. A Kerala and Tamil Nadu staple.",
    ingredients: ["onion", "tomato", "garlic", "ginger", "coconut", "cumin", "coriander powder", "turmeric", "curry leaves"],
    missingIngredients: ["raw jackfruit", "coconut oil", "whole spices"],
    steps: [
      { step: 1, title: "Prepare raw jackfruit", instruction: "Oil your hands and knife before handling raw jackfruit — it exudes a very sticky latex. Cut 500g raw jackfruit into 3cm chunks. Boil in salted water with 1/4 tsp turmeric for 15–20 minutes until tender. The jackfruit is done when you can pierce it easily with a fork. Drain and set aside. The boiling removes some of the stickiness and ensures even cooking." },
      { step: 2, title: "Make coconut masala", instruction: "In a pan, heat 2 tbsp coconut oil. Add sliced onions and cook until golden. Add ginger-garlic paste, tomatoes and all dry spices. Cook 10 minutes until masala is thick. Separately grind 1/2 cup coconut with 1 tsp cumin to a paste and add to the masala. Cook 3 more minutes." },
      { step: 3, title: "Add jackfruit and simmer", instruction: "Add the boiled jackfruit pieces to the masala. Add 1 cup water. Toss to coat all pieces in the masala. Simmer covered 15 minutes, tossing occasionally. The jackfruit absorbs the masala flavours and its texture becomes almost meaty. Add curry leaves tempered in coconut oil as a final topping." },
    ],
    proTip: "Oiling your hands and the knife before cutting raw jackfruit is essential — the latex is extremely sticky and difficult to remove without oil.",
  },
  {
    id: 247, title: "Poori Masala", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=700",
    readyInMinutes: 30, servings: 4, difficulty: "Medium",
    tags: ["poori masala", "south indian breakfast", "potato kurma", "Tamil Nadu", "weekend"],
    description: "South India's beloved weekend breakfast — fluffy puffed fried bread (puri) with a mildly spiced potato masala yellowed with turmeric. Different from North Indian aloo sabzi — this South Indian version uses coconut and curry leaves.",
    ingredients: ["flour", "potato", "onion", "mustard seeds", "turmeric", "curry leaves", "ginger", "ghee"],
    missingIngredients: ["urad dal", "chana dal", "dried red chilli", "asafoetida"],
    steps: [
      { step: 1, title: "Make poori dough", instruction: "Mix 2 cups whole wheat flour with 1/4 tsp salt and 1 tbsp oil. Add water gradually to make a stiff, firm dough — stiffer than roti. Over-kneading makes puris absorb more oil; knead just until smooth. Rest 15 minutes covered. Divide into 12 equal balls." },
      { step: 2, title: "Make the South Indian masala", instruction: "Heat 2 tbsp oil. Add mustard seeds — pop. Add urad dal and chana dal — golden. Add curry leaves, dried red chilli and asafoetida. Add 2 medium onions (thinly sliced) — cook 6 minutes until translucent. Add grated ginger and 1–2 green chillies. Add 1/2 tsp turmeric. Add 4 boiled and roughly mashed potatoes. Mix well. Add 1/4 cup water and cook 5 minutes. The masala should be semi-dry and bright yellow." },
      { step: 3, title: "Fry pooris and serve", instruction: "Roll each ball into a thin circle (about 3mm). Deep fry in hot oil (180°C). The puri puffs up immediately — gently press down with a slotted spoon to help it puff evenly, then flip after 30 seconds. Fry 30 seconds more. Drain. Serve immediately — pooris deflate within 5 minutes of frying." },
    ],
    proTip: "Oil in the dough reduces gluten development and is what makes puris puff. Do not skip the oil in the dough.",
  },
  {
    id: 248, title: "Kolhapuri Misal", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=700",
    readyInMinutes: 40, servings: 4, difficulty: "Medium",
    tags: ["kolhapuri misal", "maharashtrian", "spicy", "moth beans", "street food"],
    description: "Maharashtra's punishingly spicy sprouted moth bean curry topped with farsan, raw onion, tomato and lime. Kolhapuri misal is famous for its extraordinary heat level — not for the faint-hearted.",
    ingredients: ["onion", "tomato", "garlic", "ginger", "cumin", "coriander powder", "coconut", "mustard seeds"],
    missingIngredients: ["moth beans", "kolhapuri masala", "farsan", "pav bread"],
    steps: [
      { step: 1, title: "Sprout moth beans", instruction: "Soak 1 cup moth beans overnight. Drain and tie in a damp cloth. Rest in a warm place for 1.5–2 days until small sprouts appear. Sprouted beans have better nutrition and texture. Boil sprouted beans until just tender." },
      { step: 2, title: "Make the gravy (kat)", instruction: "Heat 3 tbsp oil. Add 1/2 tsp mustard seeds. Add 1 large onion (finely chopped) and cook 10 minutes until deep golden. Add ginger-garlic paste and tomatoes. Add 2 tsp Kolhapuri masala (or a combination of chilli powder, coriander powder, cumin, garam masala and roasted coconut paste). Cook until oil surfaces and the masala is dark and thick. Add 2 cups water and simmer 8 minutes to make the spicy gravy." },
      { step: 3, title: "Assemble", instruction: "Pour hot gravy into a bowl. Add cooked sprouted beans. Top with a generous handful of farsan (crunchy mixture), finely diced raw onion, diced tomato and a squeeze of lime. Serve with buttered pav bread. The combination of hot spicy curry, crunchy farsan and cold raw onion is the whole experience." },
    ],
    proTip: "Kolhapuri misal is supposed to be very, very spicy. Reducing the chilli makes it a completely different dish.",
  },
  {
    id: 249, title: "Muringakka Theeyal", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=700",
    readyInMinutes: 40, servings: 4, difficulty: "Medium",
    tags: ["theeyal", "drumstick", "Kerala", "roasted coconut", "tamarind"],
    description: "Kerala's spectacular roasted-coconut curry — drumstick pieces in a deep, dark, smoky gravy made from coconut roasted to a near-black colour and tamarind. The roasted coconut is the defining flavour.",
    ingredients: ["coconut", "onion", "garlic", "cumin", "turmeric", "mustard seeds", "curry leaves"],
    missingIngredients: ["drumstick", "tamarind", "shallots", "coconut oil"],
    steps: [
      { step: 1, title: "Roast coconut to dark brown", instruction: "Heat a dry pan on medium heat. Add 3/4 cup fresh grated coconut with 4 shallots and 3 garlic cloves. Roast stirring continuously for 12–15 minutes until the coconut turns deep dark brown — much darker than for most dishes. Add 1 tsp coriander seeds, 1/2 tsp cumin and 3 dried red chillies for the last 2 minutes. Cool completely and grind with water to a smooth, dark paste." },
      { step: 2, title: "Cook drumstick in tamarind", instruction: "Cut 2 drumsticks into 5cm pieces. Cook in a pot with 2 cups water, 1/4 tsp turmeric, salt and 3 tbsp tamarind extract for 10–12 minutes until drumstick is tender." },
      { step: 3, title: "Combine and simmer", instruction: "Add the roasted coconut paste to the drumstick pot. Stir well. Simmer 10 minutes until the curry is thick and dark. Temper with mustard seeds, shallots and curry leaves in coconut oil. The finished theeyal should be dark brown and intensely flavourful." },
    ],
    proTip: "The nearly black roasted coconut is what makes theeyal extraordinary — it is irreplaceable and cannot be substituted with raw coconut.",
  },
  {
    id: 250, title: "Ammini Kozhukattai", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=700",
    readyInMinutes: 30, servings: 3, difficulty: "Easy",
    tags: ["ammini kozhukattai", "mini rice balls", "Tamil Nadu", "evening snack", "tempered"],
    description: "Small, plain steamed rice flour balls tempered with mustard seeds, coconut and curry leaves — a popular Tamil Nadu evening snack and tiffin item. Simple, satisfying and completely addictive.",
    ingredients: ["coconut", "mustard seeds", "cumin", "curry leaves", "ghee"],
    missingIngredients: ["rice flour", "urad dal", "dried red chilli", "asafoetida"],
    steps: [
      { step: 1, title: "Make rice flour dough", instruction: "Boil 2 cups water with 1 tsp oil and salt. Remove from heat. Add 2 cups rice flour all at once and stir quickly with a spoon. Knead when slightly cool into a smooth, soft, pliable dough — no cracks. The dough should be soft enough to roll into smooth balls." },
      { step: 2, title: "Shape and steam", instruction: "Pinch small marble-sized balls from the dough, rolling smooth between your palms. Place on greased steamer plates without touching each other. Steam 8–10 minutes until the balls turn slightly translucent. Cool slightly." },
      { step: 3, title: "Temper and toss", instruction: "Heat 2 tbsp coconut oil in a pan. Add mustard seeds — pop. Add urad dal — golden. Add dried red chillies, curry leaves and asafoetida. Add the steamed rice balls and toss gently on high heat for 2 minutes. Add fresh grated coconut and mix. Serve warm." },
    ],
    proTip: "The balls must be fully steamed before tempering — remove from steamer only when they feel firm and look slightly translucent.",
  },
  {
    id: 251, title: "Paal Kozhukattai", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=700",
    readyInMinutes: 30, servings: 4, difficulty: "Easy",
    tags: ["paal kozhukattai", "milk rice balls", "Tamil dessert", "coconut milk", "Ganesh Chaturthi"],
    description: "Small rice flour dumplings cooked in a sweetened coconut milk — a gentle, comforting Tamil dessert made during festivals. The rice balls float in fragrant, cardamom-scented coconut milk.",
    ingredients: ["coconut milk", "sugar", "cardamom", "ghee"],
    missingIngredients: ["rice flour"],
    steps: [
      { step: 1, title: "Make and shape rice dumplings", instruction: "Make rice flour dough as in ammini kozhukattai. Shape into small smooth balls. Do not steam yet — these will be cooked directly in the coconut milk." },
      { step: 2, title: "Cook in thin coconut milk", instruction: "Bring 2 cups thin coconut milk to a simmer in a wide pan. Add the raw rice balls carefully. Cook on medium heat for 8–10 minutes until the balls are cooked through — they will float to the surface when done. Stir gently occasionally to prevent sticking." },
      { step: 3, title: "Add sugar and thick coconut milk", instruction: "Add sugar to taste (approximately 3 tbsp) and stir until dissolved. Add 1/2 cup thick coconut milk and 1/4 tsp cardamom powder. Stir gently and remove from heat immediately. The coconut milk should be sweet, fragrant and creamy. Serve warm." },
    ],
    proTip: "The rice balls will continue to swell in the coconut milk after cooking — the sauce will thicken as it cools.",
  },
  {
    id: 252, title: "Chow Chow Kootu", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=700",
    readyInMinutes: 30, servings: 3, difficulty: "Easy",
    tags: ["chow chow", "chayote", "kootu", "Tamil Nadu", "south indian"],
    description: "A mild, comforting South Indian vegetable and lentil dish using chow chow (chayote squash) — subtle in flavour but deeply satisfying. A staple of Tamil Brahmin cooking.",
    ingredients: ["coconut", "cumin", "mustard seeds", "turmeric", "curry leaves", "garlic"],
    missingIngredients: ["chayote chow chow", "chana dal", "urad dal", "asafoetida"],
    steps: [
      { step: 1, title: "Cook chow chow and dal", instruction: "Peel and dice 2 chow chow into 2cm cubes. Pressure cook chana dal until soft. Cook chow chow in 1/2 cup water with turmeric and salt for 8–10 minutes until tender." },
      { step: 2, title: "Add coconut paste", instruction: "Grind 1/2 cup coconut with cumin, 1 garlic clove and 1 green chilli to a coarse paste. Combine cooked chow chow and dal. Add the coconut paste. Cook together 5 minutes." },
      { step: 3, title: "Temper and serve", instruction: "Heat 1 tbsp coconut oil. Add mustard seeds — pop. Add urad dal, curry leaves, dried red chilli and asafoetida. Pour over the kootu." },
    ],
    proTip: "Chow chow has a mild flavour that absorbs the coconut masala beautifully — do not over-spice it.",
  },
  {
    id: 253, title: "Milagai Bajji (Chilli Fritter)", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1485963631004-f2f00b1d6606?w=700",
    readyInMinutes: 20, servings: 3, difficulty: "Easy",
    tags: ["milagai bajji", "chilli bajji", "south indian", "street food", "monsoon snack"],
    description: "South India's spicy street snack — large green chillies dipped in a seasoned besan batter and deep fried until crispy. The mildly spiced batter complements the heat of the chilli. Best eaten during monsoon with coconut chutney.",
    ingredients: ["vegetable oil", "cumin", "garlic", "ginger"],
    missingIngredients: ["banana peppers or bhavnagri chillies", "besan", "rice flour", "ajwain"],
    steps: [
      { step: 1, title: "Prepare chillies", instruction: "Select 8–10 large, thick-walled green chillies (Bhavnagri or banana peppers work best — they are mildly hot). Slit each chilli lengthwise on one side without cutting through. Remove seeds to reduce heat level. Optional: stuff a tiny pinch of salt and amchur inside the slit." },
      { step: 2, title: "Make the batter", instruction: "Mix 1 cup besan with 2 tbsp rice flour (makes it crispier), 1/4 tsp ajwain, 1/4 tsp turmeric, 1/4 tsp chilli powder, a pinch of baking soda and salt. Add water gradually to make a smooth, medium-thick batter that coats the back of a spoon." },
      { step: 3, title: "Dip and fry", instruction: "Heat oil to 175°C. Dip each chilli completely in batter, holding by the stem. Slide into oil. Fry 3–4 minutes, turning, until the batter is golden and crispy all over. Drain on paper. Serve immediately with coconut chutney." },
    ],
    proTip: "Rice flour in the batter is the key to a crispy bajji — pure besan batter alone is softer. The 1:4 rice flour to besan ratio is the secret.",
  },
  {
    id: 254, title: "Paniyaram (Spicy)", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=700",
    readyInMinutes: 20, servings: 3, difficulty: "Easy",
    tags: ["paniyaram", "kuzhi paniyaram", "south indian", "dosa batter", "crispy balls"],
    description: "South India's charming round savoury balls made from fermented dosa batter in a special appe/paniyaram pan. Crispy outside and pillowy inside, with a spicy onion-mustard seed filling.",
    ingredients: ["onion", "mustard seeds", "ginger", "curry leaves", "cumin", "cilantro"],
    missingIngredients: ["dosa batter", "coconut oil", "green chilli"],
    steps: [
      { step: 1, title: "Make the seasoning", instruction: "Heat 1 tbsp oil. Add mustard seeds — pop. Add 1 medium onion (finely diced), 2 green chillies and grated ginger. Cook 4 minutes until onion is soft. Add curry leaves and chopped cilantro. Cool and mix into 2 cups dosa batter. The batter should be well-fermented and slightly sour." },
      { step: 2, title: "Heat the paniyaram pan", instruction: "Heat the paniyaram/appe pan on medium heat. Add 1/2 tsp coconut oil in each well. Let the oil heat until it shimmers — the pan must be hot before adding batter." },
      { step: 3, title: "Fill and cook", instruction: "Pour seasoned batter into each well to 3/4 full. Cover and cook on medium heat for 3 minutes until the bottoms are golden. Use a thin skewer or spoon to flip each paniyaram. Cook uncovered 2 more minutes until the other side is equally golden. Serve with coconut and tomato chutneys." },
    ],
    proTip: "The paniyaram pan must be well-seasoned and hot before adding batter — poorly seasoned or cold wells cause the paniyaram to stick.",
  },
  {
    id: 255, title: "Kara Kuzhambu (Spicy Gravy)", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=700",
    readyInMinutes: 30, servings: 4, difficulty: "Medium",
    tags: ["kara kuzhambu", "spicy gravy", "Tamil Nadu", "tamarind curry", "brinjal"],
    description: "Tamil Nadu's bold, dark, intensely spiced tamarind-based gravy — usually made with brinjal or drumstick or pearl onions. It is the bolder, spicier cousin of sambar — richer in oil, darker in colour, more intense in flavour.",
    ingredients: ["eggplant", "onion", "tomato", "garlic", "mustard seeds", "cumin", "turmeric", "curry leaves"],
    missingIngredients: ["tamarind", "kuzhambu milagai thool", "shallots", "gingelly oil"],
    steps: [
      { step: 1, title: "Fry the vegetables", instruction: "Cube 3 small brinjals or use pearl onions. Heat 3 tbsp gingelly oil in a heavy pan. Fry the vegetables until golden and slightly softened. Remove. In the same oil, add mustard seeds, curry leaves and 8–10 shallots — cook until the shallots are deep golden." },
      { step: 2, title: "Build the masala", instruction: "Add 2 tsp kuzhambu milagai thool (a special Tamil spice powder — substitute with a mix of coriander powder, cumin and extra chilli powder). Add tomatoes and cook until oil surfaces. Add thick tamarind extract (4 tbsp) and 1 cup water. Simmer 8 minutes until the raw tamarind smell disappears." },
      { step: 3, title: "Add vegetables and thicken", instruction: "Add the fried vegetables to the gravy. Simmer 8–10 minutes until the curry is dark, thick and the oil floats on top. Kara kuzhambu must have oil floating on the surface — this is correct and intended. Serve with rice and a simple kootu." },
    ],
    proTip: "The floating oil in kara kuzhambu is a sign of correct cooking, not excess — it seals the surface and intensifies the flavour.",
  },
  {
    id: 256, title: "Kai Murukku", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1485963631004-f2f00b1d6606?w=700",
    readyInMinutes: 50, servings: 6, difficulty: "Hard",
    tags: ["kai murukku", "hand murukku", "rice flour", "Tamil Nadu", "festival", "skill snack"],
    description: "The most skilful murukku of all — shaped entirely by hand into a perfectly round coil without any press. A traditional skill passed down through generations, requiring practice but producing a uniquely textured, hand-crafted snack.",
    ingredients: ["cumin", "sesame oil", "salt"],
    missingIngredients: ["rice flour", "urad dal flour", "butter", "sesame seeds"],
    steps: [
      { step: 1, title: "Make the dough", instruction: "Dry roast and grind 1/4 cup urad dal to a fine flour. Mix 2 cups rice flour with the urad dal flour, 1 tsp cumin seeds, 1 tsp sesame seeds, 1/4 tsp asafoetida and salt. Rub in 2 tbsp butter — this gives crispiness. Add warm water gradually to a smooth, pliable, non-sticky dough." },
      { step: 2, title: "The hand technique", instruction: "This is the skill step. Take a large portion of dough. Roll into a long, thin rope (about 1cm diameter) between your palms and a flat surface using light even pressure. The rope must be smooth and even. Coil the rope around your fingers into a round spiral, pressing the end firmly to seal. Each murukku should be a perfect flat coil. This takes practice.", tip: "If the rope cracks while rolling, the dough is too dry. Add a tiny amount of water and knead again." },
      { step: 3, title: "Fry slowly", instruction: "Gently slide the shaped murukku into oil at 160°C. Fry on medium-low heat for 5–6 minutes turning carefully until golden all over. The slow fry gives an even colour and ensures the inside cooks completely. Drain and cool." },
    ],
    proTip: "Kai murukku is a skill that improves with practice. The first batch may look imperfect — the shape improves quickly.",
  },
  {
    id: 257, title: "Kozhi Rasam", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=700",
    readyInMinutes: 30, servings: 4, difficulty: "Easy",
    tags: ["chicken rasam", "kozhi rasam", "Tamil Nadu", "cold remedy", "pepper broth"],
    description: "Chicken-enriched pepper broth — an elevated rasam made with bone broth from chicken instead of just water. Deeply nourishing, peppery and warming. Traditional cold and fever remedy in Tamil homes.",
    ingredients: ["chicken", "garlic", "cumin", "black pepper", "turmeric", "ghee", "curry leaves", "cilantro"],
    missingIngredients: ["tamarind", "rasam powder"],
    steps: [
      { step: 1, title: "Make chicken broth", instruction: "Boil 300g bone-in chicken pieces with 4 cups water, 4 garlic cloves, 1 tsp black pepper, 1/4 tsp turmeric and salt for 20 minutes until chicken is cooked. Remove chicken, shred the meat finely. Keep the broth — this is the base of the rasam." },
      { step: 2, title: "Build the rasam", instruction: "Add to the chicken broth: 2 chopped tomatoes, tamarind extract (2 tbsp), 1.5 tsp rasam powder, 1/2 tsp cumin powder and more black pepper. Simmer 8 minutes. Add the shredded chicken back." },
      { step: 3, title: "Temper and serve", instruction: "Heat 1 tsp ghee. Add mustard seeds, dried red chilli and curry leaves. Pour over rasam. Garnish with cilantro. Serve hot — either drunk from a glass or poured over rice." },
    ],
    proTip: "The chicken bone broth makes this rasam deeply nourishing. The longer the chicken bones simmer initially, the more flavourful the broth.",
  },
  {
    id: 258, title: "Thenga Choru (Coconut Rice — Kerala)", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1596797038530-2c107229654b?w=700",
    readyInMinutes: 25, servings: 3, difficulty: "Easy",
    tags: ["thenga choru", "coconut rice", "kerala", "travel food", "banana leaf rice"],
    description: "Kerala's distinctive coconut rice — different from South Karnataka's version, this uses grated coconut fried with shallots, curry leaves and mustard seeds in coconut oil. A popular travel food and temple offering.",
    ingredients: ["rice", "coconut", "mustard seeds", "curry leaves", "cumin"],
    missingIngredients: ["shallots", "dried red chilli", "urad dal", "coconut oil"],
    steps: [
      { step: 1, title: "Cook and cool rice", instruction: "Cook 2 cups rice until perfectly done — each grain separate. Spread on a wide tray to cool. Drizzle 1 tsp coconut oil over cooled rice and separate the grains with a fork." },
      { step: 2, title: "Fry the coconut with shallots", instruction: "Heat 2 tbsp coconut oil in a pan. Add mustard seeds — pop. Add urad dal — fry golden. Add 6–8 shallots (sliced) and 2 dried red chillies. Fry until shallots are deep golden. Add curry leaves. Add 1 cup fresh grated coconut and fry on medium heat, stirring, for 3–4 minutes until the coconut is lightly toasted and fragrant but not browned." },
      { step: 3, title: "Mix and serve", instruction: "Add cooled rice to the coconut mixture. Toss gently until every grain is coated in the fragrant coconut. Adjust salt. Serve wrapped in banana leaf for the authentic Kerala experience." },
    ],
    proTip: "The shallots must be fried to deep golden — they add a sweetness and depth that regular onions cannot replicate in this dish.",
  },
  {
    id: 259, title: "Kothu Parotta", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=700",
    readyInMinutes: 25, servings: 2, difficulty: "Medium",
    tags: ["kothu parotta", "shredded parotta", "Tamil Nadu street food", "egg kothu", "loud food"],
    description: "Tamil Nadu's most theatrical street food — flaky parottas hacked into small pieces on a hot griddle and tossed with eggs, onion, tomato and spices to the rhythmic clang of metal spatulas. The sound is as distinctive as the food.",
    ingredients: ["eggs", "onion", "tomato", "garlic", "ginger", "cumin", "turmeric", "curry leaves", "butter"],
    missingIngredients: ["kerala parotta", "salna curry sauce"],
    steps: [
      { step: 1, title: "Prepare parotta pieces", instruction: "Heat 2–3 ready-made Kerala parottas on a griddle until hot. Using two spatulas or a heavy edge, chop the parottas into rough 1–2cm pieces directly on the griddle. This is the kothu (chopping) step — the parottas are shredded into small, irregular pieces." },
      { step: 2, title: "Build the masala on the griddle", instruction: "Push parotta pieces to the side. Add oil to the hot griddle. Add 1 small onion (finely diced), 2 green chillies and grated ginger-garlic. Cook 2 minutes on high heat. Add 1 diced tomato and all spices. Cook 2 more minutes." },
      { step: 3, title: "Add eggs and kothu everything", instruction: "Beat 2–3 eggs and pour over the masala. Immediately add the parotta pieces back. Using the two spatulas, chop and toss everything together continuously on high heat for 3–4 minutes until the egg coats every piece of parotta and everything is well combined. Add a splash of salna (curry sauce) if available. The constant chopping and tossing motion is what gives kothu its unique texture." },
    ],
    proTip: "High heat throughout is essential — kothu is all about the caramelisation and slight char that comes from cooking on a very hot griddle.",
  },
  {
    id: 260, title: "Moru Kachiyathu (Seasoned Buttermilk)", cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=700",
    readyInMinutes: 10, servings: 4, difficulty: "Easy",
    tags: ["moru kachiyathu", "buttermilk", "Kerala", "digestive", "onam sadya", "last course"],
    description: "Kerala's final sadya course — thin, spiced warm buttermilk tempered with mustard seeds and curry leaves. Served to aid digestion after the rich Onam feast. Simple, cooling and perfectly functional.",
    ingredients: ["yogurt", "ginger", "garlic", "turmeric", "mustard seeds", "curry leaves"],
    missingIngredients: ["coconut oil", "green chilli", "shallots"],
    steps: [
      { step: 1, title: "Make the buttermilk", instruction: "Whisk 1 cup yogurt with 2 cups water until completely smooth and lump-free. It should be thin — more water than yogurt. Add 1/4 tsp turmeric, a pinch of salt and 1/2 tsp grated ginger." },
      { step: 2, title: "Heat gently", instruction: "Pour into a pot. Heat on very low heat, stirring, until just warm to touch — this should take about 2 minutes. Never allow it to boil. The moment it begins to steam very gently, remove from heat." },
      { step: 3, title: "Temper and serve", instruction: "Heat 1 tsp coconut oil. Add mustard seeds — pop. Add 1 slit green chilli, a few shallot slices and curry leaves. Pour over the warm moru. Serve immediately as the final course of the sadya, poured over the remaining rice on the leaf." },
    ],
    proTip: "Moru kachiyathu is the deliberate final course of Onam sadya — its gentle spices and thin consistency are meant to settle the stomach after the feast.",
  },

// ════════════════════════════════════════════════════════════════════════════
// END OF 50 RECIPES (IDs 211–260)
// Paste the block above (from id: 211 down to id: 260) just before the
// closing ];  of your ALL_RECIPES array in App.tsx
// ════════════════════════════════════════════════════════════════════════════
];

/* ─────────────────────────────────────────────────────────────────────────
   SPOONACULAR CUISINE MAPPING
   Spoonacular returns strings like "Indian", "Asian", "Middle Eastern" etc.
   Map them to our Cuisine type. Unmapped cuisines stay null so they show
   under "All" but don't hijack a specific filter.
───────────────────────────────────────────────────────────────────────── */
const SPOON_CUISINE_MAP: Record<string, Cuisine> = {
  indian: "Indian", chinese: "Chinese", italian: "Italian",
  american: "American", mediterranean: "Mediterranean",
  mexican: "Mexican", japanese: "Japanese",
  // common Spoonacular extras → nearest category
  asian: "Chinese", thai: "Chinese", korean: "Chinese", vietnamese: "Chinese",
  greek: "Mediterranean", "middle eastern": "Mediterranean", turkish: "Mediterranean",
  spanish: "Mediterranean", moroccan: "Mediterranean",
  southern: "American", cajun: "American", "latin american": "Mexican",
};

function mapSpoonCuisine(cuisines: string[]): Cuisine {
  for (const c of (cuisines || [])) {
    const mapped = SPOON_CUISINE_MAP[c.toLowerCase()];
    if (mapped) return mapped;
  }
  return "American"; // only fires when Spoonacular returns truly empty cuisines
}

/* ─────────────────────────────────────────────────────────────────────────
   HELPER FUNCTIONS
───────────────────────────────────────────────────────────────────────── */
/* ── Smart ingredient matching with weighted scoring ── */
function tokenize(s: string): string[] {
  return s.toLowerCase().split(/[\s,()/-]+/).filter(Boolean);
}
function ingredientScore(recipeIng: string, userIngs: string[]): number {
  const ri = recipeIng.toLowerCase().trim();
  for (const u of userIngs) {
    const ul = u.toLowerCase().trim();
    if (ri === ul) return 3;                          // exact match
    if (ri.includes(ul) || ul.includes(ri)) return 2; // one contains the other
    // word-level overlap
    const rWords = tokenize(ri), uWords = tokenize(ul);
    const overlap = rWords.filter(w => uWords.includes(w) && w.length > 2).length;
    if (overlap > 0) return 1;
  }
  return 0;
}

function matchByIngredients(userIng: string[], cuisine: Cuisine, vegFilter: "all"|"veg"|"nonveg" = "all"): Recipe[] {
  if (userIng.length === 0) return [];
  const lower = userIng.map(s => s.toLowerCase());
  let pool = cuisine === "All" ? ALL_RECIPES : ALL_RECIPES.filter(r => r.cuisine === cuisine);
  if (vegFilter === "veg") pool = pool.filter(r => isVegRecipe(r));
  if (vegFilter === "nonveg") pool = pool.filter(r => !isVegRecipe(r));

  const scored = pool.map(recipe => {
    let weightedScore = 0;
    const used: string[] = [];
    const missing: string[] = [];
    for (const ing of recipe.ingredients) {
      const s = ingredientScore(ing, lower);
      if (s > 0) { used.push(ing); weightedScore += s; }
      else missing.push(ing);
    }
    // bonus for 100% pantry match
    if (missing.length === 0 && used.length > 0) weightedScore += 5;
    const totalIngs = recipe.ingredients.length || 1;
    const matchPct = Math.round((used.length / totalIngs) * 100);
    return { recipe: { ...recipe, ingredients: used, missingIngredients: missing, matchPct }, weightedScore, matchPct };
  });

  return scored
    .filter(x => x.matchPct >= 20)  // at least 20% of ingredients match
    .sort((a, b) =>
      b.matchPct - a.matchPct ||                           // primary: % match
      b.weightedScore - a.weightedScore ||                  // secondary: quality
      a.recipe.missingIngredients.length - b.recipe.missingIngredients.length  // tertiary: fewer missing
    )
    .map(x => x.recipe);
}

function searchByName(q: string, cuisine: Cuisine): Recipe[] {
  const lower = q.trim().toLowerCase();
  let pool = cuisine === "All" ? ALL_RECIPES : ALL_RECIPES.filter(r => r.cuisine === cuisine);
  if (!lower) return pool;
  return pool.filter(r =>
    r.title.toLowerCase().includes(lower) ||
    r.tags.some(t => t.includes(lower)) ||
    r.cuisine.toLowerCase().includes(lower)
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   SMALL COMPONENTS
───────────────────────────────────────────────────────────────────────── */
function Icon({ n, size = 20, color }: { n: string; size?: number; color?: string }) {
  return (
    <span className="material-symbols-outlined"
      style={{ fontSize: size, lineHeight: 1, verticalAlign: "middle", color: color || "inherit" }}>
      {n}
    </span>
  );
}

function SafeImg({ src, alt, id, style }: { src: string; alt: string; id: number; style?: React.CSSProperties }) {
  const [s, setS] = useState(src);
  useEffect(() => setS(src), [src]);
  return (
    <img src={s} alt={alt} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", ...style }}
      onError={() => setS(FALLBACK[id % FALLBACK.length])} />
  );
}

function DiffBadge({ level }: { level: Difficulty }) {
  const map: Record<Difficulty, [string, string]> = {
    Easy: ["#f0fdf4", "#16a34a"], Medium: ["#fff7ed", "#c2410c"], Hard: ["#fef2f2", "#b91c1c"]
  };
  const [bg, fg] = map[level];
  return (
    <span style={{ padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: bg, color: fg, display: "inline-block" }}>
      {level}
    </span>
  );
}



function CuisineBar({ selected, onChange }: { selected: Cuisine; onChange: (c: Cuisine) => void }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  return (
    <div ref={scrollRef} className="cuisine-bar" style={{ flexWrap: "nowrap" }}>
      {CUISINES.map(({ label, emoji }) => {
        const active = selected === label;
        return (
          <button key={label} onClick={() => onChange(label)}
            style={{
              padding: "7px 16px", borderRadius: 99, border: "none", cursor: "pointer",
              fontFamily: "inherit", fontSize: 12.5, fontWeight: active ? 700 : 500, whiteSpace: "nowrap",
              background: active ? "#33c738" : "#fff", color: active ? "#fff" : "#475569",
              boxShadow: active ? "0 2px 10px rgba(51,199,56,0.3)" : "0 1px 4px rgba(0,0,0,0.08)",
              transition: "all 0.18s ease",
            }}>
            {emoji} {label}
          </button>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   INGREDIENT AUTOCOMPLETE INPUT
───────────────────────────────────────────────────────────────────────── */
function IngInput({ chips, onAdd, onRemove, onSearch, placeholder = "Type an ingredient...", hideChips = false }:
  { chips: string[]; onAdd: (v: string) => void; onRemove: (v: string) => void; onSearch?: () => void; placeholder?: string; hideChips?: boolean }) {
  const [val, setVal] = useState("");
  const [sugg, setSugg] = useState<string[]>([]);
  const [hi, setHi] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = val.trim().toLowerCase();
    if (q.length < 1) { setSugg([]); return; }
    setSugg(INGREDIENT_DB.filter(i => i.includes(q) && !chips.includes(i)).slice(0, 8));
    setHi(-1);
  }, [val, chips]);

  useEffect(() => {
    const close = (e: MouseEvent) => { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setSugg([]); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const commit = (v: string) => {
    const m = INGREDIENT_DB.find(i => i === v.toLowerCase());
    if (m && !chips.includes(m)) onAdd(m);
    setVal(""); setSugg([]); setHi(-1); inputRef.current?.focus();
  };

  const keyDown = (e: React.KeyboardEvent) => {
    if (sugg.length && e.key === "ArrowDown") { e.preventDefault(); setHi(i => Math.min(i + 1, sugg.length - 1)); return; }
    if (sugg.length && e.key === "ArrowUp") { e.preventDefault(); setHi(i => Math.max(i - 1, -1)); return; }
    if (e.key === "Enter") { e.preventDefault(); if (hi >= 0) commit(sugg[hi]); else if (sugg.length) commit(sugg[0]); else onSearch?.(); return; }
    if (e.key === "Escape") { setSugg([]); return; }
    if (e.key === "Backspace" && !val && chips.length) onRemove(chips[chips.length - 1]);
  };

  return (
    <div ref={wrapRef} style={{ position: "relative", flex: 1 }}>
      <div onClick={() => inputRef.current?.focus()}
        style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 5, padding: "6px 10px", minHeight: 40, cursor: "text" }}>
        {!hideChips && chips.map(c => (
          <span key={c} style={{ display: "inline-flex", alignItems: "center", gap: 3, background: "#33c738", color: "#fff", fontSize: 11.5, fontWeight: 600, padding: "3px 7px 3px 10px", borderRadius: 99 }}>
            {c}
            <button onMouseDown={e => { e.preventDefault(); onRemove(c); }}
              style={{ background: "rgba(255,255,255,0.3)", border: "none", cursor: "pointer", width: 15, height: 15, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, color: "#fff" }}>
              <Icon n="close" size={10} />
            </button>
          </span>
        ))}
        <input ref={inputRef} value={val} onChange={e => setVal(e.target.value)} onKeyDown={keyDown}
          placeholder={chips.length === 0 ? placeholder : "Add more..."}
          style={{ flex: 1, minWidth: 120, border: "none", outline: "none", background: "transparent", fontFamily: "inherit", fontSize: 15, color: "#1e293b", padding: "2px 0" }} />
      </div>
      {sugg.length > 0 && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, boxShadow: "0 8px 28px rgba(0,0,0,0.12)", zIndex: 9999, overflow: "hidden" }}>
          {sugg.map((s, i) => {
            const q = val.toLowerCase(); const idx = s.indexOf(q);
            return (
              <div key={s} onMouseDown={() => commit(s)} onMouseEnter={() => setHi(i)}
                style={{ padding: "9px 14px", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, background: i === hi ? "#f0fdf4" : "#fff" }}>
                <Icon n="nutrition" size={14} color={i === hi ? "#33c738" : "#cbd5e1"} />
                <span>{idx < 0 ? s : <>{s.slice(0, idx)}<strong style={{ color: "#33c738" }}>{s.slice(idx, idx + q.length)}</strong>{s.slice(idx + q.length)}</>}</span>
              </div>
            );
          })}
          <div style={{ padding: "5px 14px", fontSize: 11, color: "#94a3b8", borderTop: "1px solid #f1f5f9" }}>Select from dropdown — registered ingredients only</div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   RECIPE MODAL
───────────────────────────────────────────────────────────────────────── */
function RecipeModal({ recipe, onClose }: { recipe: Recipe; onClose: () => void }) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", fn);
    return () => { document.body.style.overflow = ""; document.removeEventListener("keydown", fn); };
  }, []);
  const cuisineEntry = CUISINES.find(c => c.label === recipe.cuisine);

  return (
    <div onClick={onClose} className="modal-wrap"
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.58)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, backdropFilter: "blur(4px)", transition: "opacity 0.2s" }}>
      <div onClick={e => e.stopPropagation()} className="modal-box"
        style={{ background: "#fff", borderRadius: 18, maxWidth: 700, width: "100%", maxHeight: "92vh", overflowY: "auto", boxShadow: "0 24px 80px rgba(0,0,0,0.28)" }}>
        {/* Hero image */}
        <div style={{ position: "relative", aspectRatio: "16/7", overflow: "hidden", borderRadius: "18px 18px 0 0", flexShrink: 0 }}>
          <SafeImg src={recipe.image} alt={recipe.title} id={recipe.id} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 55%)" }} />
          <button onClick={onClose}
            style={{ position: "absolute", top: 14, right: 14, background: "rgba(255,255,255,0.92)", border: "none", borderRadius: "50%", width: 36, height: 36, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}>
            <Icon n="close" size={18} />
          </button>
          <div style={{ position: "absolute", bottom: 16, left: 22, right: 60 }}>
            <div style={{ display: "flex", gap: 7, marginBottom: 8, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ padding: "3px 10px", borderRadius: 99, background: "rgba(0,0,0,0.45)", color: "#fff", fontSize: 11.5, fontWeight: 600, backdropFilter: "blur(6px)" }}>
                {cuisineEntry?.emoji} {recipe.cuisine}
              </span>
              <DiffBadge level={recipe.difficulty} />
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 9px",
                borderRadius: 99, fontSize: 11, fontWeight: 700, backdropFilter: "blur(6px)",
                background: isVegRecipe(recipe) ? "rgba(240,253,244,0.9)" : "rgba(255,247,237,0.9)",
                color: isVegRecipe(recipe) ? "#15803d" : "#c2410c",
              }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: isVegRecipe(recipe) ? "#22c55e" : "#f97316" }} />
                {isVegRecipe(recipe) ? "Veg" : "Non-Veg"}
              </span>
            </div>
            <h2 style={{ color: "#fff", fontSize: 22, fontWeight: 900, margin: 0, lineHeight: 1.2 }}>{recipe.title}</h2>
          </div>
        </div>

        {/* Content */}
        <div className="modal-body" style={{ padding: "22px 28px 36px" }}>
          {/* Stats */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
            {[{ icon: "schedule", text: `${recipe.readyInMinutes} min` }, { icon: "groups", text: `${recipe.servings} servings` }, { icon: "menu_book", text: `${recipe.steps.length} steps` }].map(({ icon, text }) => (
              <span key={text} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 13px", borderRadius: 9, background: "#f8fafc", border: "1px solid #e2e8f0", fontSize: 12.5, fontWeight: 600, color: "#374151" }}>
                <Icon n={icon} size={16} color="#33c738" /> {text}
              </span>
            ))}
            {recipe.missingIngredients.length === 0
              ? <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 13px", borderRadius: 9, background: "#f0fdf4", border: "1px solid #bbf7d0", fontSize: 12.5, fontWeight: 600, color: "#15803d" }}><Icon n="check_circle" size={16} color="#15803d" /> You have everything!</span>
              : <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 13px", borderRadius: 9, background: "#fff7ed", border: "1px solid #fed7aa", fontSize: 12.5, fontWeight: 600, color: "#c2410c" }}><Icon n="shopping_cart" size={16} color="#c2410c" /> {recipe.missingIngredients.length} to buy</span>
            }
          </div>

          {/* Description */}
          <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.8, margin: "0 0 24px", padding: "14px 18px", background: "#f8fafc", borderRadius: 12, borderLeft: "4px solid #33c738" }}>
            {recipe.description}
          </p>

          {/* Ingredients */}
          <div style={{ marginBottom: 26 }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", margin: "0 0 13px", display: "flex", alignItems: "center", gap: 7 }}>
              <Icon n="nutrition" size={18} color="#33c738" /> Ingredients
            </h3>
            <div className="modal-ing-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
              {recipe.ingredients.map(i => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 12px", borderRadius: 9, background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                  <Icon n="check_circle" size={15} color="#22c55e" />
                  <span style={{ fontSize: 12.5, color: "#15803d", fontWeight: 500 }}>{i}</span>
                </div>
              ))}
              {recipe.missingIngredients.map(i => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 12px", borderRadius: 9, background: "#fff7ed", border: "1px solid #fed7aa" }}>
                  <Icon n="add_shopping_cart" size={15} color="#f97316" />
                  <span style={{ fontSize: 12.5, color: "#c2410c", fontWeight: 500 }}>{i}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Steps */}
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", margin: "0 0 18px", display: "flex", alignItems: "center", gap: 7 }}>
              <Icon n="format_list_numbered" size={18} color="#33c738" /> Step-by-Step Instructions
            </h3>
            {recipe.steps.length === 0 ? (
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "16px 18px", background: "#f8fafc", borderRadius: 12, border: "1px solid #e2e8f0" }}>
                <Icon n="info" size={20} color="#94a3b8" />
                <div>
                  <p style={{ fontSize: 13.5, fontWeight: 600, color: "#475569", margin: "0 0 6px" }}>Instructions not available in preview</p>
                  <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 10px", lineHeight: 1.6 }}>
                    Spoonacular didn't return step-by-step instructions for this recipe. You can view the full recipe with instructions on the original site.
                  </p>
                  <a href={recipe.sourceUrl !== "#" ? recipe.sourceUrl : `https://spoonacular.com/recipes/${recipe.title.toLowerCase().replace(/ /g, "-")}-${recipe.id}`}
                    target="_blank" rel="noopener noreferrer"
                    style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "#33c738", color: "#fff", borderRadius: 8, fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
                    <Icon n="open_in_new" size={15} color="#fff" /> View Full Recipe
                  </a>
                </div>
              </div>
            ) : recipe.steps.map((s, i) => (
              <div key={i} style={{ display: "flex", gap: 14, marginBottom: i < recipe.steps.length - 1 ? 24 : 0 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg, #33c738, #16a34a)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, flexShrink: 0, boxShadow: "0 2px 8px rgba(51,199,56,0.35)" }}>{s.step}</div>
                  {i < recipe.steps.length - 1 && <div style={{ width: 2, flex: 1, background: "linear-gradient(to bottom, #33c738, #e2e8f0)", marginTop: 4, minHeight: 20, borderRadius: 2 }} />}
                </div>
                <div style={{ flex: 1, paddingBottom: i < recipe.steps.length - 1 ? 6 : 0 }}>
                  <h4 style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", margin: "4px 0 8px", display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "#33c738", background: "#f0fdf4", padding: "1px 7px", borderRadius: 99, border: "1px solid #bbf7d0" }}>STEP {s.step}</span>
                    {s.title}
                  </h4>
                  <p style={{ fontSize: 13.5, color: "#374151", lineHeight: 1.85, margin: "0 0 10px" }}>{s.instruction}</p>
                  {s.tip && (
                    <div style={{ display: "flex", gap: 10, padding: "10px 14px", background: "#fffbeb", borderRadius: 10, border: "1px solid #fde68a", marginBottom: 8 }}>
                      <span style={{ fontSize: 16, flexShrink: 0 }}>💡</span>
                      <div>
                        <p style={{ fontSize: 11.5, fontWeight: 800, color: "#b45309", margin: "0 0 2px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Why this matters</p>
                        <p style={{ fontSize: 12.5, color: "#92400e", margin: 0, lineHeight: 1.7 }}>{s.tip}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pro tip */}
          <div style={{ display: "flex", gap: 12, padding: "15px 18px", background: "linear-gradient(135deg,#f0fdf4,#dcfce7)", borderRadius: 12, border: "1px solid #bbf7d0" }}>
            <Icon n="star" size={20} color="#22c55e" />
            <div>
              <p style={{ fontSize: 12.5, fontWeight: 700, color: "#14532d", margin: "0 0 4px" }}>Pro Tip</p>
              <p style={{ fontSize: 13, color: "#166534", margin: 0, lineHeight: 1.7 }}>{recipe.proTip}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   RECIPE CARD
───────────────────────────────────────────────────────────────────────── */
function RecipeCard({ recipe, onClick }: { recipe: Recipe; onClick: () => void; delay?: number }) {
  const [hov, setHov] = useState(false);
  const [fav, setFav] = useState(false);
  const isVeg = isVegRecipe(recipe);
  const pct = recipe.matchPct;
  return (
    <div onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: "rgba(255,255,255,0.92)", borderRadius: 16, overflow: "hidden",
        border: hov ? "1.5px solid rgba(51,199,56,0.5)" : "1.5px solid rgba(51,199,56,0.18)",
        cursor: "pointer", display: "flex", flexDirection: "column",
        boxShadow: hov ? "0 20px 48px rgba(0,0,0,0.14)" : "0 2px 12px rgba(0,0,0,0.06)",
        transition: "transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease",
        transform: hov ? "translateY(-4px)" : "translateY(0)",
        backdropFilter: "blur(8px)",
      }}>
      {/* Image */}
      <div style={{ position: "relative", aspectRatio: "4/3", overflow: "hidden", flexShrink: 0 }}>
        <SafeImg src={recipe.image} alt={recipe.title} id={recipe.id}
          style={{ transform: hov ? "scale(1.08)" : "scale(1)", transition: "transform 0.5s ease" }} />
        {/* Veg / Non-Veg dot top-left */}
        <div style={{ position: "absolute", top: 8, left: 8 }}>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 8px",
            borderRadius: 99, fontSize: 10, fontWeight: 700, backdropFilter: "blur(8px)",
            background: isVeg ? "rgba(240,253,244,0.92)" : "rgba(255,247,237,0.92)",
            color: isVeg ? "#15803d" : "#c2410c",
            border: isVeg ? "1px solid rgba(187,247,208,0.8)" : "1px solid rgba(254,215,170,0.8)",
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: isVeg ? "#22c55e" : "#f97316", flexShrink: 0 }} />
            {isVeg ? "Veg" : "Non-Veg"}
          </span>
        </div>
        {/* Match % badge (only when from search) */}
        {pct !== undefined && (
          <div style={{ position: "absolute", top: 8, right: 46 }}>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 3, padding: "3px 7px",
              borderRadius: 99, fontSize: 10, fontWeight: 800, backdropFilter: "blur(8px)",
              background: pct === 100 ? "rgba(51,199,56,0.92)" : pct >= 60 ? "rgba(251,191,36,0.92)" : "rgba(255,255,255,0.9)",
              color: pct === 100 ? "#fff" : pct >= 60 ? "#78350f" : "#475569",
            }}>
              {pct}% match
            </span>
          </div>
        )}
        {/* Favourite button */}
        <button onClick={e => { e.stopPropagation(); setFav(f => !f); }}
          style={{ position: "absolute", top: 8, right: 8, width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.92)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.12)", transition: "transform 0.15s", transform: fav ? "scale(1.15)" : "scale(1)" }}>
          <span className="material-symbols-outlined" style={{ fontSize: 17, color: fav ? "#ef4444" : "#94a3b8", fontVariationSettings: fav ? "'FILL' 1" : "'FILL' 0" }}>favorite</span>
        </button>
      </div>
      {/* Info */}
      <div style={{ padding: "12px 13px 13px", display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
        <h3 style={{ fontSize: 13.5, fontWeight: 800, color: "#0f172a", margin: 0, lineHeight: 1.3, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
          {recipe.title}
        </h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: "auto" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "3px 8px", borderRadius: 7, background: "#f1f5f9", color: "#475569", fontSize: 11, fontWeight: 600 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 13 }}>schedule</span>
            {recipe.readyInMinutes}m
          </span>
          {recipe.missingIngredients.length === 0 ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "3px 8px", borderRadius: 7, background: "rgba(51,199,56,0.12)", color: "#16a34a", fontSize: 11, fontWeight: 700 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 13 }}>check_circle</span>
              Ready to cook!
            </span>
          ) : (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "3px 8px", borderRadius: 7, background: "rgba(234,88,12,0.08)", color: "#ea580c", fontSize: 11, fontWeight: 700 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 13 }}>shopping_cart</span>
              {recipe.missingIngredients.length} to buy
            </span>
          )}
          <DiffBadge level={recipe.difficulty} />
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   SHARED FOOTER
───────────────────────────────────────────────────────────────────────── */
/* ─────────────────────────────────────────────────────────────────────────
   AUTH PAGE  (Login + Sign Up)
─────────────────────────────────────────────────────────────────────────── */
function AuthPage({ onAuth }: { onAuth: (user: User) => void }) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const BG = "https://lh3.googleusercontent.com/aida-public/AB6AXuBNUBKI4ZqPgz2pvWXpdks1PTs_3fXmbH2_l3tylO8i6LyJ7Xbe26vlK_hgBLqESkkvjRByK9MjZPCpyAePP6brbmGc3_Oob_vojLe_RE0zNkV37o0NBxAD63a2gWnE3yN6vTIpJKwZ4AS2dpKLqsg_JUnShhfHQ2nFiLE_XocDkwyaxd5OgsiDNbsKkh-Gj95aCqClVqDgkmbtOpfuu4uCXMGRNKXQ7p8AeFjHpdWT29iTO1FCKCcbf5ZjHYl0rAaofMscO3CJsgM";

  const handleSubmit = async () => {
    setError(null); setSuccess(null);
    if (mode === "signup" && !fullName.trim()) { setError("Please enter your full name."); return; }
    if (!email.trim() || !password.trim()) { setError("Please fill in all fields."); return; }
    if (!/\S+@\S+\.\S+/.test(email)) { setError("Please enter a valid email address."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (mode === "signup" && password !== confirmPassword) { setError("Passwords don't match."); return; }
    setLoading(true);
    try {
      if (mode === "login") {
        const { data, error: e } = await supabase.auth.signInWithPassword({ email, password });
        if (e) throw e;
        if (data.user) onAuth(data.user);
      } else {
        const { data, error: e } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName.trim() } } });
        if (e) throw e;
        if (data.user && data.session) { onAuth(data.user); }
        else { setSuccess("Account created! Check your email to confirm, then sign in."); setMode("login"); setPassword(""); setConfirmPassword(""); }
      }
    } catch (err: any) {
      const m = err?.message || "Something went wrong.";
      if (m.includes("Invalid login credentials")) setError("Incorrect email or password.");
      else if (m.includes("User already registered")) setError("An account with this email already exists. Please sign in.");
      else if (m.includes("Email not confirmed")) setError("Please confirm your email before signing in.");
      else setError(m);
    } finally { setLoading(false); }
  };

  const switchMode = () => { setMode(p => p === "login" ? "signup" : "login"); setError(null); setSuccess(null); setFullName(""); setEmail(""); setPassword(""); setConfirmPassword(""); };
  const inputStyle: React.CSSProperties = { width: "100%", height: 52, background: "#f6f8f6", border: "1.5px solid #e2e8f0", borderRadius: 12, fontSize: 14, color: "#0f172a", fontFamily: "inherit", outline: "none", boxSizing: "border-box", transition: "border-color 0.18s" };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", fontFamily: "inherit" }}>
      <div style={{ position: "fixed", inset: 0, zIndex: 0 }}>
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.42)", zIndex: 1 }} />
        <img src={BG} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", filter: "blur(6px)", transform: "scale(1.06)" }} />
      </div>
      <div style={{ position: "relative", zIndex: 10, width: "100%", maxWidth: 480, padding: "24px 20px" }}>
        <div style={{ background: "rgba(255,255,255,0.97)", borderRadius: 20, boxShadow: "0 24px 80px rgba(0,0,0,0.28)", overflow: "hidden" }}>
          {/* Logo */}
          <div style={{ paddingTop: 36, paddingBottom: 18, display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
            <div style={{ width: 64, height: 64, background: "#33c738", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 24px rgba(51,199,56,0.32)" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 34, color: "#fff" }}>restaurant</span>
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: "#0f172a", margin: "14px 0 4px", letterSpacing: -0.5 }}>What's for Dinner?</h1>
            <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>{mode === "login" ? "Welcome back to your kitchen companion" : "Create your free account"}</p>
          </div>
          {/* Form */}
          <div style={{ padding: "4px 32px 32px" }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", margin: "0 0 3px" }}>{mode === "login" ? "Sign In" : "Sign Up"}</h2>
            <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 20px" }}>{mode === "login" ? "Enter your credentials to continue" : "Fill in the details below to get started"}</p>
            {error && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, marginBottom: 16, fontSize: 13, color: "#dc2626" }}>
                <span className="material-symbols-outlined" style={{ fontSize: 17, flexShrink: 0 }}>error</span>{error}
              </div>
            )}
            {success && (
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "11px 14px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, marginBottom: 16, fontSize: 13, color: "#15803d" }}>
                <span className="material-symbols-outlined" style={{ fontSize: 17, flexShrink: 0, marginTop: 1 }}>check_circle</span>{success}
              </div>
            )}
            {/* Full Name — signup only */}
            {mode === "signup" && (
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 13, fontWeight: 700, color: "#374151", display: "block", marginBottom: 7 }}>Full Name</label>
                <div style={{ position: "relative" }}>
                  <span className="material-symbols-outlined" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 20, color: "#94a3b8" }}>person</span>
                  <input type="text" value={fullName} onChange={e => { setFullName(e.target.value); setError(null); }} onKeyDown={e => e.key === "Enter" && handleSubmit()} placeholder="Your full name"
                    style={{ ...inputStyle, paddingLeft: 44, paddingRight: 16 }}
                    onFocus={e => (e.target.style.borderColor = "#33c738")} onBlur={e => (e.target.style.borderColor = "#e2e8f0")} />
                </div>
              </div>
            )}
            {/* Email */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: "#374151", display: "block", marginBottom: 7 }}>Email Address</label>
              <div style={{ position: "relative" }}>
                <span className="material-symbols-outlined" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 20, color: "#94a3b8" }}>mail</span>
                <input type="email" value={email} onChange={e => { setEmail(e.target.value); setError(null); }} onKeyDown={e => e.key === "Enter" && handleSubmit()} placeholder="example@mail.com"
                  style={{ ...inputStyle, paddingLeft: 44, paddingRight: 16 }}
                  onFocus={e => (e.target.style.borderColor = "#33c738")} onBlur={e => (e.target.style.borderColor = "#e2e8f0")} />
              </div>
            </div>
            {/* Password */}
            <div style={{ marginBottom: mode === "signup" ? 14 : 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
                <label style={{ fontSize: 13, fontWeight: 700, color: "#374151" }}>Password</label>
                {mode === "login" && <button onClick={() => alert("Go to your Supabase dashboard → Auth → Users to send a password reset email.")} style={{ background: "none", border: "none", color: "#33c738", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Forgot Password?</button>}
              </div>
              <div style={{ position: "relative" }}>
                <span className="material-symbols-outlined" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 20, color: "#94a3b8" }}>lock</span>
                <input type={showPass ? "text" : "password"} value={password} onChange={e => { setPassword(e.target.value); setError(null); }} onKeyDown={e => e.key === "Enter" && handleSubmit()} placeholder="Enter your password"
                  style={{ ...inputStyle, paddingLeft: 44, paddingRight: 48 }}
                  onFocus={e => (e.target.style.borderColor = "#33c738")} onBlur={e => (e.target.style.borderColor = "#e2e8f0")} />
                <button onClick={() => setShowPass(p => !p)} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8", display: "flex", padding: 0 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{showPass ? "visibility_off" : "visibility"}</span>
                </button>
              </div>
            </div>
            {/* Confirm Password */}
            {mode === "signup" && (
              <div style={{ marginBottom: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 700, color: "#374151", display: "block", marginBottom: 7 }}>Confirm Password</label>
                <div style={{ position: "relative" }}>
                  <span className="material-symbols-outlined" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 20, color: "#94a3b8" }}>lock</span>
                  <input type={showConfirm ? "text" : "password"} value={confirmPassword} onChange={e => { setConfirmPassword(e.target.value); setError(null); }} onKeyDown={e => e.key === "Enter" && handleSubmit()} placeholder="Re-enter your password"
                    style={{ ...inputStyle, paddingLeft: 44, paddingRight: 48 }}
                    onFocus={e => (e.target.style.borderColor = "#33c738")} onBlur={e => (e.target.style.borderColor = "#e2e8f0")} />
                  <button onClick={() => setShowConfirm(p => !p)} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8", display: "flex", padding: 0 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{showConfirm ? "visibility_off" : "visibility"}</span>
                  </button>
                </div>
              </div>
            )}
            {mode === "signup" && password.length > 0 && password.length < 6 && (
              <p style={{ fontSize: 12, color: "#f59e0b", margin: "4px 0 10px", display: "flex", alignItems: "center", gap: 4 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>info</span>Password must be at least 6 characters
              </p>
            )}
            {/* Submit */}
            <button onClick={handleSubmit} disabled={loading}
              style={{ width: "100%", height: 52, background: loading ? "#86efac" : "#33c738", color: "#fff", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 800, cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit", marginTop: 18, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 8px 24px rgba(51,199,56,0.26)", transition: "background 0.2s" }}>
              {loading
                ? <><span className="material-symbols-outlined" style={{ fontSize: 18, animation: "spin 1s linear infinite" }}>progress_activity</span>{mode === "login" ? "Signing in…" : "Creating account…"}</>
                : <>{mode === "login" ? "Sign In" : "Create Account"}<span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</span></>}
            </button>
            {/* Toggle */}
            <p style={{ textAlign: "center", fontSize: 13.5, color: "#64748b", marginTop: 18, marginBottom: 0 }}>
              {mode === "login" ? "Don't have an account? " : "Already have an account? "}
              <button onClick={switchMode} style={{ background: "none", border: "none", color: "#33c738", fontWeight: 800, fontSize: 13.5, cursor: "pointer", fontFamily: "inherit" }}>
                {mode === "login" ? "Sign Up" : "Sign In"}
              </button>
            </p>
          </div>
        </div>
        {/* Footer links */}
        <div style={{ marginTop: 22, display: "flex", justifyContent: "center", gap: 24 }}>
          {["Privacy Policy", "Terms of Service", "Contact Us"].map(l => (
            <a key={l} href="#" style={{ color: "rgba(255,255,255,0.72)", fontSize: 12, fontWeight: 500, textDecoration: "none" }}>{l}</a>
          ))}
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function Footer() {
  return (
    <footer style={{ background: "#0f172a", color: "#94a3b8", padding: "48px 40px 0" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div className="footer-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 40, marginBottom: 44 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#fff", marginBottom: 14 }}>
              <Icon n="restaurant" size={22} color="#33c738" />
              <span style={{ fontSize: 17, fontWeight: 800 }}>What's for Dinner?</span>
            </div>
            <p style={{ fontSize: 13, lineHeight: 1.75, margin: 0 }}>Eliminating kitchen stress one ingredient at a time. Your smart recipe engine for everyday cooking.</p>
          </div>
          <div>
            <h4 style={{ color: "#fff", fontWeight: 700, fontSize: 13.5, marginBottom: 14, marginTop: 0 }}>Explore</h4>
            {["All Recipes", "Seasonal Meals", "Cooking Tips"].map(l => (
              <div key={l} style={{ marginBottom: 9 }}>
                <a href="#" style={{ fontSize: 13, color: "#94a3b8", textDecoration: "none" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#33c738")}
                  onMouseLeave={e => (e.currentTarget.style.color = "#94a3b8")}>{l}</a>
              </div>
            ))}
          </div>
          <div>
            <h4 style={{ color: "#fff", fontWeight: 700, fontSize: 13.5, marginBottom: 14, marginTop: 0 }}>Support</h4>
            {["Help Center", "Contact Us", "Feedback"].map(l => (
              <div key={l} style={{ marginBottom: 9 }}>
                <a href="#" style={{ fontSize: 13, color: "#94a3b8", textDecoration: "none" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#33c738")}
                  onMouseLeave={e => (e.currentTarget.style.color = "#94a3b8")}>{l}</a>
              </div>
            ))}
          </div>
          <div>
            <h4 style={{ color: "#fff", fontWeight: 700, fontSize: 13.5, marginBottom: 14, marginTop: 0 }}>Find Your Next Meal</h4>
            <p style={{ fontSize: 13, lineHeight: 1.75, margin: 0 }}>Find your next favorite meal with our ingredient-based recipe search engine.</p>
          </div>
        </div>
        <div style={{ borderTop: "1px solid #1e293b", padding: "22px 0", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, fontSize: 12 }}>
          <span>© 2024 What's for Dinner? All rights reserved.</span>
          <div style={{ display: "flex", gap: 24 }}>
            {["Privacy Policy", "Terms of Service"].map(l => (
              <a key={l} href="#" style={{ color: "#94a3b8", textDecoration: "none" }}
                onMouseEnter={e => (e.currentTarget.style.color = "#33c738")}
                onMouseLeave={e => (e.currentTarget.style.color = "#94a3b8")}>{l}</a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   SMOOTH PAGE WRAPPER (fade + slide transition)
───────────────────────────────────────────────────────────────────────── */
function PageTransition({ visible, children }: { visible: boolean; children: React.ReactNode }) {
  const [mounted, setMounted] = useState(visible);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setShow(true)));
    } else {
      setShow(false);
      const t = setTimeout(() => setMounted(false), 280);
      return () => clearTimeout(t);
    }
  }, [visible]);

  if (!mounted) return null;
  return (
    <div style={{
      opacity: show ? 1 : 0,
      transform: show ? "translateY(0)" : "translateY(14px)",
      transition: "opacity 0.28s ease, transform 0.28s ease",
    }}>
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   SHARED NAV BAR
───────────────────────────────────────────────────────────────────────── */
function NavBar({ view, setView, user, onSignOut }: { view: ViewName; setView: (v: ViewName) => void; user: User | null; onSignOut: () => void }) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowUserMenu(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const navLinks = [
    { label: "🍽️ Explore all Recipes", v: "recipes" as ViewName },
  ];

  return (
    <header style={{
      position: "sticky", top: 0, zIndex: 200,
      background: "rgba(255,255,255,0.80)", backdropFilter: "blur(16px)",
      borderBottom: "1px solid rgba(226,232,240,0.8)",
      padding: "10px 14px",
    }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        {/* Left: Logo + Nav links */}
        <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
          <button onClick={() => setView("home")} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, padding: 0 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 30, color: "#33c738", fontVariationSettings: "'wght' 600" }}>restaurant_menu</span>
            <span style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", letterSpacing: -0.3 }}>What's for Dinner?</span>
          </button>
          {/* Desktop nav links */}
          <nav className="nb-links" style={{ display: "flex", gap: 24, alignItems: "center" }}>
            {navLinks.map(({ label, v }) => (
              <button key={label} onClick={() => setView(v)}
              style={{
                background: label === "🍽️ Explore all Recipes"
                  ? "linear-gradient(135deg, #ff6b35, #f7931e)"
                  : "none",
                border: "none",
                cursor: "pointer",
                fontFamily: "inherit",
                fontSize: label === "🍽️ Explore all Recipes" ? 13.5 : 13.5,
                fontWeight: label === "🍽️ Explore all Recipes" ? 700 : 500,
                padding: label === "🍽️ Explore all Recipes" ? "8px 18px" : "4px 0",
                borderRadius: label === "🍽️ Explore all Recipes" ? "20px" : "0",
                color: label === "🍽️ Explore all Recipes"
                  ? "white"
                  : (view === v ? "#33c738" : "#475569"),
                boxShadow: label === "🍽️ Explore all Recipes"
                  ? "0 4px 15px rgba(255,107,53,0.45)"
                  : "none",
                transition: "all 0.2s",
              }}
              onMouseEnter={e => { if (label !== "🍽️ Explore all Recipes") e.currentTarget.style.color = "#33c738"; }}
              onMouseLeave={e => { if (label !== "🍽️ Explore all Recipes" && view !== v) e.currentTarget.style.color = "#475569"; }}
            >
              {label}
            </button>
            ))}
          </nav>
        </div>

        {/* Right: Search + User */}
        <div style={{ display: "flex", flex: 1, justifyContent: "flex-end", alignItems: "center", gap: 12 }}>
          {/* User avatar + dropdown */}
          {user && (
            <div ref={menuRef} style={{ position: "relative" }}>
              <button onClick={() => setShowUserMenu(p => !p)}
                style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "1.5px solid #e2e8f0", borderRadius: 99, padding: "4px 12px 4px 5px", cursor: "pointer", transition: "border-color 0.18s, background 0.18s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "#33c738"; e.currentTarget.style.background = "#f0fdf4"; }}
                onMouseLeave={e => { if (!showUserMenu) { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.background = "none"; } }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#33c738", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "#fff" }}>{(user.user_metadata?.full_name?.[0] || user.email?.[0] || "U").toUpperCase()}</span>
                </div>
                <span className="nb-name" style={{ fontSize: 13, fontWeight: 600, color: "#374151", maxWidth: 110, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {user.user_metadata?.full_name || user.email?.split("@")[0]}
                </span>
                <span className="material-symbols-outlined" style={{ fontSize: 16, color: "#94a3b8" }}>{showUserMenu ? "keyboard_arrow_up" : "keyboard_arrow_down"}</span>
              </button>
              {showUserMenu && (
                <div style={{ position: "absolute", right: 0, top: "calc(100% + 8px)", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, boxShadow: "0 12px 40px rgba(0,0,0,0.13)", minWidth: 210, zIndex: 9999, overflow: "hidden" }}>
                  <div style={{ padding: "14px 16px 12px", borderBottom: "1px solid #f1f5f9" }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 4px" }}>Signed in as</p>
                    {user.user_metadata?.full_name && <p style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", margin: "0 0 2px" }}>{user.user_metadata.full_name}</p>}
                    <p style={{ fontSize: 12, color: "#64748b", margin: 0, wordBreak: "break-all" }}>{user.email}</p>
                  </div>
                  <button onClick={() => { setShowUserMenu(false); onSignOut(); }}
                    style={{ width: "100%", padding: "12px 16px", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, fontSize: 13.5, fontWeight: 600, color: "#dc2626", fontFamily: "inherit", textAlign: "left" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#fef2f2")}
                    onMouseLeave={e => (e.currentTarget.style.background = "none")}>
                    <Icon n="logout" size={17} color="#dc2626" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   HOME PAGE
───────────────────────────────────────────────────────────────────────── */
function HomePage({ onSearch }: { onSearch: (ings: string[]) => void }) {
  const [chips, setChips] = useState<string[]>([]);
  const doSearch = () => { if (chips.length > 0) onSearch(chips); };

  const popularRecipes = ALL_RECIPES
    .filter(r => ["Butter Chicken", "Spaghetti Carbonara", "Egg Fried Rice", "Chicken Biryani", "Smash Burger", "Chicken Teriyaki"].includes(r.title));

  const heroRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const onScroll = () => {
      if (!bgRef.current) return;
      const y = window.scrollY;
      bgRef.current.style.transform = `scale(1.08) translateY(${y * 0.4}px)`;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <section ref={heroRef} style={{ position: "relative", minHeight: "calc(100vh - 54px)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
      {/* Parallax Background */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.65), rgba(0,0,0,0.38), rgba(0,0,0,0.22))", zIndex: 1 }} />
        <img ref={bgRef} src="https://lh3.googleusercontent.com/aida-public/AB6AXuCEofLEVOCfMZb_00lQ2a2Tei_4fbxvo1OqQ2y3vQ3w9gESiyMWHyrGvIStAij4jBqCU1D43qK68glm-B4KuVYUjJOJuxYVsJ9MdTX3Tjr-HjHlcVHi5pgY0CwUTXPunFWpAMl4jo3zviNOK2tXMP3bB_tGKt7x8zW-3z-zkQR7AquRTzxef3OKuWCOGRF--RA9-aF4nabb-zqXb4psPbUnMTfFeDPaKtSW6_H-hNjH12zRjbwBffCRigfj3wD16xb8PufioiDDgYo"
          alt="Kitchen" style={{ width: "100%", height: "110%", objectFit: "cover", transform: "scale(1.08)", willChange: "transform", transition: "transform 0.05s linear" }} />
      </div>

      {/* Content */}
      <div style={{ position: "relative", zIndex: 2, maxWidth: 760, width: "100%", padding: "clamp(32px, 8vw, 60px) 18px", textAlign: "center" }}>
        <span style={{ display: "inline-block", padding: "5px 16px", borderRadius: 99, background: "rgba(51,199,56,0.2)", color: "#4ade80", fontSize: 11.5, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 20 }}>
          Your personal chef awaits
        </span>
        <h1 style={{ color: "#fff", fontWeight: 900, fontSize: "clamp(2.2rem, 6vw, 4.2rem)", lineHeight: 1.1, letterSpacing: -1.2, margin: "0 0 14px" }}>
          Turn your fridge into{" "}<span style={{ color: "#4ade80", fontStyle: "italic" }}>a feast.</span>
        </h1>
        <p style={{ color: "rgba(255,255,255,0.88)", fontSize: "clamp(13px, 3vw, 17px)", maxWidth: 500, margin: "0 auto 28px", lineHeight: 1.65, fontWeight: 400 }}>
          Enter the ingredients you have on hand and we'll find the perfect recipe to cook tonight.
        </p>

        {/* Search box */}
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", inset: 0, background: "rgba(51,199,56,0.22)", filter: "blur(20px)", borderRadius: 16, pointerEvents: "none" }} />
            <div className="home-search" style={{ position: "relative", display: "flex", alignItems: "flex-start", background: "#fff", borderRadius: 16, padding: "6px 6px 6px 14px", boxShadow: "0 20px 60px rgba(0,0,0,0.26)" }}>
              <div style={{ paddingTop: 11, color: "#94a3b8", flexShrink: 0 }}>
                <Icon n="flatware" size={20} />
              </div>
              <IngInput chips={chips} onAdd={v => setChips(p => [...p, v])} onRemove={v => setChips(p => p.filter(i => i !== v))} onSearch={doSearch} placeholder="chicken, spinach, garlic, onion..." />
              <button onClick={doSearch} disabled={chips.length === 0} className="home-find-btn"
                style={{ background: chips.length === 0 ? "#86efac" : "#33c738", color: "#fff", border: "none", borderRadius: 12, cursor: chips.length === 0 ? "not-allowed" : "pointer", padding: "12px 22px", fontWeight: 700, fontSize: 14, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 7, flexShrink: 0, alignSelf: "flex-start", marginTop: 1, transition: "background 0.2s" }}>
                Find Recipes <Icon n="search" size={18} />
              </button>
            </div>
          </div>

          {/* Popular recipe pills */}
          <div style={{ marginTop: 20, display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8, alignItems: "center" }}>
            <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: 500 }}>Popular now:</span>
            {popularRecipes.map(r => {
              const ce = CUISINES.find(c => c.label === r.cuisine);
              return (
                <button key={r.id} onClick={() => onSearch([r.ingredients[0], r.ingredients[1]].filter(Boolean))}
                  style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", padding: "5px 14px", borderRadius: 99, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 5, transition: "background 0.18s" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.22)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.12)")}>
                  {ce?.emoji} {r.title}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   RECIPES PAGE  (with search bar + autocomplete suggestions)
───────────────────────────────────────────────────────────────────────── */
function RecipesPage({ onViewRecipe, cuisine, onCuisineChange }: { onViewRecipe: (r: Recipe) => void; cuisine: Cuisine; onCuisineChange: (c: Cuisine) => void }) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Recipe[]>([]);
  const [showSugg, setShowSugg] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const displayed = searchByName(query, cuisine);

  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 1) { setSuggestions([]); return; }
    setSuggestions(
      ALL_RECIPES.filter(r => {
        const matchCuisine = cuisine === "All" || r.cuisine === cuisine;
        const matchQ = r.title.toLowerCase().includes(q) || r.tags.some(t => t.includes(q));
        return matchCuisine && matchQ;
      }).slice(0, 7)
    );
  }, [query, cuisine]);

  useEffect(() => {
    const close = (e: MouseEvent) => { if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowSugg(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const [visibleCount, setVisibleCount] = useState(12);
  const [vegFilter, setVegFilter] = useState<"all"|"veg"|"nonveg">("all");
  const filteredDisplayed = vegFilter === "all" ? displayed
  : vegFilter === "veg" ? displayed.filter((r: Recipe) => isVegRecipe(r))
  : displayed.filter((r: Recipe) => !isVegRecipe(r));
const visibleRecipes = filteredDisplayed.slice(0, visibleCount);

  return (
    <div className="glass-page" style={{ padding: "32px 32px 40px" }}>

          {/* Header + search */}
          <div className="recipes-header" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 20 }}>
            <div>
              <h1 style={{ fontSize: 26, fontWeight: 900, color: "#0f172a", margin: "0 0 4px" }}>Browse Recipes</h1>
              <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>{displayed.length} recipes · click any to see the full cooking guide</p>
            </div>
            <div ref={searchRef} className="recipes-searchbar" style={{ position: "relative", width: 300 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "rgba(255,255,255,0.8)", borderRadius: 13, border: `1.5px solid ${showSugg && query ? "#33c738" : "rgba(51,199,56,0.2)"}`, transition: "border-color 0.18s", backdropFilter: "blur(8px)" }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: "#94a3b8" }}>search</span>
                <input value={query} onChange={e => { setQuery(e.target.value); setShowSugg(true); }} onFocus={() => setShowSugg(true)}
                  placeholder="Search recipes, e.g. biryani..."
                  style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontFamily: "inherit", fontSize: 13.5, color: "#1e293b" }} />
                {query && <button onClick={() => { setQuery(""); setSuggestions([]); }} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", padding: 0, color: "#94a3b8" }}><Icon n="close" size={16} /></button>}
              </div>
              {showSugg && suggestions.length > 0 && (
                <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, boxShadow: "0 12px 36px rgba(0,0,0,0.13)", zIndex: 9999, overflow: "hidden" }}>
                  {suggestions.map(r => {
                    const ce = CUISINES.find(c => c.label === r.cuisine);
                    return (
                      <div key={r.id} onMouseDown={() => { onViewRecipe(r); setShowSugg(false); setQuery(r.title); }}
                        style={{ padding: "10px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 11 }}
                        onMouseEnter={e => (e.currentTarget.style.background = "#f0fdf4")}
                        onMouseLeave={e => (e.currentTarget.style.background = "#fff")}>
                        <div style={{ width: 42, height: 42, borderRadius: 9, overflow: "hidden", flexShrink: 0, border: "1px solid #f1f5f9" }}>
                          <SafeImg src={r.image} alt={r.title} id={r.id} />
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", lineHeight: 1.3 }}>{r.title}</div>
                          <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 2 }}>{ce?.emoji} {r.cuisine} · {r.readyInMinutes} min · {r.difficulty}</div>
                        </div>
                      </div>
                    );
                  })}
                  <div style={{ padding: "8px 14px", fontSize: 11.5, color: "#94a3b8", borderTop: "1px solid #f1f5f9", background: "#fafafa" }}>Click to open recipe</div>
                </div>
              )}
            </div>
          </div>

          <CuisineBar selected={cuisine} onChange={c => { onCuisineChange(c); setQuery(""); setVisibleCount(12); }} />

          {/* Veg / Non-Veg Filter */}
          <div style={{ display: "flex", gap: 6, marginTop: 12, marginBottom: 4 }}>
            {(["all","veg","nonveg"] as const).map(v => (
              <button key={v} onClick={() => setVegFilter(v)}
                style={{
                  padding: "5px 14px", borderRadius: 99, border: "none", cursor: "pointer",
                  fontFamily: "inherit", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap",
                  background: vegFilter === v
                    ? v === "veg" ? "#22c55e" : v === "nonveg" ? "#f97316" : "#33c738"
                    : "#f1f5f9",
                  color: vegFilter === v ? "#fff" : "#64748b",
                  transition: "all 0.18s",
                }}>
                {v === "all" ? "🌍 All" : v === "veg" ? "🟢 Veg Only" : "🔴 Non-Veg Only"}
              </button>
            ))}
          </div>

          {/* Grid */}
          <div style={{ marginTop: 20 }}>
            {filteredDisplayed.length === 0 ? (
              <div style={{ textAlign: "center", padding: "64px 20px", color: "#94a3b8" }}>
                <Icon n="search_off" size={52} color="#cbd5e1" />
                <h3 style={{ fontSize: 18, fontWeight: 700, color: "#475569", margin: "14px 0 6px" }}>No recipes found</h3>
                <p style={{ fontSize: 13 }}>Try a different search or switch to "All" cuisines.</p>
              </div>
            ) : (
              <>
                <div className="recipe-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 18 }}>
                {visibleRecipes.map((r: Recipe, i: number) => <RecipeCard key={r.id} recipe={r} onClick={() => onViewRecipe(r)} delay={i * 30} />)}
                </div>
                {visibleCount < filteredDisplayed.length && (
                  <div style={{ marginTop: 36, display: "flex", justifyContent: "center" }}>
                    <button onClick={() => setVisibleCount(v => v + 12)}
                      style={{ padding: "12px 32px", background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 14, color: "#374151", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 2px 8px rgba(0,0,0,0.07)" }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = "#33c738"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(51,199,56,0.15)"; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.07)"; }}>
                      View more recipes
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   RESULTS PAGE
───────────────────────────────────────────────────────────────────────── */
function ResultsPage({ chips, onAddChip, onRemoveChip, onViewRecipe, cuisine, onCuisineChange }:
  { chips: string[]; onAddChip: (v: string) => void; onRemoveChip: (v: string) => void; onViewRecipe: (r: Recipe) => void; cuisine: Cuisine; onCuisineChange: (c: Cuisine) => void }) {
  const [liveRecipes, setLiveRecipes] = useState<Recipe[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Fetch from Supabase Edge Function when not in mock mode
  const fetchLive = useCallback(async (ings: string[]) => {
    if (USE_MOCK || ings.length === 0) { setLiveRecipes(null); return; }
    setLoading(true);
    setApiError(null);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/search-recipes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${(await supabase.auth.getSession()).data.session?.access_token ?? SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ ingredients: ings }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Search failed");
      // Map Spoonacular results to local Recipe shape for display
      const mapped: Recipe[] = (data.recipes || []).map((r: any) => ({
        id: r.id,
        title: r.title,
        image: r.image,
        cuisine: mapSpoonCuisine(r.cuisines),
        readyInMinutes: r.readyInMinutes ?? 30,
        servings: r.servings ?? 4,
        difficulty: "Medium" as const,
        description: r.summary
          ? r.summary.replace(/<[^>]+>/g, "").slice(0, 160) + "…"
          : r.dishTypes?.join(", ") || "Delicious recipe",
        ingredients: r.usedIngredients ?? [],
        missingIngredients: r.missedIngredients ?? [],
        // Map Spoonacular's {number, step} → our {step, title, instruction}
        steps: (r.steps ?? []).map((s: { number: number; step: string }) => ({
          step: s.number,
          title: `Step ${s.number}`,
          instruction: s.step,
        })),
        proTip: r.diets?.length ? `This recipe is ${r.diets.join(", ")}.` : "Taste and adjust seasoning before serving.",
        tags: r.diets ?? [],
      }));
      setLiveRecipes(mapped);
    } catch (err: any) {
      setApiError(err.message);
      setLiveRecipes(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLive(chips); }, [chips, fetchLive]);

  const filteredLive = liveRecipes
    ? (cuisine === "All" ? liveRecipes : liveRecipes.filter(r => r.cuisine === cuisine))
    : null;

  const recipes = USE_MOCK
    ? matchByIngredients(chips, cuisine)
    : (filteredLive ?? matchByIngredients(chips, cuisine));

  const [visibleCount, setVisibleCount] = useState(12);

  const [vegFilter, setVegFilter] = useState<"all"|"veg"|"nonveg">("all");
  const filteredDisplayed = vegFilter === "all" ? recipes
  : vegFilter === "veg" ? recipes.filter(r => isVegRecipe(r))
  : recipes.filter(r => !isVegRecipe(r));
const visibleRecipes = filteredDisplayed.slice(0, visibleCount);

  return (
    <div className="glass-page" style={{ padding: "32px 32px 40px" }}>

          {/* Header row */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
            <h1 style={{ fontSize: 26, fontWeight: 900, color: "#0f172a", margin: 0 }}>Search Results</h1>
            <p style={{ fontSize: 12, color: "#94a3b8", margin: 0, display: "flex", alignItems: "center", gap: 4 }}><span className="material-symbols-outlined" style={{ fontSize: 14 }}>sort</span> Sorted by best ingredient match</p>
            <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>
              {loading ? "Searching recipes…" : `Found ${recipes.length} recipes matching your pantry`}
            </p>
          </div>

          {/* Ingredient chips row */}
          <div className="chips-row" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginBottom: 20 }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", marginRight: 4, whiteSpace: "nowrap" }}>Your Ingredients:</span>
            {chips.map(c => (
              <div key={c} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 12px", background: "#33c738", color: "#fff", borderRadius: 99, fontSize: 13, fontWeight: 600 }}>
                {c}
                <button onClick={() => onRemoveChip(c)} style={{ background: "none", border: "none", cursor: "pointer", color: "#fff", display: "flex", padding: 0, opacity: 0.85 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 15 }}>close</span>
                </button>
              </div>
            ))}
            <IngInput chips={chips} onAdd={onAddChip} onRemove={onRemoveChip} placeholder="+ add more..." hideChips />
          </div>

          {/* Source indicator */}
          {!USE_MOCK && (
            <div style={{ marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
              {apiError ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 12px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 99, fontSize: 12, fontWeight: 600, color: "#64748b" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 14, color: "#94a3b8" }}>menu_book</span>
                  Showing from local library
                </span>
              ) : (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 12px", background: "rgba(51,199,56,0.08)", border: "1px solid rgba(51,199,56,0.2)", borderRadius: 99, fontSize: 12, fontWeight: 600, color: "#15803d" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>wifi</span>
                  Live results
                </span>
              )}
            </div>
          )}

          {/* Cuisine filter bar */}
          <CuisineBar selected={cuisine} onChange={onCuisineChange} />

          {/* Veg / Non-Veg Filter */}
          <div style={{ display: "flex", gap: 6, marginTop: 12, marginBottom: 4 }}>
            {(["all","veg","nonveg"] as const).map(v => (
              <button key={v} onClick={() => setVegFilter(v)}
                style={{
                  padding: "5px 14px", borderRadius: 99, border: "none", cursor: "pointer",
                  fontFamily: "inherit", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap",
                  background: vegFilter === v
                    ? v === "veg" ? "#22c55e" : v === "nonveg" ? "#f97316" : "#33c738"
                    : "#f1f5f9",
                  color: vegFilter === v ? "#fff" : "#64748b",
                  transition: "all 0.18s",
                }}>
                {v === "all" ? "🌍 All" : v === "veg" ? "🟢 Veg Only" : "🔴 Non-Veg Only"}
              </button>
            ))}
          </div>

          {/* Recipe grid */}
          <div style={{ marginTop: 20 }}>
            {loading ? (
              <div className="recipe-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 18 }}>
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} style={{ background: "rgba(255,255,255,0.8)", borderRadius: 16, overflow: "hidden", border: "1.5px solid rgba(51,199,56,0.15)" }}>
                    <div style={{ aspectRatio: "4/3", background: "linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
                    <div style={{ padding: 14 }}>
                      <div style={{ height: 14, background: "linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite", borderRadius: 6, marginBottom: 8, width: "70%" }} />
                      <div style={{ height: 10, background: "linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite", borderRadius: 6, width: "45%" }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : recipes.length === 0 ? (
              <div style={{ textAlign: "center", padding: "64px 20px", color: "#94a3b8" }}>
                <Icon n="no_meals" size={52} color="#cbd5e1" />
                <h3 style={{ fontSize: 18, fontWeight: 700, color: "#475569", margin: "14px 0 6px" }}>No matching recipes</h3>
                <p style={{ fontSize: 13, margin: "0 0 16px" }}>Try adding more ingredients or switch to "All" cuisines.</p>
                {cuisine !== "All" && <button onClick={() => onCuisineChange("All")} style={{ padding: "9px 22px", background: "#33c738", color: "#fff", border: "none", borderRadius: 99, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Show All Cuisines</button>}
              </div>
            ) : (
              <>
                <div className="recipe-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 18 }}>
                  {visibleRecipes.map((r, i) => <RecipeCard key={r.id} recipe={r} onClick={() => onViewRecipe(r)} delay={i * 30} />)}
                </div>
                {visibleCount < recipes.length && (
                  <div style={{ marginTop: 36, display: "flex", justifyContent: "center" }}>
                    <button onClick={() => setVisibleCount(v => v + 12)}
                      style={{ padding: "12px 32px", background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 14, color: "#374151", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 2px 8px rgba(0,0,0,0.07)", transition: "box-shadow 0.18s, border-color 0.18s" }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = "#33c738"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(51,199,56,0.15)"; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.07)"; }}>
                      View more recipes
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   ROOT APP
───────────────────────────────────────────────────────────────────────── */
export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true); // checking session on load

  const [view, setView] = useState<ViewName>("home");
  const [chips, setChips] = useState<string[]>([]);
  const [activeRecipe, setActiveRecipe] = useState<Recipe | null>(null);
  const [browseCuisine, setBrowseCuisine] = useState<Cuisine>("All");
  const [resultsCuisine, setResultsCuisine] = useState<Cuisine>("All");

  // ── Check for existing Supabase session on first load ──────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });
    // Listen for login / logout events (e.g. email confirmation redirect)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setView("home");
    setChips([]);
  };

  const handleSearch = (ings: string[]) => { setChips(ings); setView("results"); };
  const handleAddChip = (v: string) => { if (!chips.includes(v)) setChips(p => [...p, v]); };
  const handleRemoveChip = (v: string) => {
    const next = chips.filter(i => i !== v);
    setChips(next);
    if (next.length === 0 && view === "results") setView("home");
  };

  const GLOBAL_STYLES = `
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
    @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap');
    * { box-sizing: border-box; }
    body { margin: 0; padding: 0; }
    .material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; user-select: none; }
    @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes float1 { 0%,100%{transform:translate(0,0) rotate(0deg);}33%{transform:translate(10px,-20px) rotate(5deg);}66%{transform:translate(-15px,15px) rotate(-5deg);} }
    @keyframes float2 { 0%,100%{transform:translate(0,0) rotate(0deg);}50%{transform:translate(-20px,-30px) rotate(-10deg);} }
    @keyframes gradShift { 0%{background-position:0% 50%;}50%{background-position:100% 50%;}100%{background-position:0% 50%;} }
    .float1{animation:float1 20s ease-in-out infinite;} .float2{animation:float2 25s ease-in-out infinite;}
    .float2d{animation:float2 25s ease-in-out infinite;animation-delay:-5s;} .float1d{animation:float1 20s ease-in-out infinite;animation-delay:-2s;}
    .bg-anim{background:linear-gradient(-45deg,#f6f8f6,#e7f5e7,#f0fdf4,#f6f8f6);background-size:400% 400%;animation:gradShift 15s ease infinite;}
    .cuisine-bar{display:flex;gap:8px;overflow-x:auto;padding-bottom:4px;-webkit-overflow-scrolling:touch;scrollbar-width:none;}
    .cuisine-bar::-webkit-scrollbar{display:none;}
    .parallax-card { transform: translateZ(0); will-change: transform; }
    @keyframes slideUp { from { opacity:0; transform:translateY(22px); } to { opacity:1; transform:translateY(0); } }
    .fade-in { animation: slideUp 0.45s ease both; }
    @media(max-width:640px){
      .nb-links{display:none!important;}
      .nb-name{display:none!important;}
      .glass-page{padding:16px 14px 28px!important;}
      .recipe-grid{grid-template-columns:repeat(2,1fr)!important;gap:10px!important;}
      .page-glass{margin:12px 0!important;border-radius:18px!important;}
      .recipes-header{flex-direction:column!important;gap:10px!important;}
      .recipes-searchbar{width:100%!important;}
      .modal-wrap{padding:0!important;}
      .modal-box{border-radius:14px!important;max-height:96vh!important;}
      .modal-body{padding:14px 14px 28px!important;}
      .modal-ing-grid{grid-template-columns:1fr!important;}
      .home-search{flex-direction:column!important;padding:10px!important;gap:8px!important;}
      .home-find-btn{width:100%!important;justify-content:center!important;margin-top:0!important;border-radius:10px!important;padding:13px!important;}
      .footer-grid{grid-template-columns:1fr 1fr!important;gap:20px!important;}
      .chips-row{gap:5px!important;}
    }
    @media(max-width:380px){
      .recipe-grid{grid-template-columns:1fr!important;}
    }
  `;

  // ── 1. Still checking session → subtle full-screen loader ──────────────
  if (authLoading) {
    return (
      <div style={{ fontFamily: "'Plus Jakarta Sans', 'Segoe UI', sans-serif" }}>
        <style>{GLOBAL_STYLES}</style>
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#f6f8f6", gap: 16 }}>
          <div style={{ width: 56, height: 56, background: "#33c738", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 24px rgba(51,199,56,0.3)" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 30, color: "#fff", animation: "spin 1.2s linear infinite" }}>progress_activity</span>
          </div>
          <p style={{ fontSize: 14, color: "#64748b", fontWeight: 600 }}>Loading…</p>
        </div>
      </div>
    );
  }

  // ── 2. Not logged in → show Auth page ─────────────────────────────────
  if (!user) {
    return (
      <div style={{ fontFamily: "'Plus Jakarta Sans', 'Segoe UI', sans-serif" }}>
        <style>{GLOBAL_STYLES}</style>
        <AuthPage onAuth={setUser} />
      </div>
    );
  }

  // ── 3. Logged in → show full app ───────────────────────────────────────
  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', 'Segoe UI', sans-serif", minHeight: "100vh", position: "relative", margin: 0, padding: 0 }}>
      <style>{GLOBAL_STYLES}</style>

      {/* Animated background layer */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, overflow: "hidden", pointerEvents: "none" }}>
        <div className="bg-anim" style={{ position: "absolute", inset: 0, opacity: 0.7 }} />
        <span className="material-symbols-outlined float1" style={{ position: "absolute", top: "10%", left: "5%", fontSize: 120, color: "rgba(51,199,56,0.08)", userSelect: "none" }}>eco</span>
        <span className="material-symbols-outlined float2" style={{ position: "absolute", bottom: "15%", right: "10%", fontSize: 150, color: "rgba(51,199,56,0.08)", userSelect: "none" }}>potted_plant</span>
        <span className="material-symbols-outlined float2d" style={{ position: "absolute", top: "40%", right: "5%", fontSize: 80, color: "rgba(249,115,22,0.08)", userSelect: "none" }}>grain</span>
        <span className="material-symbols-outlined float1d" style={{ position: "absolute", bottom: "30%", left: "8%", fontSize: 100, color: "rgba(234,179,8,0.08)", userSelect: "none" }}>opacity</span>
        <span className="material-symbols-outlined float1" style={{ position: "absolute", top: "70%", left: "50%", transform: "translateX(-50%)", fontSize: 200, color: "rgba(100,116,139,0.04)", userSelect: "none", animationDelay: "-8s" }}>restaurant</span>
      </div>

      {/* App content */}
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <NavBar view={view} setView={setView} user={user} onSignOut={handleSignOut} />

        {activeRecipe && <RecipeModal recipe={activeRecipe} onClose={() => setActiveRecipe(null)} />}

        <PageTransition visible={view === "home"}>
          <HomePage onSearch={handleSearch} />
          <Footer />
        </PageTransition>

        <PageTransition visible={view === "recipes"}>
          {/* Glass main wrapper matches HTML design */}
          <div style={{ width: "100%", maxWidth: 1280, margin: "0 auto", padding: "0 12px" }}>
            <div className="page-glass" style={{ background: "rgba(255,255,255,0.60)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderRadius: 28, border: "1px solid rgba(255,255,255,0.20)", boxShadow: "0 20px 60px rgba(0,0,0,0.10)", margin: "32px 0", overflow: "hidden" }}>
              <RecipesPage onViewRecipe={r => setActiveRecipe(r)} cuisine={browseCuisine} onCuisineChange={setBrowseCuisine} />
            </div>
          </div>
          <Footer />
        </PageTransition>

        <PageTransition visible={view === "results"}>
          <div style={{ width: "100%", maxWidth: 1280, margin: "0 auto", padding: "0 12px" }}>
            <div className="page-glass" style={{ background: "rgba(255,255,255,0.60)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderRadius: 28, border: "1px solid rgba(255,255,255,0.20)", boxShadow: "0 20px 60px rgba(0,0,0,0.10)", margin: "32px 0", overflow: "hidden" }}>
              <ResultsPage chips={chips} onAddChip={handleAddChip} onRemoveChip={handleRemoveChip} onViewRecipe={r => setActiveRecipe(r)} cuisine={resultsCuisine} onCuisineChange={setResultsCuisine} />
            </div>
          </div>
          <Footer />
        </PageTransition>




      </div>
    </div>
  );
}