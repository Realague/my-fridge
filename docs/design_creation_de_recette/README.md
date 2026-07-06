<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Fresh — Consulter une recette</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  :root {
    --bg: #fdf8ed;
    --card: #ffffff;
    --sub: #f6efde;
    --page-bg: #ece2cc;
    --ink: #1a1d1a;
    --ink-2: #5e6760;
    --ink-3: #9ba59f;
    --rule: #ece4d2;
    --green: #2bb673;
    --green-soft: #d6f3e3;
    --green-deep: #1f9c5e;
    --orange: #ff7a3a;
    --orange-soft: #ffe0cc;
    --orange-deep: #a4451a;
    --red: #ef4a5a;
    --red-soft: #ffd9de;
    --yellow: #ffc839;
    --yellow-soft: #fff1c4;
    --amber: #8a6a06;
    --blue: #4f8ef5;
    --blue-soft: #dae9ff;
    --blue-deep: #2b5db8;
    --purple-soft: #e4dafa;
    --display: "DM Sans", system-ui, sans-serif;
    --body: "Inter", ui-sans-serif, system-ui, sans-serif;
    --sh-sm: 0 1px 2px rgba(0,0,0,.04);
    --sh-md: 0 6px 18px rgba(0,0,0,.06);
    --sh-lg: 0 24px 60px rgba(0,0,0,.10);
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    background: var(--page-bg);
    font-family: var(--body);
    color: var(--ink);
    -webkit-font-smoothing: antialiased;
    min-height: 100vh;
    display: flex; align-items: flex-start; justify-content: center;
    padding: 40px 24px;
  }
  .lic { width: 1em; height: 1em; display: inline-block; vertical-align: -0.12em; }

  .studio {
    width: 100%; max-width: 1180px; background: var(--bg); border-radius: 28px; box-shadow: var(--sh-lg);
    padding: 22px 28px 30px; overflow: hidden;
  }

  /* Top bar */
  .s-top { display: flex; align-items: center; gap: 14px; margin-bottom: 22px; flex-wrap: wrap; }
  .icon-btn {
    width: 42px; height: 42px; border-radius: 14px; background: var(--card); box-shadow: var(--sh-sm);
    display: flex; align-items: center; justify-content: center; color: var(--ink-2); cursor: pointer; flex-shrink: 0; border: 0;
  }
  .icon-btn:hover { background: var(--sub); }
  .icon-btn .lic { width: 19px; height: 19px; }
  .crumb { font-family: var(--display); font-weight: 600; font-size: 14px; color: var(--ink-3); }
  .crumb b { color: var(--ink); font-weight: 700; }
  .s-top .spacer { flex: 1; }
  .top-actions { display: flex; align-items: center; gap: 10px; }
  .btn {
    appearance: none; border: 0; cursor: pointer; font-family: var(--display); font-weight: 700; font-size: 13.5px;
    padding: 11px 18px; border-radius: 999px; display: inline-flex; align-items: center; gap: 8px; transition: transform .08s, box-shadow .2s, background .15s;
  }
  .btn:active { transform: translateY(1px); }
  .btn .lic { width: 16px; height: 16px; }
  .btn-primary { background: var(--green); color: #fff; box-shadow: 0 6px 16px rgba(43,182,115,.32); }
  .btn-primary:hover { background: var(--green-deep); }
  .btn-ghost { background: var(--card); color: var(--ink); box-shadow: var(--sh-sm); }
  .btn-ghost:hover { background: var(--sub); }

  /* Hero */
  .hero { display: grid; grid-template-columns: 460px 1fr; gap: 26px; align-items: stretch; margin-bottom: 22px; }
  @media (max-width: 820px){ .hero { grid-template-columns: 1fr; } }
  .hero-photo {
    position: relative; border-radius: 22px; overflow: hidden; min-height: 320px;
    background-size: cover; background-position: center;
  }
  .hero-photo::after { content:""; position:absolute; inset:0; background: linear-gradient(180deg, rgba(0,0,0,0) 55%, rgba(0,0,0,.28)); }
  .hero-photo .fav {
    position: absolute; top: 14px; right: 14px; z-index: 2; width: 40px; height: 40px; border-radius: 50%;
    background: rgba(255,255,255,.92); display: flex; align-items: center; justify-content: center; cursor: pointer; border: 0; box-shadow: var(--sh-sm);
  }
  .hero-photo .fav .lic { width: 19px; height: 19px; color: var(--red); }
  .hero-photo .fav.on .lic { fill: var(--red); }

  .htext { display: flex; flex-direction: column; justify-content: center; padding: 4px 0; }
  .eyebrow {
    align-self: flex-start;
    display: inline-flex; align-items: center; gap: 7px; font-family: var(--display); font-weight: 700;
    font-size: 11.5px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--green-deep);
    background: var(--green-soft); padding: 5px 11px; border-radius: 999px;
  }
  .eyebrow .lic { width: 13px; height: 13px; }
  .h-title { margin: 14px 0 0; font-family: var(--display); font-weight: 800; font-size: 42px; line-height: 1.04; letter-spacing: -0.03em; color: var(--ink); }
  .h-desc { margin: 13px 0 0; font-family: var(--body); font-size: 16px; color: var(--ink-2); line-height: 1.55; max-width: 46ch; }
  .h-tags { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 18px; }
  .tag {
    display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 999px;
    font-family: var(--display); font-weight: 700; font-size: 12.5px; white-space: nowrap;
  }
  .tag .lic { width: 14px; height: 14px; }
  .tag.green { background: var(--green-soft); color: var(--green-deep); }
  .tag.blue { background: var(--blue-soft); color: var(--blue-deep); }
  .tag.orange { background: var(--orange-soft); color: var(--orange-deep); }
  .tag.purple { background: var(--purple-soft); color: #5536c7; }

  .h-author { display: flex; align-items: center; gap: 10px; margin-top: 20px; padding-top: 18px; border-top: 1px solid var(--rule); }
  .h-author .av { width: 36px; height: 36px; border-radius: 50%; background: var(--orange-soft); color: var(--orange-deep); display: flex; align-items: center; justify-content: center; font-family: var(--display); font-weight: 800; font-size: 15px; }
  .h-author .meta { font-size: 13px; color: var(--ink-3); font-family: var(--body); }
  .h-author .meta b { color: var(--ink); font-family: var(--display); font-weight: 700; }

  /* Meta bubbles (read-only) */
  .meta-bar { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin: 0 0 22px; }
  .bubble { border-radius: 20px; padding: 16px 18px; }
  .bubble .ic { width: 38px; height: 38px; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-bottom: 12px; background: #fff; }
  .bubble .ic .lic { width: 19px; height: 19px; }
  .bubble .val { font-family: var(--display); font-weight: 800; font-size: 26px; letter-spacing: -0.02em; line-height: 1; display: flex; align-items: baseline; gap: 4px; }
  .bubble .val .u { font-size: 15px; font-weight: 700; opacity: .6; }
  .bubble .lbl { font-family: var(--display); font-weight: 600; font-size: 12.5px; color: var(--ink-2); margin-top: 7px; }
  .bubble.blue { background: var(--blue-soft); } .bubble.blue .ic { color: var(--blue); } .bubble.blue .val { color: var(--blue-deep); }
  .bubble.orange { background: var(--orange-soft); } .bubble.orange .ic { color: var(--orange); } .bubble.orange .val { color: var(--orange-deep); }
  .bubble.green { background: var(--green-soft); } .bubble.green .ic { color: var(--green); } .bubble.green .val { color: var(--green-deep); }
  .bubble.yellow { background: var(--yellow-soft); } .bubble.yellow .ic { color: #d9a300; } .bubble.yellow .val { color: var(--amber); font-size: 22px; }
  .bubble.yellow .dots { display: inline-flex; gap: 4px; margin-left: 2px; }
  .bubble.yellow .dots i { width: 8px; height: 8px; border-radius: 50%; background: #e2dcca; align-self: center; }
  .bubble.yellow .dots i.on { background: #d9a300; }

  @media (max-width: 900px) { .meta-bar { grid-template-columns: 1fr 1fr; } }

  /* Body */
  .body-grid { display: grid; grid-template-columns: 380px 1fr; gap: 20px; align-items: start; }
  @media (max-width: 900px) { .body-grid { grid-template-columns: 1fr; } }

  .panel { background: var(--card); border-radius: 22px; padding: 22px 24px; box-shadow: var(--sh-md); }
  .panel-h { display: flex; align-items: center; gap: 11px; margin-bottom: 4px; }
  .panel-h .pic { width: 34px; height: 34px; border-radius: 11px; display: flex; align-items: center; justify-content: center; }
  .panel-h .pic .lic { width: 18px; height: 18px; }
  .panel-h h3 { margin: 0; font-family: var(--display); font-weight: 700; font-size: 20px; letter-spacing: -0.02em; }
  .panel-h .count { margin-left: auto; font-family: var(--display); font-weight: 700; font-size: 13px; color: var(--ink-3); }

  /* Servings scaler */
  .scaler { display: flex; align-items: center; gap: 12px; margin: 14px 0 6px; padding: 10px 12px; background: var(--sub); border-radius: 14px; }
  .scaler .lab { font-family: var(--display); font-weight: 700; font-size: 13px; color: var(--ink-2); display: flex; align-items: center; gap: 7px; }
  .scaler .lab .lic { width: 16px; height: 16px; color: var(--green-deep); }
  .scaler .stepper { margin-left: auto; display: flex; align-items: center; gap: 10px; background: #fff; border-radius: 999px; padding: 4px; box-shadow: var(--sh-sm); }
  .scaler .stepper button { width: 30px; height: 30px; border-radius: 50%; border: 0; background: var(--sub); color: var(--green-deep); cursor: pointer; display: flex; align-items: center; justify-content: center; }
  .scaler .stepper button:hover { background: var(--green-soft); }
  .scaler .stepper button .lic { width: 15px; height: 15px; }
  .scaler .stepper .n { font-family: var(--display); font-weight: 800; font-size: 16px; min-width: 42px; text-align: center; }
  .scaler .stepper .n small { font-weight: 700; font-size: 11px; color: var(--ink-3); }

  /* Ingredient rows */
  .ing { display: flex; align-items: center; gap: 12px; padding: 11px 0; cursor: pointer; }
  .ing + .ing { border-top: 1px dashed var(--rule); }
  .ing .check { width: 22px; height: 22px; border-radius: 7px; border: 2px solid #d4cbb4; flex-shrink: 0; display: flex; align-items: center; justify-content: center; color: #fff; transition: background .12s, border-color .12s; }
  .ing .check .lic { width: 14px; height: 14px; opacity: 0; }
  .ing.done .check { background: var(--green); border-color: var(--green); }
  .ing.done .check .lic { opacity: 1; }
  .ing .nm { font-family: var(--body); font-size: 14.5px; color: var(--ink); flex: 1; transition: color .12s; }
  .ing.done .nm { color: var(--ink-3); text-decoration: line-through; }
  .ing .qty { font-family: var(--display); font-weight: 800; font-size: 14.5px; color: var(--green-deep); white-space: nowrap; }
  .ing.done .qty { color: var(--ink-3); }
  .ing-foot { display: flex; align-items: center; gap: 8px; margin-top: 16px; padding-top: 14px; border-top: 1px solid var(--rule); }
  .ing-foot .btn { width: 100%; justify-content: center; background: var(--green-soft); color: var(--green-deep); box-shadow: none; }
  .ing-foot .btn:hover { background: #c4ecd6; }

  /* Steps timeline */
  .steps { position: relative; margin-top: 8px; }
  .steps::before { content: ""; position: absolute; left: 17px; top: 16px; bottom: 20px; width: 2px; background: var(--rule); }
  .step { display: grid; grid-template-columns: 36px 1fr; gap: 16px; padding-bottom: 18px; position: relative; }
  .step:last-child { padding-bottom: 0; }
  .step .node {
    width: 36px; height: 36px; border-radius: 50%; background: var(--green); color: #fff; z-index: 1;
    display: flex; align-items: center; justify-content: center; font-family: var(--display); font-weight: 800; font-size: 15px;
    box-shadow: 0 0 0 5px var(--card); cursor: pointer; transition: background .12s;
  }
  .step.done .node { background: var(--green-deep); }
  .step .sc { background: var(--sub); border-radius: 16px; padding: 15px 17px; transition: opacity .15s; }
  .step.done .sc { opacity: .6; }
  .step .stxt { font-family: var(--body); font-size: 14.5px; line-height: 1.55; color: var(--ink); }
  .step .sfoot { display: flex; align-items: center; gap: 8px; margin-top: 12px; flex-wrap: wrap; }
  .step .durchip { display: inline-flex; align-items: center; gap: 6px; background: var(--card); border-radius: 999px; padding: 6px 12px; font-family: var(--display); font-weight: 700; font-size: 12.5px; color: var(--ink-2); }
  .step .durchip .lic { width: 14px; height: 14px; color: var(--orange); }
  .step-ing { display: inline-flex; align-items: center; gap: 5px; padding: 5px 11px; border-radius: 999px; background: var(--green-soft); color: var(--green-deep); font-family: var(--display); font-weight: 700; font-size: 12px; }
  .step-ing .q { opacity: .65; font-weight: 600; }

  .toast {
    position: fixed; left: 50%; bottom: 32px; transform: translateX(-50%) translateY(20px);
    background: var(--ink); color: #fff; font-family: var(--display); font-weight: 700; font-size: 14px;
    padding: 14px 22px; border-radius: 999px; box-shadow: var(--sh-lg); display: flex; align-items: center; gap: 10px;
    opacity: 0; pointer-events: none; transition: opacity .25s, transform .25s; z-index: 50;
  }
  .toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }
  .toast .lic { width: 18px; height: 18px; color: #6ee0a6; }
</style>
</head>
<body>

<div class="studio" data-screen-label="Consulter une recette">
  <div class="s-top">
    <button class="icon-btn" title="Retour"><i data-lucide="arrow-left" class="lic"></i></button>
    <div class="crumb">Recettes&nbsp; /&nbsp; <b>Dahl de lentilles corail</b></div>
    <div class="spacer"></div>
    <div class="top-actions">
      <button class="icon-btn" title="Partager"><i data-lucide="share-2" class="lic"></i></button>
      <button class="icon-btn" title="Imprimer"><i data-lucide="printer" class="lic"></i></button>
      <button class="btn btn-ghost" id="editBtn"><i data-lucide="pencil" class="lic"></i> Modifier</button>
      <button class="btn btn-primary" id="cookBtn"><i data-lucide="chef-hat" class="lic"></i> Lancer la cuisson</button>
    </div>
  </div>

  <!-- Hero -->
  <div class="hero">
    <div class="hero-photo" style="background-image:url('https://images.unsplash.com/photo-1631292784640-2b24be784d5d?q=80&w=1200&auto=format&fit=crop')">
      <button class="fav" id="favBtn" title="Ajouter aux favoris"><i data-lucide="heart" class="lic"></i></button>
    </div>
    <div class="htext">
      <span class="eyebrow"><i data-lucide="utensils-crossed" class="lic"></i> Plat principal</span>
      <h1 class="h-title">Dahl de lentilles corail au lait de coco</h1>
      <p class="h-desc">Un dahl réconfortant, doux et parfumé. Les lentilles corail fondent
        dans un lait de coco au curry ; parfait à préparer en avance et à réchauffer.</p>
      <div class="h-tags">
        <span class="tag green"><i data-lucide="leaf" class="lic"></i> Végétarien</span>
        <span class="tag blue"><i data-lucide="zap" class="lic"></i> Rapide</span>
        <span class="tag orange"><i data-lucide="wheat-off" class="lic"></i> Sans gluten</span>
        <span class="tag purple"><i data-lucide="archive" class="lic"></i> Batch cooking</span>
      </div>
      <div class="h-author">
        <span class="av">M</span>
        <span class="meta">Ajoutée par <b>Marion</b> · le 12 juin 2026</span>
      </div>
    </div>
  </div>

  <!-- Meta bubbles -->
  <div class="meta-bar">
    <div class="bubble blue">
      <div class="ic"><i data-lucide="timer" class="lic"></i></div>
      <div class="val">15<span class="u">min</span></div>
      <div class="lbl">Préparation</div>
    </div>
    <div class="bubble orange">
      <div class="ic"><i data-lucide="flame" class="lic"></i></div>
      <div class="val">25<span class="u">min</span></div>
      <div class="lbl">Cuisson</div>
    </div>
    <div class="bubble green">
      <div class="ic"><i data-lucide="users" class="lic"></i></div>
      <div class="val" id="servDisplay">4<span class="u">pers.</span></div>
      <div class="lbl">Portions</div>
    </div>
    <div class="bubble yellow">
      <div class="ic"><i data-lucide="gauge" class="lic"></i></div>
      <div class="val">Facile<span class="dots"><i class="on"></i><i></i><i></i></span></div>
      <div class="lbl">Difficulté</div>
    </div>
  </div>

  <!-- Body -->
  <div class="body-grid">
    <!-- Ingredients -->
    <div class="panel">
      <div class="panel-h">
        <span class="pic" style="background:var(--green-soft);color:var(--green-deep)"><i data-lucide="carrot" class="lic"></i></span>
        <h3>Ingrédients</h3>
        <span class="count"><span id="ingDone">0</span>/8</span>
      </div>
      <div class="scaler">
        <span class="lab"><i data-lucide="users" class="lic"></i> Ajuster les portions</span>
        <div class="stepper">
          <button id="servMinus" title="Moins"><i data-lucide="minus" class="lic"></i></button>
          <span class="n"><span id="servN">4</span> <small>pers.</small></span>
          <button id="servPlus" title="Plus"><i data-lucide="plus" class="lic"></i></button>
        </div>
      </div>
      <div id="ingList"></div>
      <div class="ing-foot">
        <button class="btn" id="shopBtn"><i data-lucide="shopping-cart" class="lic"></i> Ajouter les manquants à la liste</button>
      </div>
    </div>

    <!-- Steps -->
    <div class="panel">
      <div class="panel-h">
        <span class="pic" style="background:var(--orange-soft);color:var(--orange-deep)"><i data-lucide="list-ordered" class="lic"></i></span>
        <h3>Préparation</h3>
        <span class="count">5 étapes · 40 min</span>
      </div>
      <div class="steps" id="stepList"></div>
    </div>
  </div>
</div>

<div class="toast" id="toast"><i data-lucide="check-circle-2" class="lic"></i> <span id="toastMsg"></span></div>

<script src="https://unpkg.com/lucide@0.460.0/dist/umd/lucide.min.js"></script>
<script>
(function(){
  const $ = s => document.querySelector(s);
  const BASE_SERV = 4;
  let serv = 4;

  // qty per BASE_SERV portions; null = "au goût" / non scalable
  const INGREDIENTS = [
    { name: "Lentilles corail", qty: 200, unit: "g" },
    { name: "Lait de coco", qty: 400, unit: "ml" },
    { name: "Tomates concassées", qty: 400, unit: "g" },
    { name: "Épinards frais", qty: 200, unit: "g" },
    { name: "Oignon", qty: 1, unit: "" },
    { name: "Ail", qty: 2, unit: "gousses" },
    { name: "Pâte de curry", qty: 1, unit: "c. à s." },
    { name: "Huile d'olive, sel, poivre", qty: null, unit: "au goût" },
  ];

  const STEPS = [
    { text: "Émincez l'oignon et l'ail. Faites-les revenir dans un filet d'huile d'olive à feu moyen jusqu'à ce qu'ils soient translucides.", dur: 5, ings: ["Oignon","Ail","Huile d'olive, sel, poivre"] },
    { text: "Ajoutez la pâte de curry, mélangez 1 minute pour libérer les arômes.", dur: 2, ings: ["Pâte de curry"] },
    { text: "Versez les lentilles corail rincées, les tomates concassées et le lait de coco. Portez à frémissement.", dur: 3, ings: ["Lentilles corail","Tomates concassées","Lait de coco"] },
    { text: "Laissez mijoter à couvert en remuant de temps en temps, jusqu'à ce que les lentilles soient fondantes.", dur: 22, ings: [] },
    { text: "Incorporez les épinards en fin de cuisson, salez, poivrez. Servez chaud avec du riz.", dur: 3, ings: ["Épinards frais"] },
  ];

  function fmtQty(g){
    if(g.qty == null) return g.unit; // "au goût"
    const scaled = g.qty * serv / BASE_SERV;
    const rounded = Math.round(scaled * 100) / 100;
    return (rounded + (g.unit ? " " + g.unit : "")).trim();
  }
  function shortQty(g){
    if(g.qty == null) return "";
    const scaled = g.qty * serv / BASE_SERV;
    const rounded = Math.round(scaled * 100) / 100;
    const u = g.unit === "gousses" ? "gou." : g.unit === "c. à s." ? "càs" : g.unit;
    return (rounded + (u ? " " + u : "")).trim();
  }

  function renderIngredients(){
    const list = $("#ingList");
    list.innerHTML = "";
    INGREDIENTS.forEach((g, i) => {
      const row = document.createElement("div");
      row.className = "ing";
      row.innerHTML = `
        <span class="check"><i data-lucide="check" class="lic"></i></span>
        <span class="nm">${g.name}</span>
        <span class="qty">${fmtQty(g)}</span>`;
      row.addEventListener("click", () => { row.classList.toggle("done"); updateIngCount(); });
      list.appendChild(row);
    });
    lucide.createIcons({ attrs:{ "stroke-width":1.9 } });
  }
  function updateIngCount(){
    $("#ingDone").textContent = document.querySelectorAll(".ing.done").length;
  }

  function renderSteps(){
    const list = $("#stepList");
    list.innerHTML = "";
    STEPS.forEach((st, i) => {
      const chips = st.ings.map(name => {
        const g = INGREDIENTS.find(x=>x.name===name); if(!g) return "";
        const q = shortQty(g);
        return `<span class="step-ing">${g.name.split(",")[0]}${q?` <span class="q">${q}</span>`:""}</span>`;
      }).join("");
      const wrap = document.createElement("div");
      wrap.className = "step";
      wrap.innerHTML = `
        <div class="node" title="Marquer comme fait">${i+1}</div>
        <div class="sc">
          <div class="stxt">${st.text}</div>
          <div class="sfoot">
            <span class="durchip"><i data-lucide="clock" class="lic"></i> ${st.dur} min</span>
            ${chips}
          </div>
        </div>`;
      wrap.querySelector(".node").addEventListener("click", () => wrap.classList.toggle("done"));
      list.appendChild(wrap);
    });
    lucide.createIcons({ attrs:{ "stroke-width":1.9 } });
  }

  function setServ(n){
    serv = Math.max(1, Math.min(20, n));
    $("#servN").textContent = serv;
    $("#servDisplay").innerHTML = serv + '<span class="u">pers.</span>';
    // re-render ingredient quantities but keep checked state
    const done = [...document.querySelectorAll(".ing")].map(el => el.classList.contains("done"));
    renderIngredients();
    document.querySelectorAll(".ing").forEach((el,i)=>{ if(done[i]) el.classList.add("done"); });
    renderSteps();
    updateIngCount();
  }

  function toast(msg){
    const t = $("#toast"); $("#toastMsg").textContent = msg;
    t.classList.add("show"); clearTimeout(t._t); t._t = setTimeout(()=>t.classList.remove("show"), 2600);
  }

  $("#servPlus").addEventListener("click", ()=>setServ(serv+1));
  $("#servMinus").addEventListener("click", ()=>setServ(serv-1));
  $("#favBtn").addEventListener("click", e => { const b=e.currentTarget; b.classList.toggle("on"); toast(b.classList.contains("on")?"Ajoutée aux favoris":"Retirée des favoris"); });
  $("#shopBtn").addEventListener("click", ()=>{
    const missing = INGREDIENTS.length - document.querySelectorAll(".ing.done").length;
    toast(`${missing} ingrédient(s) ajouté(s) à la liste de courses`);
  });
  $("#cookBtn").addEventListener("click", ()=>toast("Mode cuisson · à brancher"));
  $("#editBtn").addEventListener("click", ()=>toast("Ouverture de l'édition · à brancher"));

  renderIngredients();
  renderSteps();
  updateIngCount();
  lucide.createIcons({ attrs:{ "stroke-width":1.9 } });
})();
</script>
</body>
</html>
