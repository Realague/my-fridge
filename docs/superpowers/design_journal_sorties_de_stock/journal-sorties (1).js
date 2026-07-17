/* ════════════════════════════════════════════════════════════════
   Fresh — Journal des sorties (historique consommé / jeté / retiré)
   ════════════════════════════════════════════════════════════════ */

const ICONS = () => window.lucide && lucide.createIcons({ attrs: { 'stroke-width': 1.9 } });

const ACTIONS = {
  consumed: { label: 'Consommé', icon: 'utensils',  cls: 'consumed' },
  wasted:   { label: 'Jeté',     icon: 'trash-2',   cls: 'wasted' },
  removed:  { label: 'Retiré',   icon: 'package-x', cls: 'removed' },
};

const MEMBERS = {
  vous:  { name: 'Julien',  short: 'vous', initials: 'JD', color: 'var(--ink)',      fg: 'var(--bg)' },
  sarah: { name: 'Sarah',   short: 'Sarah', initials: 'S', color: 'var(--purple-soft)', fg: '#5a44ad' },
  lea:   { name: 'Léa',     short: 'Léa',  initials: 'L', color: 'var(--orange-soft)', fg: '#a4451a' },
};

/* ── Month totals (feeds the anti-gaspi stats) ───────────────── */
const MONTH = { consumed: 41, wasted: 6, removed: 4 };

/* ── Journal, grouped by day (most recent first) ─────────────── */
const DAYS = [
  {
    label: "Aujourd'hui", date: 'mercredi 2 juillet',
    entries: [
      { name: 'Yaourts nature', icon: 'milk', color: '#3a72d9', thumb: 'var(--blue-soft)', cat: 'Produits laitiers', catCls: 'blue', catIcon: 'milk', qty: 2, unit: 'yaourts', action: 'consumed', user: 'vous', time: '13:20', storage: 'Réfrigérateur', storeIcon: 'refrigerator' },
      { name: 'Bananes', icon: 'banana', color: '#b88a14', thumb: 'var(--yellow-soft)', cat: 'Fruits & légumes', catCls: 'green', catIcon: 'apple', qty: 2, unit: 'bananes', action: 'consumed', user: 'vous', time: '12:05', storage: 'Réfrigérateur', storeIcon: 'refrigerator', note: 'Smoothie' },
      { name: 'Salade en sachet', icon: 'salad', color: '#1f9c5e', thumb: 'var(--green-soft)', cat: 'Fruits & légumes', catCls: 'green', catIcon: 'salad', qty: 1, unit: 'sachet', action: 'wasted', user: 'sarah', time: '11:40', storage: 'Réfrigérateur', storeIcon: 'refrigerator', note: 'Flétrie' },
    ],
  },
  {
    label: 'Hier', date: 'mardi 1 juillet',
    entries: [
      { name: 'Curry de légumes maison', icon: 'cooking-pot', color: '#d65a1f', thumb: 'var(--orange-soft)', cat: 'Plats cuisinés', catCls: 'purple', catIcon: 'utensils-crossed', qty: 1, unit: 'portion', action: 'consumed', user: 'sarah', time: '20:15', storage: 'Réfrigérateur', storeIcon: 'refrigerator' },
      { name: 'Lait demi-écrémé', icon: 'milk', color: '#3a72d9', thumb: 'var(--blue-soft)', cat: 'Produits laitiers', catCls: 'blue', catIcon: 'milk', qty: 1, unit: 'bouteille', action: 'removed', user: 'vous', time: '18:30', storage: 'Réfrigérateur', storeIcon: 'refrigerator', note: 'Donné à un voisin' },
      { name: 'Pain de mie', icon: 'wheat', color: '#b88a14', thumb: 'var(--yellow-soft)', cat: 'Boulangerie', catCls: 'orange', catIcon: 'wheat', qty: 4, unit: 'tranches', action: 'wasted', user: 'lea', time: '09:10', storage: 'Garde-manger', storeIcon: 'archive', note: 'Moisi' },
      { name: 'Œufs', icon: 'egg', color: '#c98a1f', thumb: 'var(--yellow-soft)', cat: 'Produits frais', catCls: 'yellow', catIcon: 'egg', qty: 3, unit: 'œufs', action: 'consumed', user: 'vous', time: '08:00', storage: 'Réfrigérateur', storeIcon: 'refrigerator' },
    ],
  },
  {
    label: 'Lundi', date: '30 juin',
    entries: [
      { name: 'Filet de poulet', icon: 'drumstick', color: '#c65a5a', thumb: 'var(--red-soft)', cat: 'Viande', catCls: 'red', catIcon: 'drumstick', qty: 2, unit: 'filets', action: 'consumed', user: 'sarah', time: '20:40', storage: 'Réfrigérateur', storeIcon: 'refrigerator' },
      { name: 'Houmous', icon: 'soup', color: '#1f9c5e', thumb: 'var(--green-soft)', cat: 'Apéritif', catCls: 'green', catIcon: 'salad', qty: 1, unit: 'pot', action: 'consumed', user: 'vous', time: '19:20', storage: 'Réfrigérateur', storeIcon: 'refrigerator' },
      { name: 'Fromage râpé', icon: 'milk', color: '#3a72d9', thumb: 'var(--blue-soft)', cat: 'Produits laitiers', catCls: 'blue', catIcon: 'milk', qty: 1, unit: 'sachet', action: 'wasted', user: 'sarah', time: '14:15', storage: 'Réfrigérateur', storeIcon: 'refrigerator', note: 'Périmé' },
      { name: "Jus d'orange", icon: 'cup-soda', color: '#d65a1f', thumb: 'var(--orange-soft)', cat: 'Boissons', catCls: 'orange', catIcon: 'cup-soda', qty: 1, unit: 'bouteille', action: 'removed', user: 'vous', time: '10:05', storage: 'Réfrigérateur', storeIcon: 'refrigerator', note: 'Erreur de saisie' },
    ],
  },
  {
    label: 'Dimanche', date: '29 juin',
    entries: [
      { name: 'Tomates cerises', icon: 'apple', color: '#c65a5a', thumb: 'var(--red-soft)', cat: 'Fruits & légumes', catCls: 'green', catIcon: 'apple', qty: 1, unit: 'barquette', action: 'consumed', user: 'lea', time: '19:30', storage: 'Réfrigérateur', storeIcon: 'refrigerator' },
      { name: 'Saumon fumé', icon: 'fish', color: '#c56f8f', thumb: 'var(--pink-soft)', cat: 'Poissonnerie', catCls: 'pink', catIcon: 'fish', qty: 1, unit: 'paquet', action: 'consumed', user: 'sarah', time: '12:40', storage: 'Réfrigérateur', storeIcon: 'refrigerator' },
      { name: 'Yaourts nature', icon: 'milk', color: '#3a72d9', thumb: 'var(--blue-soft)', cat: 'Produits laitiers', catCls: 'blue', catIcon: 'milk', qty: 2, unit: 'yaourts', action: 'consumed', user: 'vous', time: '08:30', storage: 'Réfrigérateur', storeIcon: 'refrigerator' },
    ],
  },
];

const fmtQty = q => Number.isInteger(q) ? q : q.toString().replace('.', ',');

let filter = 'all';

/* ── counts ──────────────────────────────────────────────────── */
function allEntries() { return DAYS.flatMap(d => d.entries); }
function counts() {
  const c = { all: 0, consumed: 0, wasted: 0, removed: 0 };
  allEntries().forEach(e => { c.all++; c[e.action]++; });
  return c;
}

/* ── render: stats strip ─────────────────────────────────────── */
function renderStats() {
  const foodExits = MONTH.consumed + MONTH.wasted;
  const rate = Math.round((MONTH.consumed / foodExits) * 100);
  const consumedPct = (MONTH.consumed / foodExits) * 100;

  document.getElementById('stats').innerHTML = `
    <div class="stat">
      <div class="stat-ic consumed"><i data-lucide="utensils" class="lic"></i></div>
      <div class="stat-n">${MONTH.consumed}</div>
      <div class="stat-l">Consommés</div>
      <div class="stat-d up"><i data-lucide="trending-up" class="lic"></i> +8 vs mai</div>
    </div>
    <div class="stat">
      <div class="stat-ic wasted"><i data-lucide="trash-2" class="lic"></i></div>
      <div class="stat-n">${MONTH.wasted}</div>
      <div class="stat-l">Jetés</div>
      <div class="stat-d down"><i data-lucide="trending-down" class="lic"></i> −3 vs mai</div>
    </div>
    <div class="stat">
      <div class="stat-ic removed"><i data-lucide="package-x" class="lic"></i></div>
      <div class="stat-n">${MONTH.removed}</div>
      <div class="stat-l">Retirés</div>
      <div class="stat-d muted">Sortie neutre</div>
    </div>
    <div class="stat antigaspi">
      <div class="ag-top">
        <div>
          <div class="stat-l" style="color:var(--green-deep)">Taux anti-gaspi</div>
          <div class="ag-rate">${rate}<span>%</span></div>
        </div>
        <div class="ag-badge"><i data-lucide="leaf" class="lic"></i></div>
      </div>
      <div class="ag-bar"><span style="width:${consumedPct}%"></span></div>
      <div class="ag-legend">
        <span><i class="dot g"></i> ${MONTH.consumed} consommés</span>
        <span><i class="dot r"></i> ${MONTH.wasted} jetés</span>
      </div>
    </div>`;
}

/* ── render: filter pills ────────────────────────────────────── */
function renderFilters() {
  const c = counts();
  const defs = [
    { k: 'all', label: 'Tout' },
    { k: 'consumed', label: 'Consommé' },
    { k: 'wasted', label: 'Jeté' },
    { k: 'removed', label: 'Retiré' },
  ];
  document.getElementById('actionFilters').innerHTML = defs.map(d => `
    <button class="fpill ${d.k} ${filter === d.k ? 'active' : ''}" data-filter="${d.k}">
      ${d.k !== 'all' ? `<i data-lucide="${ACTIONS[d.k].icon}" class="lic"></i>` : ''}
      ${d.label}<span class="ct">${c[d.k]}</span>
    </button>`).join('');
  ICONS();
  document.querySelectorAll('[data-filter]').forEach(b => {
    b.onclick = () => { filter = b.dataset.filter; renderFilters(); renderLog(); };
  });
}

/* ── render: log timeline ────────────────────────────────────── */
function entryHTML(e) {
  const A = ACTIONS[e.action];
  const m = MEMBERS[e.user];
  const note = e.note ? `<span class="note"><i data-lucide="corner-down-right" class="lic"></i>${e.note}</span>` : '';
  return `
  <div class="entry ${e.action}">
    <div class="e-thumb" style="background:${e.thumb}"><i data-lucide="${e.icon}" class="lic" style="color:${e.color}"></i></div>
    <div class="e-body">
      <div class="e-name">${e.name}</div>
      <div class="e-meta">
        <span class="chip badge-soft-${e.catCls}"><i data-lucide="${e.catIcon}" class="lic"></i> ${e.cat}</span>
        <span class="e-store"><i data-lucide="${e.storeIcon}" class="lic"></i> ${e.storage}</span>
        ${note}
      </div>
    </div>
    <div class="e-action">
      <span class="act-badge ${A.cls}"><i data-lucide="${A.icon}" class="lic"></i> ${A.label}</span>
    </div>
    <div class="e-qty">${fmtQty(e.qty)} <span>${e.unit}</span></div>
    <div class="e-who">
      <div class="e-user"><span class="ava" style="background:${m.color};color:${m.fg}">${m.initials}</span>${m.name}</div>
      <div class="e-time"><i data-lucide="clock" class="lic"></i> ${e.time}</div>
    </div>
  </div>`;
}

function renderLog() {
  const wrap = document.getElementById('log');
  let html = '';
  let shown = 0;
  DAYS.forEach(day => {
    const es = day.entries.filter(e => filter === 'all' || e.action === filter);
    if (!es.length) return;
    shown += es.length;
    const cons = es.filter(e => e.action === 'consumed').length;
    const wst = es.filter(e => e.action === 'wasted').length;
    const bits = [];
    if (cons) bits.push(`${cons} consommé${cons > 1 ? 's' : ''}`);
    if (wst) bits.push(`${wst} jeté${wst > 1 ? 's' : ''}`);
    html += `
      <div class="day-head">
        <span class="d-lbl">${day.label}</span>
        <span class="d-date">${day.date}</span>
        <span class="d-sum">${es.length} sortie${es.length > 1 ? 's' : ''}${bits.length ? ' · ' + bits.join(' · ') : ''}</span>
      </div>
      ${es.map(entryHTML).join('')}`;
  });
  if (!shown) {
    html = `<div class="empty"><i data-lucide="inbox" class="lic"></i><div>Aucune sortie ${filter !== 'all' ? 'de ce type ' : ''}sur la période.</div></div>`;
  }
  wrap.innerHTML = html;
  document.getElementById('pgSub').textContent = `${counts().all} sorties · juin–juillet · Maison Dubois`;
  ICONS();
}

/* ── init ────────────────────────────────────────────────────── */
renderStats();
renderFilters();
renderLog();
ICONS();
