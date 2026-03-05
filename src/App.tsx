import { useState, useRef, useEffect, useCallback } from "react";

/* ─────────────────────────────────────────────────────────────────────────
   SUPABASE CONFIG — replace these with your real values, then set USE_MOCK to false
───────────────────────────────────────────────────────────────────────── */
const SUPABASE_URL = "https://YOUR_PROJECT.supabase.co";
const SUPABASE_ANON_KEY = "your_anon_key_here";
const USE_MOCK = true; // ← set to false once Supabase Edge Function is deployed

/* ─────────────────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────────────────── */
type Cuisine = "All" | "Indian" | "Chinese" | "Italian" | "American" | "Mediterranean" | "Mexican" | "Japanese";
type Difficulty = "Easy" | "Medium" | "Hard";
type ViewName = "home" | "recipes" | "results";

interface Step { step: number; title: string; instruction: string; tip?: string; }
interface Recipe {
  id: number; title: string; image: string; cuisine: Cuisine;
  readyInMinutes: number; servings: number; difficulty: Difficulty;
  description: string; ingredients: string[]; missingIngredients: string[];
  steps: Step[]; proTip: string; tags: string[];
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
function matchByIngredients(userIng: string[], cuisine: Cuisine): Recipe[] {
  if (userIng.length === 0) return [];
  const lower = userIng.map(s => s.toLowerCase());
  let pool = cuisine === "All" ? ALL_RECIPES : ALL_RECIPES.filter(r => r.cuisine === cuisine);
  const scored = pool.map(recipe => {
    const score = recipe.ingredients.filter(i => lower.some(u => i.includes(u) || u.includes(i))).length;
    const used = recipe.ingredients.filter(i => lower.some(u => i.includes(u) || u.includes(i)));
    const missing = recipe.ingredients.filter(i => !lower.some(u => i.includes(u) || u.includes(i)));
    return { recipe: { ...recipe, ingredients: used, missingIngredients: missing }, score };
  });
  return scored.filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score || a.recipe.missingIngredients.length - b.recipe.missingIngredients.length)
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
    <div ref={scrollRef} style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 6, flexWrap: "wrap" }}>
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
function IngInput({ chips, onAdd, onRemove, onSearch, placeholder = "Type an ingredient..." }:
  { chips: string[]; onAdd: (v: string) => void; onRemove: (v: string) => void; onSearch?: () => void; placeholder?: string }) {
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
        {chips.map(c => (
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
    <div onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.58)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, backdropFilter: "blur(4px)", transition: "opacity 0.2s" }}>
      <div onClick={e => e.stopPropagation()}
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
            <div style={{ display: "flex", gap: 7, marginBottom: 8, flexWrap: "wrap" }}>
              <span style={{ padding: "3px 10px", borderRadius: 99, background: "rgba(0,0,0,0.45)", color: "#fff", fontSize: 11.5, fontWeight: 600, backdropFilter: "blur(6px)" }}>
                {cuisineEntry?.emoji} {recipe.cuisine}
              </span>
              <DiffBadge level={recipe.difficulty} />
            </div>
            <h2 style={{ color: "#fff", fontSize: 22, fontWeight: 900, margin: 0, lineHeight: 1.2 }}>{recipe.title}</h2>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: "22px 28px 36px" }}>
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
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
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
              <div key={i} style={{ display: "flex", gap: 14, marginBottom: i < recipe.steps.length - 1 ? 22 : 0 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                  <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#33c738", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, flexShrink: 0 }}>{s.step}</div>
                  {i < recipe.steps.length - 1 && <div style={{ width: 2, flex: 1, background: "#e2e8f0", marginTop: 4, minHeight: 18 }} />}
                </div>
                <div style={{ flex: 1, paddingBottom: i < recipe.steps.length - 1 ? 4 : 0 }}>
                  <h4 style={{ fontSize: 13.5, fontWeight: 700, color: "#0f172a", margin: "4px 0 7px" }}>{s.title}</h4>
                  <p style={{ fontSize: 13, color: "#374151", lineHeight: 1.8, margin: "0 0 9px" }}>{s.instruction}</p>
                  {s.tip && (
                    <div style={{ display: "flex", gap: 8, padding: "9px 14px", background: "#fffbeb", borderRadius: 9, border: "1px solid #fde68a" }}>
                      <Icon n="tips_and_updates" size={15} color="#d97706" />
                      <p style={{ fontSize: 12.5, color: "#92400e", margin: 0, lineHeight: 1.65 }}><strong>Chef's Tip:</strong> {s.tip}</p>
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
function RecipeCard({ recipe, onClick, delay = 0 }: { recipe: Recipe; onClick: () => void; delay?: number }) {
  const [hov, setHov] = useState(false);
  const cuisineEntry = CUISINES.find(c => c.label === recipe.cuisine);
  return (
    <div onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: "#fff", borderRadius: 14, overflow: "hidden", border: "1px solid #e8edf2", cursor: "pointer",
        display: "flex", flexDirection: "column",
        transform: hov ? "translateY(-4px)" : "translateY(0)",
        boxShadow: hov ? "0 16px 40px rgba(0,0,0,0.13)" : "0 2px 8px rgba(0,0,0,0.06)",
        transition: "transform 0.22s ease, box-shadow 0.22s ease",
        opacity: 1,
      }}>
      <div style={{ position: "relative", aspectRatio: "4/3", overflow: "hidden", flexShrink: 0 }}>
        <SafeImg src={recipe.image} alt={recipe.title} id={recipe.id}
          style={{ transform: hov ? "scale(1.05)" : "scale(1)", transition: "transform 0.35s ease" }} />
        <div style={{ position: "absolute", top: 9, left: 9, background: "rgba(0,0,0,0.5)", color: "#fff", padding: "3px 9px", borderRadius: 99, fontSize: 11, fontWeight: 600, backdropFilter: "blur(6px)" }}>
          {cuisineEntry?.emoji} {recipe.cuisine}
        </div>
        <div style={{ position: "absolute", bottom: 9, left: 9 }}>
          <span style={{ background: "rgba(0,0,0,0.45)", color: "#fff", fontSize: 10, padding: "2px 8px", borderRadius: 99 }}>Tap to view</span>
        </div>
      </div>
      <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
        <h3 style={{ fontSize: 13.5, fontWeight: 700, color: "#0f172a", margin: 0, lineHeight: 1.3, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical" }}>
          {recipe.title}
        </h3>
        <p style={{ fontSize: 12, color: "#64748b", margin: 0, lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
          {recipe.description}
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: "auto", paddingTop: 4 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "3px 9px", borderRadius: 6, background: "#f1f5f9", color: "#475569", fontSize: 11, fontWeight: 600 }}>
            <Icon n="schedule" size={13} /> {recipe.readyInMinutes} min
          </span>
          <DiffBadge level={recipe.difficulty} />
          {recipe.missingIngredients.length === 0
            ? <span style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "3px 9px", borderRadius: 6, background: "#f0fdf4", color: "#16a34a", fontSize: 11, fontWeight: 600 }}><Icon n="check_circle" size={13} /> All in</span>
            : <span style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "3px 9px", borderRadius: 6, background: "#fff7ed", color: "#ea580c", fontSize: 11, fontWeight: 600 }}><Icon n="shopping_bag" size={13} /> {recipe.missingIngredients.length} missing</span>
          }
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   SHARED FOOTER
───────────────────────────────────────────────────────────────────────── */
function Footer() {
  return (
    <footer style={{ background: "#0f172a", color: "#94a3b8", padding: "48px 40px 0" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 40, marginBottom: 44 }}>
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
function NavBar({ view, setView }: { view: ViewName; setView: (v: ViewName) => void }) {
  return (
    <header style={{
      position: "sticky", top: 0, zIndex: 200,
      background: "rgba(255,255,255,0.88)", backdropFilter: "blur(14px)",
      borderBottom: "1px solid rgba(51,199,56,0.12)", padding: "11px 40px",
    }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button onClick={() => setView("home")} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, padding: 0 }}>
          <div style={{ background: "#33c738", borderRadius: 9, padding: "5px 7px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon n="restaurant" size={20} color="#fff" />
          </div>
          <span style={{ fontSize: 16, fontWeight: 800, color: "#0f172a" }}>What's for Dinner?</span>
        </button>
        <nav style={{ display: "flex", gap: 28, alignItems: "center" }}>
          {(["home", "recipes"] as ViewName[]).map(v => (
            <button key={v} onClick={() => setView(v)}
              style={{
                background: "none", border: "none", cursor: "pointer", fontFamily: "inherit",
                fontSize: 13, fontWeight: 600, padding: "5px 0",
                color: view === v ? "#33c738" : "#475569",
                borderBottom: view === v ? "2px solid #33c738" : "2px solid transparent",
                transition: "color 0.18s, border-color 0.18s",
              }}>
              {v === "home" ? "Home" : "Recipes"}
            </button>
          ))}
          <a href="#" style={{ fontSize: 13, fontWeight: 600, color: "#475569", textDecoration: "none" }}>My Cookbook</a>
        </nav>
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

  return (
    <section style={{ position: "relative", minHeight: "calc(100vh - 54px)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
      {/* Background */}
      <div style={{ position: "absolute", inset: 0 }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.62), rgba(0,0,0,0.35), rgba(0,0,0,0.2))", zIndex: 1 }} />
        <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuCEofLEVOCfMZb_00lQ2a2Tei_4fbxvo1OqQ2y3vQ3w9gESiyMWHyrGvIStAij4jBqCU1D43qK68glm-B4KuVYUjJOJuxYVsJ9MdTX3Tjr-HjHlcVHi5pgY0CwUTXPunFWpAMl4jo3zviNOK2tXMP3bB_tGKt7x8zW-3z-zkQR7AquRTzxef3OKuWCOGRF--RA9-aF4nabb-zqXb4psPbUnMTfFeDPaKtSW6_H-hNjH12zRjbwBffCRigfj3wD16xb8PufioiDDgYo"
          alt="Kitchen" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>

      {/* Content */}
      <div style={{ position: "relative", zIndex: 2, maxWidth: 760, width: "100%", padding: "60px 24px", textAlign: "center" }}>
        <span style={{ display: "inline-block", padding: "5px 16px", borderRadius: 99, background: "rgba(51,199,56,0.2)", color: "#4ade80", fontSize: 11.5, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 20 }}>
          Your personal chef awaits
        </span>
        <h1 style={{ color: "#fff", fontWeight: 900, fontSize: "clamp(2.2rem, 6vw, 4.2rem)", lineHeight: 1.1, letterSpacing: -1.2, margin: "0 0 14px" }}>
          Turn your fridge into{" "}<span style={{ color: "#4ade80", fontStyle: "italic" }}>a feast.</span>
        </h1>
        <p style={{ color: "rgba(255,255,255,0.88)", fontSize: 17, maxWidth: 500, margin: "0 auto 38px", lineHeight: 1.65, fontWeight: 400 }}>
          Enter the ingredients you have on hand and we'll find the perfect recipe to cook tonight.
        </p>

        {/* Search box */}
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", inset: 0, background: "rgba(51,199,56,0.22)", filter: "blur(20px)", borderRadius: 16, pointerEvents: "none" }} />
            <div style={{ position: "relative", display: "flex", alignItems: "flex-start", background: "#fff", borderRadius: 16, padding: "6px 6px 6px 14px", boxShadow: "0 20px 60px rgba(0,0,0,0.26)" }}>
              <div style={{ paddingTop: 11, color: "#94a3b8", flexShrink: 0 }}>
                <Icon n="flatware" size={20} />
              </div>
              <IngInput chips={chips} onAdd={v => setChips(p => [...p, v])} onRemove={v => setChips(p => p.filter(i => i !== v))} onSearch={doSearch} placeholder="chicken, spinach, garlic, onion..." />
              <button onClick={doSearch} disabled={chips.length === 0}
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

  return (
    <div style={{ minHeight: "calc(100vh - 54px)", background: "#f6f8f6" }}>
      {/* Page header with search */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "22px 40px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 18 }}>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 900, color: "#0f172a", margin: "0 0 4px" }}>Browse Recipes</h1>
              <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>{displayed.length} recipes · click any to see the full cooking guide</p>
            </div>
            {/* Recipe search bar with suggestions */}
            <div ref={searchRef} style={{ position: "relative", width: 320 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "#f1f5f9", borderRadius: 13, border: `1.5px solid ${showSugg && query ? "#33c738" : "transparent"}`, transition: "border-color 0.18s" }}>
                <Icon n="search" size={18} color="#94a3b8" />
                <input
                  value={query}
                  onChange={e => { setQuery(e.target.value); setShowSugg(true); }}
                  onFocus={() => setShowSugg(true)}
                  placeholder="Search recipes, e.g. biryani..."
                  style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontFamily: "inherit", fontSize: 13.5, color: "#1e293b" }}
                />
                {query && (
                  <button onClick={() => { setQuery(""); setSuggestions([]); }}
                    style={{ background: "none", border: "none", cursor: "pointer", display: "flex", padding: 0, color: "#94a3b8" }}>
                    <Icon n="close" size={16} />
                  </button>
                )}
              </div>
              {/* Autocomplete dropdown */}
              {showSugg && suggestions.length > 0 && (
                <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, boxShadow: "0 12px 36px rgba(0,0,0,0.13)", zIndex: 9999, overflow: "hidden" }}>
                  {suggestions.map(r => {
                    const ce = CUISINES.find(c => c.label === r.cuisine);
                    return (
                      <div key={r.id}
                        onMouseDown={() => { onViewRecipe(r); setShowSugg(false); setQuery(r.title); }}
                        style={{ padding: "10px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 11, transition: "background 0.12s" }}
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
                  <div style={{ padding: "8px 14px", fontSize: 11.5, color: "#94a3b8", borderTop: "1px solid #f1f5f9", background: "#fafafa" }}>
                    Press Enter or click to open recipe
                  </div>
                </div>
              )}
            </div>
          </div>
          <CuisineBar selected={cuisine} onChange={c => { onCuisineChange(c); setQuery(""); }} />
        </div>
      </div>

      {/* Grid */}
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "28px 40px 60px" }}>
        {displayed.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 20px", color: "#94a3b8" }}>
            <Icon n="search_off" size={52} color="#cbd5e1" />
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "#475569", margin: "14px 0 6px" }}>No recipes found</h3>
            <p style={{ fontSize: 13 }}>Try a different search or switch to "All" cuisines.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 20 }}>
            {displayed.map((r, i) => (
              <RecipeCard key={r.id} recipe={r} onClick={() => onViewRecipe(r)} delay={i * 30} />
            ))}
          </div>
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
          "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
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
        steps: (r.steps ?? []).map((s: { number: number; step: string }, idx: number) => ({
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

  return (
    <div style={{ minHeight: "calc(100vh - 54px)", background: "#f6f8f6" }}>
      <div style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "18px 40px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: "#0f172a", margin: "0 0 3px" }}>Search Results</h1>
          <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 14px" }}>
            {loading ? "Searching recipes…" : `${recipes.length} recipe${recipes.length !== 1 ? "s" : ""} matched · ${cuisine === "All" ? "All cuisines" : cuisine}`}
          </p>
          {/* API mode badge */}
          {!USE_MOCK && (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", background: "rgba(51,199,56,0.1)", border: "1px solid rgba(51,199,56,0.25)", borderRadius: 99, fontSize: 11, fontWeight: 700, color: "#15803d", marginBottom: 10 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 13 }}>wifi</span>
              Live API mode
            </div>
          )}
          {/* Error banner */}
          {apiError && (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 16px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, fontSize: 13, color: "#dc2626", marginBottom: 12 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>error</span>
              <div>
                <strong>API error:</strong> {apiError}
                <div style={{ marginTop: 4, fontSize: 12, color: "#b91c1c" }}>Showing your local recipe library instead. Check your Spoonacular key and Supabase secrets.</div>
              </div>
            </div>
          )}
          {/* Editable ingredient chips */}
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 7, padding: "10px 14px", background: "#f8fafc", borderRadius: 12, border: "1px solid #e2e8f0", marginBottom: 16 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", whiteSpace: "nowrap" }}>Your ingredients:</span>
            <IngInput chips={chips} onAdd={onAddChip} onRemove={onRemoveChip} placeholder="+ Add ingredient..." />
          </div>
          <CuisineBar selected={cuisine} onChange={onCuisineChange} />
        </div>
      </div>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "28px 40px 60px" }}>
        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 20 }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} style={{ background: "#fff", borderRadius: 16, overflow: "hidden", border: "1px solid #e2e8f0" }}>
                <div style={{ aspectRatio: "4/3", background: "linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
                <div style={{ padding: 14 }}>
                  <div style={{ height: 14, background: "linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite", borderRadius: 6, marginBottom: 8, width: "70%" }} />
                  <div style={{ height: 10, background: "linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite", borderRadius: 6, width: "45%" }} />
                </div>
              </div>
            ))}
          </div>
        ) : recipes.length === 0 ? (
          <div style={{ textAlign: "center", padding: "70px 20px", color: "#94a3b8" }}>
            <Icon n="no_meals" size={52} color="#cbd5e1" />
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "#475569", margin: "14px 0 6px" }}>No matching recipes</h3>
            <p style={{ fontSize: 13, margin: "0 0 16px" }}>Try adding more ingredients or switch to "All" cuisines.</p>
            {cuisine !== "All" && <button onClick={() => onCuisineChange("All")} style={{ padding: "9px 22px", background: "#33c738", color: "#fff", border: "none", borderRadius: 99, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Show All Cuisines</button>}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 20 }}>
            {recipes.map((r, i) => <RecipeCard key={r.id} recipe={r} onClick={() => onViewRecipe(r)} delay={i * 30} />)}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   ROOT APP
───────────────────────────────────────────────────────────────────────── */
export default function App() {
  const [view, setView] = useState<ViewName>("home");
  const [chips, setChips] = useState<string[]>([]);
  const [activeRecipe, setActiveRecipe] = useState<Recipe | null>(null);
  const [browseCuisine, setBrowseCuisine] = useState<Cuisine>("All");   // persists on Recipes page
  const [resultsCuisine, setResultsCuisine] = useState<Cuisine>("All"); // persists on Results page

  const handleSearch = (ings: string[]) => { setChips(ings); setView("results"); };
  const handleAddChip = (v: string) => { if (!chips.includes(v)) setChips(p => [...p, v]); };
  const handleRemoveChip = (v: string) => {
    const next = chips.filter(i => i !== v);
    setChips(next);
    if (next.length === 0 && view === "results") setView("home");
  };

  const changeView = (v: ViewName) => { setView(v); };

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', 'Segoe UI', sans-serif", minHeight: "100vh", background: "#f6f8f6", margin: 0, padding: 0 }}>
      {/* Inject font from Google */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; padding: 0; }
        .material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; user-select: none; }
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
      `}</style>

      <NavBar view={view} setView={changeView} />

      {/* Modal */}
      {activeRecipe && <RecipeModal recipe={activeRecipe} onClose={() => setActiveRecipe(null)} />}

      {/* Pages with smooth transitions */}
      <PageTransition visible={view === "home"}>
        <HomePage onSearch={handleSearch} />
        <Footer />
      </PageTransition>

      <PageTransition visible={view === "recipes"}>
        <RecipesPage onViewRecipe={r => setActiveRecipe(r)} cuisine={browseCuisine} onCuisineChange={setBrowseCuisine} />
        <Footer />
      </PageTransition>

      <PageTransition visible={view === "results"}>
        <ResultsPage chips={chips} onAddChip={handleAddChip} onRemoveChip={handleRemoveChip} onViewRecipe={r => setActiveRecipe(r)} cuisine={resultsCuisine} onCuisineChange={setResultsCuisine} />
        <Footer />
      </PageTransition>
    </div>
  );
}