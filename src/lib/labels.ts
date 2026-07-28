import type { Audience, MealType } from "@/lib/types";

export const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

/** CSS class for color-coded meal chips */
export const MEAL_CHIP_CLASS: Record<MealType, string> = {
  breakfast: "chip-meal-breakfast",
  lunch: "chip-meal-lunch",
  dinner: "chip-meal-dinner",
  snack: "chip-meal-snack",
};

export const AUDIENCE_OPTIONS: { value: Audience | ""; label: string }[] = [
  { value: "", label: "All" },
  { value: "cami", label: "Cami-friendly" },
  { value: "adult", label: "Adult" },
];

export const AUDIENCE_LABELS: Record<Audience, string> = {
  cami: "Cami-friendly",
  adult: "Adult",
};

export const APP_NAME = "Recipe Collector and Meal Planner";
export const APP_TAGLINE = "Collect recipes · Plan meals · Shop smarter";
