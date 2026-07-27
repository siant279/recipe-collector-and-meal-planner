import re, json

BASE = "/sessions/compassionate-gallant-hopper/mnt/outputs/extract"

HAZARDS = {
    "whole grapes / cherry tomatoes": r"whole grapes|cherry tomato|grape tomato|\bgrapes\b",
    "hot dogs / sausages": r"\bhot dog|\bsausage",
    "nuts / seeds (whole)": r"\bwhole nuts|\bpeanuts\b|\balmonds\b|\bcashews\b|\bwalnuts\b|\bpepitas\b|\bsunflower seeds\b|\bchia seeds\b|\bhemp",
    "nut/seed butter (spoonfuls)": r"peanut butter|almond butter|seed butter|sunflower butter",
    "popcorn": r"\bpopcorn\b",
    "hard raw veg/fruit chunks": r"\bcarrot sticks\b|\bbaby carrots\b|\braw carrot\b|\bapple slices\b|\bapple chunks\b|\braw apple\b",
    "chunks of cheese / string cheese": r"string cheese|cheese cubes|chunks? of cheese",
    "marshmallows": r"marshmallow",
    "tough/whole meat pieces": r"chicken breast(?!, ?shredded)|steak\b|whole meatball",
}

def scan(content):
    hits = []
    low = content.lower()
    for label, pat in HAZARDS.items():
        if re.search(pat, low):
            hits.append(label)
    return hits

recipes = json.load(open(f"{BASE}/recipes_raw.json"))
for idx, r in enumerate(recipes):
    r['id'] = idx + 1
    r['choking_flags'] = scan(r['content'])

with open(f"{BASE}/recipes_final.json", "w") as f:
    json.dump(recipes, f, indent=1, ensure_ascii=False)

print("done", len(recipes))
flagged = sum(1 for r in recipes if r['choking_flags'])
print("flagged:", flagged)
