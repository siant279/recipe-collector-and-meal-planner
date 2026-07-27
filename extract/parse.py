import re, json, os

BASE = "/sessions/compassionate-gallant-hopper/mnt/outputs/extract"

def load(name):
    with open(f"{BASE}/{name}", encoding="utf-8") as f:
        return f.read()

def is_noise(line):
    s = line.strip()
    if not s:
        return True
    if re.match(r'^\d+$', s):
        return True
    if 'E V E RY DAY' in s or 'R E A L E ASY' in s:
        return True
    return False

def parse_recipes(text, source, default_meal=None):
    lines = text.split('\n')
    marker_idx = []
    for i, l in enumerate(lines):
        if re.search(r'PREP(\s*TIME)?\s+[\d\w]', l, re.I) or re.search(r'\bMAKES\b\s+\d', l, re.I):
            marker_idx.append(i)
    recipes = []
    day_meal = None
    for mi_pos, i in enumerate(marker_idx):
        j = i - 1
        title = None
        scan_limit = max(0, i - 20)
        while j >= scan_limit:
            s = lines[j].strip()
            if is_noise(s):
                j -= 1
                continue
            dm = re.match(r'^\s*DAY\s+(\d+)\s+([A-Z ]+?)(\s{2,}.*)?$', s)
            if dm:
                day_meal = (int(dm.group(1)), dm.group(2).strip())
                j -= 1
                continue
            if title is None:
                title = s
            j -= 1
        if not title:
            continue
        end = marker_idx[mi_pos+1] - 1 if mi_pos + 1 < len(marker_idx) else min(i + 80, len(lines))
        body_lines = lines[i:end]
        # trim trailing lines that are actually the next section's DAY/MEAL header or noise
        while body_lines and (is_noise(body_lines[-1]) or re.match(r'^\s*DAY\s+\d+\s+[A-Z ]+', body_lines[-1].strip()) or body_lines[-1].strip() == ''):
            body_lines.pop()
        body = '\n'.join(l for l in body_lines if not is_noise(l))
        body = body.replace('\f', '\n').strip()
        servings = prep = cook = None
        makes_m = re.search(r'MAKES\s+(.+?)(?=PREP)', lines[i], re.I)
        if makes_m:
            servings = makes_m.group(1).strip()
        prep_m = re.search(r'PREP(?:\s*TIME)?\s+([\w–\- ]+?)(?=(COOK|$))', lines[i], re.I)
        if prep_m:
            prep = prep_m.group(1).strip()
        cook_m = re.search(r'COOK(?:\s*TIME)?\s+([\w–\- ]+)$', lines[i], re.I)
        if cook_m:
            cook = cook_m.group(1).strip()
        meal_type = default_meal
        day_num = None
        if day_meal:
            day_num, label = day_meal
            label = label.upper()
            if 'BREAKFAST' in label:
                meal_type = 'breakfast'
            elif 'LUNCH' in label:
                meal_type = 'lunch'
            elif 'SNACK' in label:
                meal_type = 'snack'
            elif 'DINNER' in label:
                meal_type = 'dinner'
        recipes.append({
            'title': title,
            'source': source,
            'meal_type': meal_type,
            'day': day_num,
            'servings': servings,
            'prep_time': prep,
            'cook_time': cook,
            'content': body.strip(),
        })
    return recipes

all_recipes = []
all_recipes += parse_recipes(load('KEIC-Everyday-Lunches-iumtxy.txt'), 'Everyday Lunches', default_meal='lunch')
all_recipes += parse_recipes(load('KEIC_2022-12_EverydaySnacks-ouely6.txt'), 'Everyday Snacks', default_meal='snack')
all_recipes += parse_recipes(load('KEIC_RealEasyWeekdays-kbiguj.txt'), 'Real Easy Weekdays', default_meal=None)

# filter junk / empty entries and dedupe by (title, source, day)
clean = []
seen = set()
for r in all_recipes:
    if len(r['content']) < 40:
        continue
    if re.search(r'AGES\s+1', r['title']):
        continue
    if len(r['title'].split()) > 8 or r['title'][0].islower():
        continue
    key = (r['title'], r['source'], r['day'])
    if key in seen:
        continue
    seen.add(key)
    clean.append(r)

print("total recipes parsed:", len(all_recipes), "-> cleaned:", len(clean))
from collections import Counter
print(Counter(r['source'] for r in clean))
print(Counter(r['meal_type'] for r in clean))

with open(f"{BASE}/recipes_raw.json", "w") as f:
    json.dump(clean, f, indent=1)
