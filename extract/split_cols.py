import re, json

BASE = "/sessions/compassionate-gallant-hopper/mnt/outputs/extract"
recipes = json.load(open(f"{BASE}/recipes_final.json"))

def split_columns(content):
    lines = content.split('\n')
    # find header line index with INGREDIENTS ... DIRECTIONS to get column_x
    column_x = None
    header_idx = None
    for i, l in enumerate(lines):
        if 'INGREDIENTS' in l.upper() and 'DIRECTIONS' in l.upper():
            m = re.search(r'DIRECTIONS', l.upper())
            column_x = m.start()
            header_idx = i
            break
    ingredients, directions, optional_sides = [], [], []
    section = 'ingredients'
    start = header_idx + 1 if header_idx is not None else 0
    for l in lines[start:]:
        if not l.strip():
            continue
        headU = l.strip().upper()
        if headU.startswith('MAKES'):
            continue
        if 'OPTIONAL SIDE' in headU or 'OPTIONAL TOPPING' in headU or headU.startswith('SPRINKLE OPTIONS'):
            section = 'optional'
            continue
        if headU.startswith('MODIFY AS APPROPRIATE'):
            continue
        if column_x is not None:
            lead = len(l) - len(l.lstrip(' '))
            if lead >= column_x - 3:
                # entirely right column (directions/notes continuation)
                txt = l.strip()
                if txt:
                    directions.append(txt)
                continue
            # left column starts before column_x; split at column_x if line is long enough
            if len(l) > column_x:
                left = l[:column_x].strip()
                right = l[column_x:].strip()
            else:
                left = l.strip()
                right = ''
            if left:
                (ingredients if section == 'ingredients' else optional_sides).append(left)
            if right:
                directions.append(right)
        else:
            # no header found (unusual) - fallback whitespace split
            parts = re.split(r'\s{2,}', l.strip())
            if parts and parts[0]:
                (ingredients if section == 'ingredients' else optional_sides).append(parts[0])
            if len(parts) > 1 and parts[1]:
                directions.append(parts[1])
    return ingredients, directions, optional_sides

sample = None
for r in recipes:
    ing, dirs, opt = split_columns(r['content'])
    r['ingredients'] = ing
    r['directions'] = dirs
    r['optional_sides'] = opt
    if r['title'] == 'Barbecue Chicken Salad':
        sample = r

print(json.dumps(sample, indent=1, ensure_ascii=False))

with open(f"{BASE}/recipes_final2.json", "w") as f:
    json.dump(recipes, f, indent=1, ensure_ascii=False)
