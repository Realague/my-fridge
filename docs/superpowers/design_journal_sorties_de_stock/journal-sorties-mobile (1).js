/* ════════════════════════════════════════════════════════════════
   Fresh — Journal des sorties · MOBILE
   ════════════════════════════════════════════════════════════════ */

const ICONS = () => window.lucide && lucide.createIcons({ attrs: { 'stroke-width': 1.9 } });

const ACTIONS = {
  consumed: { label: 'Consommé', icon: 'utensils',  cls: 'consumed' },
  wasted:   { label: 'Jeté',     icon: 'trash-2',   cls: 'wasted' },
  removed:  { label: 'Retiré',   icon: 'package-x', cls: 'removed' },
};
const MEMBERS = {
  vous:  { name: 'Julien', initials: 'JD', color: 'var(--ink)',        fg: 'var(--bg)' },
  sarah: { name: 'Sarah',  initials: 'S',  color: 'var(--purple-soft)', fg: '#5a44ad' },
  lea:   { name: 'Léa',    initials: 'L',  color: 'var(--yellow-soft)', fg: '#8a6500' },
};
const MONTH = { consumed: 41, wasted: 6, removed: 4 };

const DAYS = [
  {
    label: "Aujourd'hui", date: 'mer. 2 juil.',
    entries: [
      { name: 'Yaourts nature', icon: 'milk', color: '#3a72d9', thumb: 'var(--blue-soft)', cat: 'Laitiers', catCls: 'blue', catIcon: 'milk', qty: 2, unit: 'yaourts', action: 'consumed', user: 'vous', time: '13:20', storage: 'Frigo' },
      { name: 'Bananes', icon: 'banana', color: '#b88a14', thumb: 'var(--yellow-soft)', cat: 'Fruits & lég.', catCls: 'green', catIcon: 'apple', qty: 2, unit: 'bananes', action: 'consumed', user: 'vous', time: '12:05', storage: 'Frigo', note: 'Smoothie' },
      { name: 'Salade en sachet', icon: 'salad', color: '#1f9c5e', thumb: 'var(--green-soft)', cat: 'Fruits & lég.', catCls: 'green', catIcon: 'salad', qty: 1, unit: 'sachet', action: 'wasted', user: 'sarah', time: '11:40', storage: 'Frigo', note: 'Flétrie' },
    ],
  },
  {
    label: 'Hier', date: 'mar. 1 juil.',
    entries: [
      { name: 'Curry de légumes maison', icon: 'cooking-pot', color: '#d65a1f', thumb: 'var(--orange-soft)', cat: 'Plats cuisinés', catCls: 'purple', catIcon: 'utensils-crossed', qty: 1, unit: 'portion', action: 'consumed', user: 'sarah', time: '20:15', storage: 'Frigo' },
      { name: 'Lait demi-écrémé', icon: 'milk', color: '#3a72d9', thumb: 'var(--blue-soft)', cat: 'Laitiers', catCls: 'blue', catIcon: 'milk', qty: 1, unit: 'bouteille', action: 'removed', user: 'vous', time: '18:30', storage: 'Frigo', note: 'Donné à un voisin' },
      { name: 'Pain de mie', icon: 'wheat', color: '#b88a14', thumb: 'var(--yellow-soft)', cat: 'Boulangerie', catCls: 'orange', catIcon: 'wheat', qty: 4, unit: 'tranches', action: 'wasted', user: 'lea', time: '09:10', storage: 'Garde-manger', note: 'Moisi' },
      { name: 'Œufs', icon: 'egg', color: '#c98a1f', thumb: 'var(--yellow-soft)', cat: 'Produits frais', catCls: 'yellow', catIcon: 'egg', qty: 3, unit: 'œufs', action: 'consumed', user: 'vous', time: '08:00', storage: 'Frigo' },
    ],
  },
  {
    label: 'Lundi', date: '30 juin',
    entries: [
      { name: 'Filet de poulet', icon: 'drumstick', color: '#c65a5a', thumb: 'var(--red-soft)', cat: 'Viande', catCls: 'red', catIcon: 'drumstick', qty: 2, unit: 'filets', action: 'consumed', user: 'sarah', time: '20:40', storage: 'Frigo' },
      { name: 'Houmous', icon: 'soup', color: '#1f9c5e', thumb: 'var(--green-soft)', cat: 'Apéritif', catCls: 'green', catIcon: 'salad', qty: 1, unit: 'pot', action: 'consumed', user: 'vous', time: '19:20', storage: 'Frigo' },
      { name: 'Fromage râpé', icon: 'milk', color: '#3a72d9', thumb: 'var(--blue-soft)', cat: 'Laitiers', catCls: 'blue', catIcon: 'milk', qty: 1, unit: 'sachet', action: 'wasted', user: 'sarah', time: '14:15', storage: 'Frigo', note: 'Périmé' },
      { name: "Jus d'orange", icon: 'cup-soda', color: '#d65a1f', thumb: 'var(--orange-soft)', cat: 'Boissons', catCls: 'orange', catIcon: 'cup-soda', qty: 1, unit: 'bouteille', action: 'removed', user: 'vous', time: '10:05', storage: 'Frigo', note: 'Erreur de saisie' },
    ],
  },
  {
    label: 'Dimanche', date: '29 juin',
    entries: [
      { name: 'Tomates cerises', icon: 'apple', color: '#c65a5a', thumb: 'var(--red-soft)', cat: 'Fruits & lég.', catCls: 'green', catIcon: 'apple', qty: 1, unit: 'barquette', action: 'consumed', user: 'lea', time: '19:30', storage: 'Frigo' },
      { name: 'Saumon fumé', icon: 'fish', color: '#c56f8f', thumb: 'var(--pink-soft)', cat: 'Poissonnerie', catCls: 'pink', catIcon: 'fish', qty: 1, unit: 'paquet', action: 'consumed', user: 'sarah', time: '12:40', storage: 'Frigo' },
      { name: 'Yaourts nature', icon: 'milk', color: '#3a72d9', thumb: 'var(--blue-soft)', cat: 'Laitiers', catCls: 'blue', catIcon: 'milk', qty: 2, unit: 'yaourts', action: 'consumed', user: 'vous', time: '08:30', storage: 'Frigo' },
    ],
  },
];

const fmtQty = q => Number.isInteger(q) ? q : q.toString().replace('.', ',');
let filter = 'all';

function allEntries() { return DAYS.flatMap(d => d.entries); }
function counts() {
  const c = { all: 0, consumed: 0, wasted: 0, removed: 0 };
  allEntries().forEach(e => { c.all++; c[e.action]++; });
  return c;
}

/* ── anti-gaspi hero ─────────────────────────────────────────── */
function renderHero() {
  const food = MONTH.consumed + MONTH.wasted;
  const rate = Math.round((MONTH.consumed / food) * 100);
  const pct = (MONTH.consumed / food) * 100;
  document.getElementById('hero').innerHTML = `
    <div class="ag-card">
      <div class="ag-head">
        <div class="ag-lbl">Taux anti-gaspi · ce mois-ci</div>
        <div class="ag-leaf"><i data-lucide="leaf" class="lic"></i></div>
      </div>
      <div class="ag-rate">${rate}<span>%</span></div>
      <div class="ag-bar"><span style="width:${pct}%"></span></div>
      <div class="ag-legend"><span><i class="dot g"></i>${MONTH.consumed} consommés</span><span><i class="dot r"></i>${MONTH.wasted} jetés</span></div>
    </div>
    <div class="mini-stats">
      <div class="ms consumed"><i data-lucide="utensils" class="lic"></i><div><b>${MONTH.consumed}</b><span>Consommés</span></div></div>
      <div class="ms wasted"><i data-lucide="trash-2" class="lic"></i><div><b>${MONTH.wasted}</b><span>Jetés</span></div></div>
      <div class="ms removed"><i data-lucide="package-x" class="lic"></i><div><b>${MONTH.removed}</b><span>Retirés</span></div></div>
    </div>`;
}

/* ── filter chips ────────────────────────────────────────────── */
function renderChips() {
  const c = counts();
  const defs = [
    { k: 'all', label: 'Tout' },
    { k: 'consumed', label: 'Consommé' },
    { k: 'wasted', label: 'Jeté' },
    { k: 'removed', label: 'Retiré' },
  ];
  document.getElementById('chips').innerHTML = defs.map(d => `
    <button class="chip-f ${d.k} ${filter === d.k ? 'active' : ''}" data-filter="${d.k}">
      ${d.k !== 'all' ? `<i data-lucide="${ACTIONS[d.k].icon}" class="lic"></i>` : ''}${d.label}<span class="ct">${c[d.k]}</span>
    </button>`).join('');
  ICONS();
  document.querySelectorAll('[data-filter]').forEach(b => {
    b.onclick = () => { filter = b.dataset.filter; renderChips(); renderLog(); };
  });
}

/* ── log ─────────────────────────────────────────────────────── */
function entryHTML(e) {
  const A = ACTIONS[e.action], m = MEMBERS[e.user];
  const note = e.note ? ` · <span class="jm-note">${e.note}</span>` : '';
  return `
  <div class="jm-entry ${e.action}">
    <div class="jm-thumb" style="background:${e.thumb}"><i data-lucide="${e.icon}" class="lic" style="color:${e.color}"></i></div>
    <div class="jm-mid">
      <div class="jm-name">${e.name}</div>
      <div class="jm-sub">
        <span class="act-badge ${A.cls}"><i data-lucide="${A.icon}" class="lic"></i> ${A.label}</span>
        <span class="jm-qty">${fmtQty(e.qty)} ${e.unit}</span>
      </div>
      <div class="jm-foot"><span class="ava" style="background:${m.color};color:${m.fg}">${m.initials}</span>${m.name} · ${e.storage}${note}</div>
    </div>
    <div class="jm-time">${e.time}</div>
  </div>`;
}

function renderLog() {
  let html = '', shown = 0;
  DAYS.forEach(day => {
    const es = day.entries.filter(e => filter === 'all' || e.action === filter);
    if (!es.length) return;
    shown += es.length;
    html += `
      <div class="jm-day">
        <span class="dl">${day.label}</span><span class="dd">${day.date}</span>
        <span class="dc">${es.length} sortie${es.length > 1 ? 's' : ''}</span>
      </div>
      ${es.map(entryHTML).join('')}`;
  });
  if (!shown) html = `<div class="jm-empty"><i data-lucide="inbox" class="lic"></i>Aucune sortie de ce type.</div>`;
  document.getElementById('log').innerHTML = html;
  document.getElementById('navSub').textContent = `${counts().all} sorties · ce mois-ci`;
  ICONS();
}

/* ── theme toggle ────────────────────────────────────────────── */
(function () {
  const root = document.documentElement;
  const btn = document.getElementById('themeToggle');
  const lbl = document.getElementById('themeLbl');
  const apply = (dark) => {
    root.setAttribute('data-theme', dark ? 'dark' : 'light');
    if (btn) btn.querySelector('[data-lucide]').setAttribute('data-lucide', dark ? 'sun' : 'moon');
    if (lbl) lbl.textContent = dark ? 'Clair' : 'Sombre';
    ICONS();
  };
  let dark = false;
  try { dark = localStorage.getItem('fresh-journal-theme') === 'dark'; } catch (e) {}
  apply(dark);
  if (btn) btn.addEventListener('click', () => {
    dark = root.getAttribute('data-theme') !== 'dark';
    apply(dark);
    try { localStorage.setItem('fresh-journal-theme', dark ? 'dark' : 'light'); } catch (e) {}
  });
})();

renderHero();
renderChips();
renderLog();
ICONS();
