import json

BASE = "/sessions/compassionate-gallant-hopper/mnt/outputs/extract"
with open(f"{BASE}/recipes_slim.json", encoding="utf-8") as f:
    recipes_json = f.read()

html = """<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>
:root { color-scheme: light; }
* { box-sizing: border-box; }
body {
  margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background: #faf8f5; color: #2b2420;
}
.wrap { max-width: 1100px; margin: 0 auto; padding: 20px 20px 60px; }
h1 { font-size: 22px; margin: 0 0 4px; }
.sub { color: #7a6f63; font-size: 13px; margin-bottom: 18px; }
.tabs { display: flex; gap: 8px; margin-bottom: 18px; border-bottom: 1px solid #e6ddd2; }
.tab {
  padding: 10px 16px; cursor: pointer; font-size: 14px; font-weight: 600; color: #8a7e70;
  border-bottom: 2px solid transparent;
}
.tab.active { color: #b2542e; border-bottom-color: #b2542e; }
.panel { display: none; }
.panel.active { display: block; }
.card {
  background: #fff; border: 1px solid #ece3d6; border-radius: 12px; padding: 14px 16px; margin-bottom: 10px;
}
.controls { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
input[type=text], select {
  padding: 8px 10px; border: 1px solid #ddd2c2; border-radius: 8px; font-size: 13px; background: #fff;
}
input[type=text] { flex: 1; min-width: 180px; }
button {
  padding: 8px 14px; border-radius: 8px; border: 1px solid #b2542e; background: #b2542e; color: #fff;
  font-size: 13px; cursor: pointer; font-weight: 600;
}
button.secondary { background: #fff; color: #b2542e; }
button.ghost { background: transparent; color: #8a7e70; border-color: #ddd2c2; }
.recipe-title { font-size: 15px; font-weight: 700; margin: 0 0 2px; }
.meta { font-size: 12px; color: #8a7e70; margin-bottom: 8px; }
.meta span { display: inline-block; margin-right: 10px; }
.tag {
  display: inline-block; font-size: 11px; padding: 2px 8px; border-radius: 100px; margin-right: 4px;
  background: #f1e9dc; color: #7a5c2e;
}
.tag.hazard { background: #fbe4dc; color: #a3401c; }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 8px; }
.grid h4 { font-size: 12px; text-transform: uppercase; letter-spacing: .04em; color: #8a7e70; margin: 0 0 6px; }
.grid ul { margin: 0; padding-left: 18px; font-size: 13px; line-height: 1.5; }
.grid ol { margin: 0; padding-left: 18px; font-size: 13px; line-height: 1.5; }
.actions { margin-top: 10px; display: flex; gap: 8px; }
.day-box {
  border: 1px solid #ece3d6; border-radius: 12px; padding: 14px; margin-bottom: 12px; background: #fff;
}
.day-box h3 { margin: 0 0 10px; font-size: 15px; }
.meal-slot { display: flex; align-items: center; justify-content: space-between; padding: 6px 0; border-top: 1px solid #f1e9dc; }
.meal-slot:first-of-type { border-top: none; }
.meal-label { font-size: 11px; text-transform: uppercase; color: #8a7e70; width: 90px; flex-shrink: 0; }
.meal-name { font-size: 14px; flex: 1; }
.empty { color: #b7ab9c; font-style: italic; font-size: 13px; padding: 20px; text-align: center; }
.small { font-size: 12px; color: #8a7e70; }
.count-pill {
  display: inline-block; background: #f1e9dc; color: #7a5c2e; border-radius: 100px; padding: 1px 8px; font-size: 11px; margin-left: 6px;
}
.shop-item { display: flex; align-items: center; gap: 8px; padding: 4px 0; font-size: 13px; }
.shop-item input { width: 16px; height: 16px; }
.shop-item.checked label { text-decoration: line-through; color: #b7ab9c; }
.info-box { background: #fdf6ec; border: 1px solid #f0dfc0; border-radius: 10px; padding: 12px 14px; font-size: 13px; margin-bottom: 16px; line-height: 1.5; }
.footer-note { margin-top: 24px; font-size: 12px; color: #a89d8e; line-height: 1.6; }
</style>
</head>
<body>
<div class="wrap">
  <h1>Recipe Collector and Meal Planner</h1>
  <div class="sub">Built from Kids Eat in Color: Everyday Lunches, Everyday Snacks & Real Easy Weekdays &middot; <span id="recipeCount"></span> recipes</div>

  <div class="tabs">
    <div class="tab active" data-tab="today">Today's Picks</div>
    <div class="tab" data-tab="browse">Browse & Search</div>
    <div class="tab" data-tab="plan">My Plan</div>
    <div class="tab" data-tab="shop">Shopping List</div>
  </div>

  <div class="panel active" id="panel-today">
    <div class="info-box">Suggestions rotate automatically by date so you get variety. Hit "Shuffle" for different picks, or "Add to Plan" to save one for the shopping list.</div>
    <div class="controls">
      <button id="shuffleBtn">Shuffle suggestions</button>
      <button class="secondary" id="planAllBtn">Add all to plan</button>
    </div>
    <div id="todayList"></div>
  </div>

  <div class="panel" id="panel-browse">
    <div class="controls">
      <input type="text" id="searchBox" placeholder="Search recipes or ingredients (e.g. 'chicken', 'no-bake')...">
      <select id="mealFilter">
        <option value="">All meal types</option>
        <option value="breakfast">Breakfast</option>
        <option value="lunch">Lunch</option>
        <option value="snack">Snack</option>
        <option value="dinner">Dinner</option>
      </select>
      <select id="sourceFilter">
        <option value="">All books</option>
        <option value="Everyday Lunches">Everyday Lunches</option>
        <option value="Everyday Snacks">Everyday Snacks</option>
        <option value="Real Easy Weekdays">Real Easy Weekdays</option>
      </select>
      <select id="hazardFilter">
        <option value="">Show all</option>
        <option value="safe">Hide choking-hazard flagged</option>
        <option value="flagged">Only flagged (review prep)</option>
      </select>
    </div>
    <div class="small" id="resultCount" style="margin-bottom:10px;"></div>
    <div id="browseList"></div>
  </div>

  <div class="panel" id="panel-plan">
    <div class="controls">
      <button class="ghost" id="clearPlanBtn">Clear plan</button>
    </div>
    <div id="planList"></div>
  </div>

  <div class="panel" id="panel-shop">
    <div class="controls">
      <button id="genShopBtn">Generate from My Plan</button>
      <button class="ghost" id="clearShopBtn">Clear list</button>
      <button class="secondary" id="copyShopBtn">Copy to clipboard</button>
    </div>
    <div id="shopList"></div>
  </div>

  <div class="footer-note">
    Choking-hazard flags are a quick keyword scan (whole grapes, hot dogs, nuts, popcorn, hard raw veg, cheese chunks, etc.) based on Kids Eat in Color's own guidance for children under 4 &mdash; always use your judgment for Cami's chewing ability. To add more recipes or cookbooks to this library later, just send the new file over and ask to add it to the planner.
  </div>
</div>

<script>
const RECIPES = __RECIPES_JSON__;
document.getElementById('recipeCount').textContent = RECIPES.length + ' recipes';

const state = {
  plan: JSON.parse(localStorage.getItem('cami_plan') || '[]'),
  shop: JSON.parse(localStorage.getItem('cami_shop') || '[]'),
  todaySeed: 0,
};

function savePlan() { localStorage.setItem('cami_plan', JSON.stringify(state.plan)); renderPlan(); }
function saveShop() { localStorage.setItem('cami_shop', JSON.stringify(state.shop)); }

// tabs
document.querySelectorAll('.tab').forEach(t => {
  t.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(x => x.classList.remove('active'));
    t.classList.add('active');
    document.getElementById('panel-' + t.dataset.tab).classList.add('active');
    if (t.dataset.tab === 'plan') renderPlan();
    if (t.dataset.tab === 'shop') renderShop();
  });
});

function tagChips(r) {
  let chips = `<span class="tag">${r.meal_type}</span><span class="tag">${r.source}</span>`;
  if (r.prep_time) chips += `<span class="tag">Prep: ${r.prep_time}</span>`;
  if (r.cook_time) chips += `<span class="tag">Cook: ${r.cook_time}</span>`;
  if (r.day) chips += `<span class="tag">Day ${r.day}</span>`;
  if (r.choking_flags && r.choking_flags.length) {
    chips += `<span class="tag hazard" title="${r.choking_flags.join(', ')}">check prep: ${r.choking_flags.length} item(s)</span>`;
  }
  return chips;
}

function recipeCard(r, opts) {
  opts = opts || {};
  const inPlan = state.plan.includes(r.id);
  return `<div class="card" data-id="${r.id}">
    <div class="recipe-title">${r.title}</div>
    <div class="meta">${tagChips(r)}</div>
    <div class="grid">
      <div><h4>Ingredients</h4><ul>${r.ingredients.map(i=>`<li>${i}</li>`).join('')}</ul>
        ${r.optional_sides && r.optional_sides.length ? `<h4 style="margin-top:8px;">Optional sides</h4><ul>${r.optional_sides.map(i=>`<li>${i}</li>`).join('')}</ul>` : ''}
      </div>
      <div><h4>Directions</h4><ol>${directionsHtml(r.directions)}</ol></div>
    </div>
    <div class="actions">
      <button class="${inPlan ? 'ghost' : 'secondary'}" onclick="togglePlan(${r.id})">${inPlan ? 'Remove from plan' : 'Add to plan'}</button>
    </div>
  </div>`;
}

function directionsHtml(dirs) {
  // group wrapped continuation lines into steps
  const steps = [];
  let cur = '';
  dirs.forEach(l => {
    if (/^\d+\.\s*/.test(l)) {
      if (cur) steps.push(cur);
      cur = l.replace(/^\d+\.\s*/, '');
    } else {
      cur += ' ' + l;
    }
  });
  if (cur) steps.push(cur);
  return steps.map(s => `<li>${s.trim()}</li>`).join('');
}

function togglePlan(id) {
  const idx = state.plan.indexOf(id);
  if (idx >= 0) state.plan.splice(idx, 1); else state.plan.push(id);
  savePlan();
  renderToday();
  renderBrowse();
}

// ---- Today ----
function dayHash(str) {
  let h = 0;
  for (let i=0;i<str.length;i++) { h = (h*31 + str.charCodeAt(i)) & 0xffffffff; }
  return Math.abs(h);
}
function pickForSlot(mealType, seedOffset) {
  const pool = RECIPES.filter(r => r.meal_type === mealType);
  if (!pool.length) return null;
  const today = new Date().toISOString().slice(0,10);
  const seed = dayHash(today + mealType + seedOffset);
  return pool[seed % pool.length];
}
function renderToday() {
  const slots = ['breakfast','lunch','snack','dinner'];
  document.getElementById('todayList').innerHTML = slots.map(m => {
    const r = pickForSlot(m, state.todaySeed);
    if (!r) return '';
    return recipeCard(r);
  }).join('');
}
document.getElementById('shuffleBtn').addEventListener('click', () => { state.todaySeed++; renderToday(); });
document.getElementById('planAllBtn').addEventListener('click', () => {
  ['breakfast','lunch','snack','dinner'].forEach(m => {
    const r = pickForSlot(m, state.todaySeed);
    if (r && !state.plan.includes(r.id)) state.plan.push(r.id);
  });
  savePlan();
  renderToday();
});

// ---- Browse ----
function renderBrowse() {
  const q = document.getElementById('searchBox').value.toLowerCase().trim();
  const meal = document.getElementById('mealFilter').value;
  const source = document.getElementById('sourceFilter').value;
  const hazard = document.getElementById('hazardFilter').value;
  let list = RECIPES.filter(r => {
    if (meal && r.meal_type !== meal) return false;
    if (source && r.source !== source) return false;
    if (hazard === 'safe' && r.choking_flags.length) return false;
    if (hazard === 'flagged' && !r.choking_flags.length) return false;
    if (q) {
      const hay = (r.title + ' ' + r.ingredients.join(' ')).toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
  document.getElementById('resultCount').textContent = list.length + ' recipe(s)';
  document.getElementById('browseList').innerHTML = list.length
    ? list.map(r => recipeCard(r)).join('')
    : '<div class="empty">No recipes match. Try clearing a filter.</div>';
}
['searchBox','mealFilter','sourceFilter','hazardFilter'].forEach(id => {
  document.getElementById(id).addEventListener('input', renderBrowse);
  document.getElementById(id).addEventListener('change', renderBrowse);
});

// ---- Plan ----
function renderPlan() {
  const items = state.plan.map(id => RECIPES.find(r => r.id === id)).filter(Boolean);
  document.getElementById('planList').innerHTML = items.length
    ? items.map(r => recipeCard(r)).join('')
    : '<div class="empty">No meals in your plan yet. Add some from Today\\'s Picks or Browse & Search.</div>';
}
document.getElementById('clearPlanBtn').addEventListener('click', () => { state.plan = []; savePlan(); });

// ---- Shopping list ----
function renderShop() {
  document.getElementById('shopList').innerHTML = state.shop.length
    ? state.shop.map((item, i) => `<div class="shop-item ${item.checked ? 'checked' : ''}">
        <input type="checkbox" ${item.checked ? 'checked' : ''} onchange="toggleShop(${i})">
        <label>${item.text}</label>
      </div>`).join('')
    : '<div class="empty">No shopping list yet. Add meals to your plan, then hit "Generate from My Plan".</div>';
}
function toggleShop(i) { state.shop[i].checked = !state.shop[i].checked; saveShop(); renderShop(); }
document.getElementById('genShopBtn').addEventListener('click', () => {
  const items = state.plan.map(id => RECIPES.find(r => r.id === id)).filter(Boolean);
  const seen = new Set();
  const combined = [];
  items.forEach(r => {
    r.ingredients.forEach(ing => {
      const key = ing.toLowerCase().replace(/\s+/g,' ').trim();
      if (!seen.has(key)) { seen.add(key); combined.push(ing); }
    });
  });
  state.shop = combined.map(text => ({ text, checked: false }));
  saveShop();
  renderShop();
});
document.getElementById('clearShopBtn').addEventListener('click', () => { state.shop = []; saveShop(); renderShop(); });
document.getElementById('copyShopBtn').addEventListener('click', () => {
  const text = state.shop.map(i => (i.checked ? '[x] ' : '[ ] ') + i.text).join('\\n');
  navigator.clipboard.writeText(text).then(() => alert('Shopping list copied!'));
});

renderToday();
renderBrowse();
renderPlan();
renderShop();
</script>
</body>
</html>
"""

html = html.replace("__RECIPES_JSON__", recipes_json)
with open(f"{BASE}/keic_planner.html", "w", encoding="utf-8") as f:
    f.write(html)
print("written", len(html))
