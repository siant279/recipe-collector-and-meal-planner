export type MealType = "breakfast" | "lunch" | "snack" | "dinner";

export type Audience = "cami" | "adult";

export type RecipeSubmissionStatus =
  | "pending"
  | "parsed"
  | "needs_review"
  | "approved"
  | "rejected";

export type RecipeInputType =
  | "url"
  | "text"
  | "email"
  | "pdf"
  | "image"
  | "drive_file";

export type Recipe = {
  id: string;
  title: string;
  source: string | null;
  meal_type: MealType | null;
  audience: Audience | null;
  day: number | null;
  servings: string | null;
  prep_time: string | null;
  cook_time: string | null;
  ingredients: string[];
  directions: string[];
  optional_sides: string[];
  choking_flags: string[];
  tags: string[];
  image_url: string | null;
  source_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type MealPlanRow = {
  id: string;
  plan_date: string;
  meal_type: MealType;
  recipe_id: string | null;
  notes: string | null;
  added_by: string | null;
  created_at: string;
  recipes?: Recipe | null;
};

export type ShoppingListItem = {
  id: string;
  text: string;
  checked: boolean;
  recipe_id: string | null;
  added_by: string | null;
  created_at: string;
};

export type PantryItem = {
  id: string;
  text: string;
  normalized: string;
  added_by: string | null;
  created_at: string;
};

export type RecipeSubmission = {
  id: string;
  raw_input: string | null;
  input_type: RecipeInputType | null;
  source_ref: string | null;
  parsed_recipe: Partial<Recipe> | null;
  status: RecipeSubmissionStatus;
  parse_error: string | null;
  submitted_by: string | null;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  approved_recipe_id: string | null;
};

export type ParsedRecipeDraft = {
  title: string;
  source?: string | null;
  meal_type?: MealType | null;
  audience?: Audience | null;
  servings?: string | null;
  prep_time?: string | null;
  cook_time?: string | null;
  ingredients: string[];
  directions: string[];
  optional_sides?: string[];
  choking_flags?: string[];
  tags?: string[];
  source_url?: string | null;
};
