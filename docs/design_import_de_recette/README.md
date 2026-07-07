/* Fresh — Import de recette (prototype interactif — desktop) */
(function () {
  "use strict";

  const MARMITON_URL = "https://www.marmiton.org/recettes/recette_poulet-au-curry-et-lait-de-coco_18569.aspx";

  const CATALOG = [
    { name: "Blanc de poulet", icon: "beef" }, { name: "Poulet entier", icon: "beef" }, { name: "Cuisse de poulet", icon: "beef" },
    { name: "Oignon", icon: "salad" }, { name: "Oignon rouge", icon: "salad" }, { name: "Échalote", icon: "salad" }, { name: "Ail", icon: "salad" },
    { name: "Gingembre", icon: "flame" }, { name: "Curry", icon: "flame" }, { name: "Curcuma", icon: "flame" }, { name: "Paprika", icon: "flame" },
    { name: "Riz", icon: "wheat" }, { name: "Riz basmati", icon: "wheat" }, { name: "Riz thaï", icon: "wheat" }, { name: "Pâtes", icon: "wheat" },
    { name: "Huile d'olive", icon: "droplet" }, { name: "Huile de tournesol", icon: "droplet" },
    { name: "Sel", icon: "soup" }, { name: "Poivre", icon: "soup" },
    { name: "Crème de coco", icon: "milk" }, { name: "Lait", icon: "milk" }, { name: "Crème fraîche", icon: "milk" },
    { name: "Tomate", icon: "salad" }, { name: "Carotte", icon: "carrot" }, { name: "Coriandre", icon: "salad" }
  ];
  const iconFor = (name) => (CATALOG.find((c) => c.name === name) || {}).icon || "package";
  const UNITS = ["pièces", "g", "kg", "ml", "cl", "L", "c. à café", "c. à soupe", "gousses", "tranches"];
  const EYE_LABELS = ["filet", "pincée", "à l'œil"];
  const UNIT_SHORT = { "pièces": "pc", "c. à soupe": "c.à.s", "c. à café": "c.à.c", "gousses": "gou.", "tranches": "tr." };
  function qtyShort(it) { if (it.eye) return it.eyeLabel || "à l'œil"; const u = UNIT_SHORT[it.unit] || it.unit || ""; return [it.qty, u].filter(Boolean).join(" "); }

  const state = {
    screen: "url",
    theme: localStorage.getItem("fresh-import-theme") || "light",
    url: "",
    title: "Poulet au curry et lait de coco",
    desc: "Un classique express : des morceaux de poulet mijotés dans une sauce onctueuse au curry et au lait de coco, servis avec du riz basmati.",
    prep: "20", cook: "30", serv: "4", diff: "Facile",
    tags: [
      { label: "Plat principal", cls: "green", icon: "utensils-crossed" },
      { label: "Asiatique", cls: "blue", icon: "globe" },
      { label: "Sans gluten", cls: "purple", icon: "wheat-off" }
    ],
    ings: [], steps: [], sheetId: null, editing: null, openStepMenu: null
  };

  function seed() {
    state.ings = [
      { id: 1, brut: "4 blancs de poulet", art: "Blanc de poulet", qty: "4", unit: "pièces", eye: false, eyeLabel: "", conf: "ok" },
      { id: 2, brut: "400 ml de lait de coco", art: null, qty: "400", unit: "ml", eye: false, eyeLabel: "", conf: "danger" },
      { id: 3, brut: "2 oignons", art: "Oignon", qty: "2", unit: "pièces", eye: false, eyeLabel: "", conf: "ok" },
      { id: 4, brut: "2 gousses d'ail", art: "Ail", qty: "2", unit: "gousses", eye: false, eyeLabel: "", conf: "ok" },
      { id: 5, brut: "1 c. à soupe de curry en poudre", art: "Curry", qty: "1", unit: "c. à soupe", eye: false, eyeLabel: "", conf: "warn", hint: "« curry en poudre » → « Curry » ?" },
      { id: 6, brut: "200 g de riz basmati", art: "Riz", qty: "200", unit: "g", eye: false, eyeLabel: "", conf: "warn", hint: "la recette précise « basmati »" },
      { id: 7, brut: "1 filet d'huile d'olive", art: "Huile d'olive", qty: "", unit: "", eye: true, eyeLabel: "filet", conf: "ok" },
      { id: 8, brut: "sel, poivre", art: "Sel · Poivre", qty: "", unit: "", eye: true, eyeLabel: "à l'œil", conf: "ok" }
    ];
    state.steps = [
      { id: 1, t: "Découper les blancs de poulet en morceaux et émincer les oignons et l'ail.", d: "5 min", ings: [1, 3, 4] },
      { id: 2, t: "Faire revenir le poulet dans un filet d'huile d'olive jusqu'à ce qu'il soit doré.", d: "6 min", ings: [1, 7] },
      { id: 3, t: "Ajouter les oignons et l'ail, faire suer quelques minutes.", d: "4 min", ings: [3, 4] },
      { id: 4, t: "Saupoudrer de curry, verser le lait de coco, saler et poivrer.", d: "2 min", ings: [5, 2, 8] },
      { id: 5, t: "Laisser mijoter 20 minutes à feu doux. Servir avec le riz basmati.", d: "20 min", ings: [6] }
    ];
  }

  const content = document.getElementById("content");
  const modalWrap = document.getElementById("modalWrap");
  const modal = document.getElementById("modal");
  const crumb = document.getElementById("crumb");
  const esc = (s) => (s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  function icons() { if (window.lucide) lucide.createIcons(); }
  function counts() { const c = { ok: 0, warn: 0, danger: 0 }; state.ings.forEach((i) => c[i.conf]++); return c; }
  function hostOf(u) { try { const x = new URL(u); return x.host.replace(/^www\./, "") + x.pathname.replace(/\/$/, "").slice(0, 30); } catch (e) { return u ? u.replace(/^https?:\/\//, "").slice(0, 40) : ""; } }

  function toast(msg) {
    const t = document.getElementById("toast");
    document.getElementById("toastMsg").textContent = msg;
    t.classList.add("show"); clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove("show"), 2400);
  }

  const CRUMB = {
    url: 'Recettes <i data-lucide="chevron-right" class="lic"></i> <b>Importer</b>',
    loading: 'Recettes <i data-lucide="chevron-right" class="lic"></i> Importer <i data-lucide="chevron-right" class="lic"></i> <b>Lecture…</b>',
    error: 'Recettes <i data-lucide="chevron-right" class="lic"></i> <b>Importer</b>',
    review: 'Recettes <i data-lucide="chevron-right" class="lic"></i> Importer <i data-lucide="chevron-right" class="lic"></i> <b>Vérifier</b>',
    saved: 'Recettes <i data-lucide="chevron-right" class="lic"></i> <b>Enregistrée</b>'
  };

  function render(keepScroll) {
    const top = keepScroll ? content.scrollTop : 0;
    if (state.screen === "url") content.innerHTML = viewUrl();
    else if (state.screen === "loading") content.innerHTML = viewLoading();
    else if (state.screen === "error") content.innerHTML = viewError();
    else if (state.screen === "review") content.innerHTML = viewReview();
    else if (state.screen === "saved") content.innerHTML = viewSaved();
    crumb.innerHTML = CRUMB[state.screen] || CRUMB.url;
    icons();
    postRender();
    if (keepScroll) content.scrollTop = top;
  }

  function viewUrl() {
    return `<div class="center-wrap fade-in">
      <div class="card" style="width:560px;text-align:left;">
        <div class="intro-head">
          <div class="tile" style="background:var(--orange-soft);color:var(--orange-deep);"><i data-lucide="link" class="lic"></i></div>
          <div><div class="t">Importer une recette depuis une page web</div><div class="d">Colle le lien d'une recette (Marmiton…). On lit la page et on prépare la recette pour toi — tu n'as plus qu'à vérifier.</div></div>
        </div>
        <div class="label" style="margin-top:20px;">Lien de la recette</div>
        <div class="field" id="urlField">
          <i data-lucide="globe" class="lic"></i>
          <input id="urlInput" type="url" placeholder="https://www.marmiton.org/…" value="${esc(state.url)}" autocomplete="off" />
          <button class="paste" data-action="paste"><i data-lucide="clipboard" class="lic"></i> Coller</button>
        </div>
        <div class="inline-err" id="urlErr"><i data-lucide="alert-circle" class="lic"></i> Colle d'abord le lien d'une recette.</div>
        <button class="btn green block" style="margin-top:14px;" data-action="import"><i data-lucide="download" class="lic"></i> Importer la recette</button>
        <div class="helper"><i data-lucide="share-2" class="lic"></i> Tu peux aussi partager une page depuis ton navigateur vers Fresh, sans copier le lien.</div>
      </div>
      <div class="try-note"><b>Essaie :</b> « Coller » remplit une recette Marmiton. Un lien d'un autre site déclenche l'écran d'erreur.</div>
    </div>`;
  }

  function viewLoading() {
    return `<div class="center-wrap fade-in">
      <div class="mascot-holder"><img src="mascot/chef-happy-t.png" alt="Chef Fresh" /></div>
      <h2>On lit la recette…</h2>
      <div class="p">Le chef parcourt la page et rattache chaque ingrédient à ton catalogue.</div>
      <div class="src-chip"><i data-lucide="globe" class="lic"></i> <span>${esc(hostOf(state.url))}</span></div>
      <div class="progress"><i id="pbar"></i></div>
      <div class="steps-list" id="loadSteps">
        <div class="sl-row wait"><span class="dot"><i data-lucide="circle" class="lic"></i></span> Page récupérée</div>
        <div class="sl-row wait"><span class="dot"><i data-lucide="circle" class="lic"></i></span> Titre, photo &amp; temps lus</div>
        <div class="sl-row wait"><span class="dot"><i data-lucide="circle" class="lic"></i></span> Rattachement des ingrédients</div>
        <div class="sl-row wait"><span class="dot"><i data-lucide="circle" class="lic"></i></span> Étapes de préparation</div>
      </div>
    </div>`;
  }

  function viewError() {
    return `<div class="center-wrap fade-in">
      <div class="mascot-holder"><img src="mascot/chef-rotten-t.png" alt="Chef déçu" /></div>
      <h2>On n'a pas réussi à lire cette page.</h2>
      <div class="p">Ce site n'est peut-être pas encore supporté, ou la page a une structure inattendue. Rien de grave&nbsp;!</div>
      <div class="err-url"><i data-lucide="unlink" class="lic"></i> <span>${esc(hostOf(state.url) || "lien invalide")}</span></div>
      <div style="display:flex;gap:12px;margin-top:26px;">
        <button class="btn green" data-action="to-url"><i data-lucide="rotate-ccw" class="lic"></i> Essayer une autre URL</button>
        <button class="btn ghost" data-action="manual"><i data-lucide="square-pen" class="lic"></i> Saisir à la main</button>
      </div>
    </div>`;
  }

  function viewReview() {
    const c = counts();
    const warnLeft = c.danger + c.warn;
    return `<div class="rev fade-in">
      <div class="rev-source"><i data-lucide="download" class="lic"></i> Importé depuis <a href="#" data-action="noop">marmiton.org <i data-lucide="external-link" class="lic"></i></a></div>
      <div class="rev-header">
        <div class="rev-photo">
          <span class="cook"><i data-lucide="chef-hat" class="lic"></i></span>
          <button class="change" data-action="toast" data-msg="Photo — à brancher"><i data-lucide="camera" class="lic"></i> Changer la photo</button>
        </div>
        <div class="rev-htext">
          <div class="rev-title editable" contenteditable="true" data-bind="title">${esc(state.title)}</div>
          <div class="rev-desc editable" contenteditable="true" data-bind="desc">${esc(state.desc)}</div>
          <div class="meta-grid">
            <div class="bubble blue"><div class="ic"><i data-lucide="timer" class="lic"></i></div><div class="v"><span class="editable" contenteditable="true" data-bind="prep">${esc(state.prep)}</span><span class="u">min</span></div><div class="l">Préparation</div></div>
            <div class="bubble orange"><div class="ic"><i data-lucide="flame" class="lic"></i></div><div class="v"><span class="editable" contenteditable="true" data-bind="cook">${esc(state.cook)}</span><span class="u">min</span></div><div class="l">Cuisson</div></div>
            <div class="bubble green"><div class="ic"><i data-lucide="users" class="lic"></i></div><div class="v"><span class="editable" contenteditable="true" data-bind="serv">${esc(state.serv)}</span><span class="u">pers.</span></div><div class="l">Portions</div></div>
            <div class="bubble yellow"><div class="ic"><i data-lucide="gauge" class="lic"></i></div><div class="v" style="font-size:20px;">${esc(state.diff)}</div><div class="l">Difficulté</div></div>
          </div>
          <div class="tags">
            ${state.tags.map((t, i) => `<span class="tag ${t.cls}"><i data-lucide="${t.icon}" class="lic"></i> ${esc(t.label)}<span class="rm" data-action="del-tag" data-i="${i}"><i data-lucide="x" class="lic"></i></span></span>`).join("")}
            <span class="tag add" data-action="add-tag"><i data-lucide="plus" class="lic"></i> Ajouter un tag</span>
          </div>
        </div>
      </div>

      <div class="rev-body">
        <div class="panel">
          <div class="panel-h">
            <span class="pic" style="background:var(--green-soft);color:var(--green-deep);"><i data-lucide="carrot" class="lic"></i></span>
            <h3>Ingrédients</h3><span class="count">${state.ings.length}</span>
          </div>
          <p class="panel-sub">Chaque ligne est rattachée à un article de ton catalogue. Vérifie les lignes signalées.</p>
          <div id="recap">${recapHtml(c)}</div>
          <div class="ings">${state.ings.map(ingHtml).join("")}</div>
        </div>
        <div class="panel">
          <div class="panel-h">
            <span class="pic" style="background:var(--orange-soft);color:var(--orange-deep);"><i data-lucide="list-ordered" class="lic"></i></span>
            <h3>Préparation</h3><span class="count">${state.steps.length} étape${state.steps.length > 1 ? "s" : ""}</span>
          </div>
          <p class="panel-sub">Glisse la poignée pour réordonner. Lie les ingrédients utilisés à chaque étape.</p>
          <div class="steps ${state.steps.length ? "has-line" : ""}">${state.steps.map(stepHtml).join("")}</div>
          <button class="add-line" data-action="add-step"><i data-lucide="plus" class="lic"></i> Ajouter une étape</button>
        </div>
      </div>

      <div class="action-bar">
        ${warnLeft
          ? `<span class="lead warn"><i data-lucide="alert-triangle" class="lic"></i> ${warnLeft} ligne${warnLeft > 1 ? "s" : ""} mérite${warnLeft > 1 ? "nt" : ""} un coup d'œil avant d'enregistrer.</span>`
          : `<span class="lead ok"><i data-lucide="check-circle-2" class="lic"></i> Tout est rattaché — prêt à enregistrer.</span>`}
        <div class="spacer"></div>
        <button class="btn ghost" data-action="to-url"><i data-lucide="x" class="lic"></i> Annuler</button>
        <button class="btn green" data-action="save"><i data-lucide="check" class="lic"></i> Enregistrer la recette</button>
      </div>
    </div>`;
  }

  function recapHtml(c) {
    if (c.danger === 0 && c.warn === 0) {
      return `<div class="recap"><div class="row"><span class="item ok"><i data-lucide="check-circle-2" class="lic"></i> ${c.ok} rattachés</span></div><div class="note allgood"><i data-lucide="sparkles" class="lic"></i> Tout est rattaché — prêt à enregistrer.</div></div>`;
    }
    return `<div class="recap"><div class="row">
      <span class="item ${c.danger ? "danger" : "zero"}"><i data-lucide="x-circle" class="lic"></i> ${c.danger} introuvable${c.danger > 1 ? "s" : ""}</span>
      <span class="item ${c.warn ? "warn" : "zero"}"><i data-lucide="help-circle" class="lic"></i> ${c.warn} à confirmer</span>
      <span class="item ok"><i data-lucide="check-circle-2" class="lic"></i> ${c.ok} rattachés</span>
    </div><div class="note"><i data-lucide="info" class="lic"></i> Tu peux enregistrer même s'il reste des imperfections — on t'aide juste à ne rien louper.</div></div>`;
  }

  function qtyHtml(it) {
    if (it.eye) return `<span class="qty eye"><i data-lucide="eye" class="lic"></i> ${esc(it.eyeLabel || "à l'œil")}</span>`;
    return `<span class="qty">${esc(it.qty)}<span class="u">${esc(it.unit)}</span></span>`;
  }

  function ingHtml(it) {
    const SM = { ok: { icon: "check-circle-2", label: "Rattaché" }, warn: { icon: "help-circle", label: "À confirmer" }, danger: { icon: "x-circle", label: "Introuvable" } };
    const sm = SM[it.conf];
    const catClass = it.conf === "danger" ? "cat missing" : "cat";
    const artLine = it.art ? `<div class="art">${esc(it.art)}</div>` : `<div class="art"><span class="none">Aucun article trouvé</span></div>`;
    const hint = it.conf === "warn" && it.hint ? ` · ${esc(it.hint)}` : "";
    const catIcon = it.art ? iconFor(it.art) : "milk";
    let right = `<div class="right">${qtyHtml(it)}`;
    if (it.conf === "warn") right += `<button class="fix-btn" data-action="confirm" data-id="${it.id}"><i data-lucide="check" class="lic"></i> Confirmer</button>`;
    else right += `<span class="chev"><i data-lucide="chevron-right" class="lic"></i></span>`;
    right += `</div>`;
    let full = "";
    if (it.conf === "danger") {
      full = `<div class="full">
        <button class="fix-btn" data-action="open" data-id="${it.id}" data-create="1"><i data-lucide="plus" class="lic"></i> Créer cet article</button>
        <button class="fix-btn alt" data-action="open" data-id="${it.id}"><i data-lucide="search" class="lic"></i> Choisir un proche</button>
      </div>`;
    }
    return `<div class="ing ${it.conf}" data-action="open" data-id="${it.id}">
      <div class="${catClass}"><i data-lucide="${catIcon}" class="lic"></i></div>
      <div class="main">${artLine}<div class="brut">${esc(it.brut)}</div><div class="stat"><i data-lucide="${sm.icon}" class="lic"></i> ${sm.label}${hint}</div></div>
      ${right}${full}
    </div>`;
  }

  function stepHtml(st, i) {
    const linked = st.ings || [];
    const chips = linked.map((id) => {
      const g = state.ings.find((x) => x.id === id); if (!g) return "";
      const nm = g.art || "Ingrédient"; const q = qtyShort(g);
      return `<span class="step-ing">${esc(nm)}${q ? ` <span class="q">${esc(q)}</span>` : ""}<span class="rm" data-action="step-unlink" data-step="${st.id}" data-ing="${id}"><i data-lucide="x" class="lic"></i></span></span>`;
    }).join("");
    const menuOpen = state.openStepMenu === st.id;
    const opts = state.ings.map((g) => {
      const on = linked.includes(g.id); const nm = g.art || g.brut; const q = qtyShort(g);
      return `<div class="ing-opt ${on ? "on" : ""}" data-action="step-tog" data-step="${st.id}" data-ing="${g.id}"><span class="box"><i data-lucide="check" class="lic"></i></span><span class="nm">${esc(nm)}</span>${q ? `<span class="q">${esc(q)}</span>` : ""}</div>`;
    }).join("");
    return `<div class="step" data-id="${st.id}">
      <div class="node">${i + 1}</div>
      <div class="sc">
        <div class="stxt editable" contenteditable="true" data-step="${st.id}">${esc(st.t)}</div>
        <div class="step-ings">${chips}<button class="ing-pick-btn ${menuOpen ? "active" : ""}" data-action="step-pick" data-id="${st.id}"><i data-lucide="carrot" class="lic"></i> ${linked.length ? "Modifier les ingrédients" : "Lier des ingrédients"}</button></div>
        <div class="ing-menu ${menuOpen ? "open" : ""}"><div class="mtitle">Ingrédients utilisés à cette étape</div>${opts}</div>
        <div class="sfoot">
          <span class="dur"><i data-lucide="clock" class="lic"></i> ${esc(st.d)}</span>
          <button class="sgrip" data-grip title="Glisser pour réordonner"><i data-lucide="grip-vertical" class="lic"></i></button>
          <button class="sdel" data-action="del-step" data-id="${st.id}"><i data-lucide="trash-2" class="lic"></i></button>
        </div>
      </div>
    </div>`;
  }

  function viewSaved() {
    const c = counts();
    const totalMin = (parseInt(state.prep) || 0) + (parseInt(state.cook) || 0);
    return `<div class="center-wrap fade-in">
      <div class="saved-badge"><div class="ring"><img src="mascot/chef-happy-t.png" alt="Chef Fresh" /></div><div class="tick"><i data-lucide="check" class="lic"></i></div></div>
      <h2>Recette enregistrée&nbsp;!</h2>
      <div class="p">« ${esc(state.title)} » est dans ta bibliothèque. Ses ingrédients pourront être croisés avec ton frigo.</div>
      <div class="saved-sum">
        <div class="s"><div class="n">${state.ings.length}</div><div class="l">ingrédients</div></div>
        <div class="s"><div class="n">${state.steps.length}</div><div class="l">étapes</div></div>
        <div class="s"><div class="n">${totalMin || "–"}</div><div class="l">min au total</div></div>
      </div>
      ${c.danger || c.warn ? `<div class="err-url" style="background:var(--yellow-soft);color:var(--amber);margin-top:18px;"><i data-lucide="info" class="lic"></i> <span>${c.danger + c.warn} ingrédient(s) restaient à vérifier</span></div>` : ""}
      <div style="display:flex;gap:12px;margin-top:26px;">
        <button class="btn green" data-action="view-recipe"><i data-lucide="book-open" class="lic"></i> Voir la recette</button>
        <button class="btn ghost" data-action="to-url"><i data-lucide="plus" class="lic"></i> Importer une autre recette</button>
      </div>
    </div>`;
  }

  // ── Modal (correction) ──
  function openSheet(id, focusCreate) {
    const it = state.ings.find((x) => x.id === id); if (!it) return;
    state.sheetId = id;
    state.editing = { art: it.art, qty: it.qty, unit: it.unit || "g", eye: it.eye, eyeLabel: it.eyeLabel || "à l'œil", search: "" };
    renderModal(focusCreate); modalWrap.classList.add("open");
  }
  function closeSheet() { modalWrap.classList.remove("open"); state.sheetId = null; state.editing = null; }

  function guessMissingName(brut) {
    let m = (brut || "").replace(/^[\d\s.,/]+/, "");
    m = m.replace(/^(ml|cl|l|g|kg|c\. à soupe|c\. à café|gousses?|pièces?|tranches?|filet|pincées?)\b/i, "");
    m = m.replace(/^\s*(de|d')\s*/i, "");
    return m.trim() || "cet ingrédient";
  }

  function renderModal(focusCreate) {
    const it = state.ings.find((x) => x.id === state.sheetId); const ed = state.editing;
    if (!it || !ed) return;
    const q = ed.search.trim().toLowerCase();
    let results = CATALOG; if (q) results = CATALOG.filter((c) => c.name.toLowerCase().includes(q));
    const noExact = q && !CATALOG.some((c) => c.name.toLowerCase() === q);
    const missName = guessMissingName(it.brut);
    const createBlock = (it.conf === "danger" || (q && noExact))
      ? `<div class="create-cta"><div class="ic"><i data-lucide="plus-circle" class="lic"></i></div><div class="tx"><div class="t">Créer « ${esc(q || missName)} »</div><div class="d">Ajouter au catalogue et rattacher</div></div><button class="go" data-action="create"><i data-lucide="plus" class="lic"></i> Créer</button></div>` : "";
    const list = results.length
      ? results.map((c) => `<div class="cat-opt ${ed.art === c.name ? "sel" : ""}" data-action="pick" data-name="${esc(c.name)}"><div class="ci"><i data-lucide="${c.icon}" class="lic"></i></div><div class="nm">${esc(c.name)}</div><span class="ck"><i data-lucide="check" class="lic"></i></span></div>`).join("")
      : `<div class="cat-empty">Aucun article ne correspond.<br/>Crée-le pour le rattacher.</div>`;
    modal.innerHTML = `
      <div class="sh-top">
        <div><div class="sh-title">Corriger l'ingrédient</div><div class="sh-brut">Détecté : « ${esc(it.brut)} »</div></div>
        <button class="close" data-action="close-sheet"><i data-lucide="x" class="lic"></i></button>
      </div>
      <div class="modal-scroll">
        <div class="sh-label">Article du catalogue</div>
        <div class="field" style="background:var(--sub);"><i data-lucide="search" class="lic"></i><input id="catSearch" placeholder="Rechercher un article…" value="${esc(ed.search)}" autocomplete="off" /></div>
        ${createBlock}
        <div class="cat-list" style="margin-top:10px;">${list}</div>
        <div class="sh-label">Quantité</div>
        <div class="eye-toggle ${ed.eye ? "on" : ""}" data-action="toggle-eye"><span class="ic"><i data-lucide="eye" class="lic"></i></span><div class="tx"><div class="t">Quantité « à l'œil »</div><div class="d">Sans chiffre — filet, pincée, au goût</div></div><span class="sw"></span></div>
        ${ed.eye
          ? `<div class="eye-labels">${EYE_LABELS.map((l) => `<div class="el ${ed.eyeLabel === l ? "sel" : ""}" data-action="eye-label" data-l="${esc(l)}">${esc(l)}</div>`).join("")}</div>`
          : `<div class="qty-row" style="margin-top:10px;"><div class="qty-in"><input id="qtyIn" inputmode="decimal" placeholder="0" value="${esc(ed.qty)}" /></div><select class="unit-sel" id="unitIn">${UNITS.map((u) => `<option ${u === ed.unit ? "selected" : ""}>${u}</option>`).join("")}</select></div>`}
      </div>
      <div class="modal-foot"><button class="btn ghost" data-action="close-sheet">Annuler</button><button class="btn green" data-action="apply"><i data-lucide="check" class="lic"></i> Valider</button></div>`;
    icons();
    const cs = document.getElementById("catSearch");
    if (cs) { cs.addEventListener("input", (e) => { state.editing.search = e.target.value; renderModal(); }); if (focusCreate) cs.focus(); }
    const qi = document.getElementById("qtyIn"); if (qi) qi.addEventListener("input", (e) => { state.editing.qty = e.target.value; });
    const ui = document.getElementById("unitIn"); if (ui) ui.addEventListener("change", (e) => { state.editing.unit = e.target.value; });
  }

  function applySheet() {
    const it = state.ings.find((x) => x.id === state.sheetId); const ed = state.editing;
    if (!it || !ed) return;
    it.eye = ed.eye;
    if (ed.eye) { it.eyeLabel = ed.eyeLabel; it.qty = ""; it.unit = ""; }
    else { it.qty = ed.qty; it.unit = ed.unit; it.eyeLabel = ""; }
    if (ed.art) { it.art = ed.art; it.conf = "ok"; delete it.hint; }
    closeSheet(); render(true);
    const c = counts();
    toast(c.danger + c.warn === 0 ? "Tout est rattaché" : "Ingrédient mis à jour");
  }

  function runLoading(gotoError) {
    const bar = document.getElementById("pbar");
    const rows = [...document.querySelectorAll("#loadSteps .sl-row")];
    const widths = ["28%", "52%", "80%", "100%"];
    let k = 0;
    function setRow(i, cls, ic, spin) {
      const r = rows[i]; if (!r) return;
      r.className = "sl-row " + cls;
      r.querySelector(".dot").innerHTML = `<i data-lucide="${ic}" class="lic${spin ? " spin" : ""}"></i>`;
      icons();
    }
    setRow(0, "active", "loader-2", true);
    if (bar) bar.style.width = "12%";
    const iv = setInterval(() => {
      setRow(k, "done", "check", false);
      if (bar) bar.style.width = widths[k];
      k++;
      if (k < rows.length) setRow(k, "active", "loader-2", true);
      else { clearInterval(iv); setTimeout(() => { if (gotoError) state.screen = "error"; else { seed(); state.screen = "review"; } render(); }, 480); }
    }, 620);
  }

  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-action]"); if (!el) return;
    const a = el.dataset.action;
    if (a === "paste") {
      const inp = document.getElementById("urlInput"); state.url = MARMITON_URL; if (inp) inp.value = MARMITON_URL;
      document.getElementById("urlField").classList.remove("err"); document.getElementById("urlErr").classList.remove("show");
    } else if (a === "import") {
      const inp = document.getElementById("urlInput"); state.url = (inp ? inp.value : state.url).trim();
      if (!state.url) { document.getElementById("urlField").classList.add("err"); document.getElementById("urlErr").classList.add("show"); return; }
      const bad = !/marmiton\./i.test(state.url);
      state.screen = "loading"; render(); runLoading(bad);
    } else if (a === "to-url") {
      state.url = ""; state.screen = "url"; closeSheet(); render();
    } else if (a === "manual") {
      seed(); state.screen = "review"; render(); toast("Recette vierge — à toi de jouer");
    } else if (a === "open") {
      openSheet(+el.dataset.id, el.dataset.create === "1");
    } else if (a === "confirm") {
      const it = state.ings.find((x) => x.id === +el.dataset.id); if (it) { it.conf = "ok"; delete it.hint; render(true); toast("Rattachement confirmé"); }
    } else if (a === "close-sheet") { closeSheet(); }
    else if (a === "pick") { state.editing.art = el.dataset.name; renderModal(); }
    else if (a === "create") {
      const it = state.ings.find((x) => x.id === state.sheetId);
      const nm = (state.editing.search.trim() || guessMissingName(it.brut));
      const pretty = nm.charAt(0).toUpperCase() + nm.slice(1);
      if (!CATALOG.some((c) => c.name.toLowerCase() === pretty.toLowerCase())) CATALOG.push({ name: pretty, icon: "package" });
      state.editing.art = pretty; renderModal(); toast("Article créé au catalogue");
    } else if (a === "toggle-eye") { state.editing.eye = !state.editing.eye; renderModal(); }
    else if (a === "eye-label") { state.editing.eyeLabel = el.dataset.l; renderModal(); }
    else if (a === "apply") { applySheet(); }
    else if (a === "add-step") {
      const id = Math.max(0, ...state.steps.map((s) => s.id)) + 1;
      state.steps.push({ id, t: "", d: "– min", ings: [] }); render(true);
      const nodes = document.querySelectorAll(".stxt"); const last = nodes[nodes.length - 1]; if (last) last.focus();
    } else if (a === "del-step") { state.steps = state.steps.filter((s) => s.id !== +el.dataset.id); render(true); }
    else if (a === "step-pick") { const id = +el.dataset.id; state.openStepMenu = state.openStepMenu === id ? null : id; render(true); }
    else if (a === "step-tog") {
      const st = state.steps.find((s) => s.id === +el.dataset.step);
      if (st) { st.ings = st.ings || []; const ing = +el.dataset.ing; st.ings = st.ings.includes(ing) ? st.ings.filter((x) => x !== ing) : [...st.ings, ing]; state.openStepMenu = st.id; render(true); }
    } else if (a === "step-unlink") {
      const st = state.steps.find((s) => s.id === +el.dataset.step);
      if (st) { st.ings = (st.ings || []).filter((x) => x !== +el.dataset.ing); render(true); }
    } else if (a === "del-tag") { state.tags.splice(+el.dataset.i, 1); render(true); }
    else if (a === "add-tag") {
      const pool = [{ label: "Rapide", cls: "green", icon: "zap" }, { label: "Épicé", cls: "purple", icon: "flame" }, { label: "Familial", cls: "blue", icon: "users" }, { label: "Batch cooking", cls: "green", icon: "archive" }];
      const next = pool.find((p) => !state.tags.some((t) => t.label === p.label));
      if (next) { state.tags.push(next); render(true); } else toast("Plus de suggestions");
    } else if (a === "save") { state.openStepMenu = null; state.screen = "saved"; closeSheet(); render(); }
    else if (a === "view-recipe") { toast("Ouverture de la recette…"); }
    else if (a === "toast") { toast(el.dataset.msg || ""); }
  });

  function postRender() {
    content.querySelectorAll("[data-bind]").forEach((el) => {
      el.addEventListener("blur", () => { state[el.dataset.bind] = el.textContent.trim(); });
    });
    content.querySelectorAll(".stxt[data-step]").forEach((el) => {
      el.addEventListener("blur", () => { const s = state.steps.find((x) => x.id === +el.dataset.step); if (s) s.t = el.textContent.trim(); });
    });
    const urlInput = document.getElementById("urlInput");
    if (urlInput) urlInput.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); document.querySelector('[data-action="import"]').click(); } });
    if (state.screen === "review") wireStepDnD();
  }

  function wireStepDnD() {
    const container = content.querySelector(".steps"); if (!container) return;
    function afterEl(y) {
      const els = [...container.querySelectorAll(".step:not(.dragging)")];
      let closest = { offset: -Infinity, el: null };
      for (const child of els) { const box = child.getBoundingClientRect(); const offset = y - box.top - box.height / 2; if (offset < 0 && offset > closest.offset) closest = { offset, el: child }; }
      return closest.el;
    }
    container.querySelectorAll(".step").forEach((stepEl) => {
      const grip = stepEl.querySelector(".sgrip");
      if (grip) {
        grip.addEventListener("mousedown", () => stepEl.setAttribute("draggable", "true"));
        grip.addEventListener("mouseup", () => stepEl.removeAttribute("draggable"));
      }
      stepEl.addEventListener("dragstart", (e) => { stepEl.classList.add("dragging"); e.dataTransfer.effectAllowed = "move"; try { e.dataTransfer.setData("text/plain", stepEl.dataset.id); } catch (x) {} });
      stepEl.addEventListener("dragend", () => { stepEl.classList.remove("dragging"); stepEl.removeAttribute("draggable"); commitStepOrder(); });
    });
    container.addEventListener("dragover", (e) => {
      e.preventDefault(); const dragging = container.querySelector(".dragging"); if (!dragging) return;
      const ref = afterEl(e.clientY); if (ref == null) container.appendChild(dragging); else container.insertBefore(dragging, ref);
    });
    function commitStepOrder() {
      const ids = [...container.querySelectorAll(".step")].map((el) => +el.dataset.id);
      state.steps.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id)); render(true);
    }
  }

  const root = document.documentElement, tt = document.getElementById("themeToggle");
  const ti = document.getElementById("themeIcon"), tl = document.getElementById("themeLabel");
  function applyTheme(t) {
    root.setAttribute("data-theme", t); localStorage.setItem("fresh-import-theme", t);
    ti.setAttribute("data-lucide", t === "dark" ? "sun" : "moon"); tl.textContent = t === "dark" ? "Clair" : "Sombre"; icons();
  }
  tt.addEventListener("click", () => applyTheme(root.getAttribute("data-theme") === "dark" ? "light" : "dark"));

  applyTheme(state.theme);
  render();
})();
