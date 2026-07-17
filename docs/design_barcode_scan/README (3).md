<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Liste de Courses — Scan code-barres (Mobile)</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  :root {
    --bg: #fdf8ed;
    --card: #ffffff;
    --sub: #f6efde;
    --ink: #1a1d1a;
    --ink-2: #5e6760;
    --ink-3: #9ba59f;
    --rule: #ece4d2;
    --green: #2bb673;
    --green-soft: #d6f3e3;
    --green-deep: #1f9c5e;
    --orange: #ff7a3a;
    --orange-soft: #ffe0cc;
    --red: #ef4a5a;
    --red-soft: #ffd9de;
    --yellow: #ffc839;
    --yellow-soft: #fff1c4;
    --blue: #4f8ef5;
    --blue-soft: #dae9ff;
    --pink: #ff6f9c;
    --pink-soft: #ffd9e6;
    --purple: #8c6df0;
    --purple-soft: #e4dafa;
    --font-display: "DM Sans", system-ui, sans-serif;
    --font-body: "Inter", ui-sans-serif, system-ui, sans-serif;
    --bezel: #1a1d1a;
    --bezel-2: #3a3d3a;
    --island: #1a1d1a;
    --bg-page: #e9e0cd;
  }
  * , *::before, *::after { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    background:
      radial-gradient(1200px 700px at 50% -10%, #f2ead7 0%, var(--bg-page) 60%);
    color: var(--ink);
    font-family: var(--font-body);
    font-size: 14px;
    -webkit-font-smoothing: antialiased;
    min-height: 100vh;
    display: flex; flex-direction: column; align-items: center;
    padding: 40px 20px 64px;
  }

  /* ── Header / legend ───────────────────────────── */
  .doc-head { max-width: 620px; text-align: center; margin-bottom: 30px; }
  .doc-head .eyebrow {
    display: inline-block; background: var(--green-soft); color: var(--green-deep);
    padding: 6px 14px; border-radius: 999px;
    font-family: var(--font-display); font-size: 11.5px; font-weight: 700;
    letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 16px;
  }
  .doc-head h1 {
    font-family: var(--font-display); font-weight: 800; font-size: 34px;
    letter-spacing: -0.035em; margin: 0 0 12px; line-height: 1.05;
  }
  .doc-head h1 em { font-style: normal; color: var(--green);
    background: linear-gradient(180deg, transparent 62%, var(--green-soft) 62%); padding: 0 4px; }
  .doc-head p { color: var(--ink-2); font-size: 15px; line-height: 1.55; margin: 0 auto; max-width: 520px; }

  .legend {
    display: flex; gap: 8px; flex-wrap: wrap; justify-content: center;
    margin-top: 20px;
  }
  .legend .chip {
    display: inline-flex; align-items: center; gap: 7px;
    background: var(--card); border: 1px solid var(--rule);
    padding: 8px 13px; border-radius: 999px;
    font-family: var(--font-display); font-weight: 600; font-size: 12px; color: var(--ink-2);
    box-shadow: 0 2px 6px rgba(0,0,0,.03);
  }
  .legend .chip b { color: var(--ink); font-weight: 700; }
  .legend .dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }

  /* ── PHONE ─────────────────────────────────────── */
  .phone {
    width: 390px;
    background: var(--bg);
    border-radius: 46px;
    padding: 8px;
    box-shadow:
      0 0 0 11px var(--bezel),
      0 0 0 12px var(--bezel-2),
      0 40px 80px -28px rgba(0,0,0,.45),
      0 24px 48px -30px rgba(0,0,0,.30);
    position: relative;
  }
  .scr {
    background: var(--bg);
    border-radius: 38px;
    overflow: hidden;
    position: relative;
    height: 844px;
    display: flex; flex-direction: column;
  }

  /* status bar */
  .statusbar {
    height: 50px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 28px;
    font-family: var(--font-display); font-size: 15px; font-weight: 700; color: var(--ink);
    position: relative; z-index: 5;
  }
  .statusbar .ind { display: flex; gap: 6px; align-items: center; }
  .statusbar::after {
    content: ""; position: absolute; top: 10px; left: 50%; transform: translateX(-50%);
    width: 92px; height: 30px; border-radius: 999px; background: var(--island);
  }

  /* nav */
  .nav {
    display: flex; align-items: center; gap: 12px;
    padding: 4px 20px 12px; background: var(--bg); flex-shrink: 0;
  }
  .nav .title-wrap { flex: 1; min-width: 0; }
  .nav .title {
    font-family: var(--font-display); font-weight: 800; font-size: 21px; line-height: 1.1;
    letter-spacing: -0.03em; display: flex; align-items: center; gap: 8px;
  }
  .nav .sub { font-size: 12px; color: var(--ink-2); margin-top: 3px;
    display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
  .sync-chip {
    display: inline-flex; align-items: center; gap: 5px;
    background: var(--green-soft); color: var(--green-deep);
    padding: 2px 8px; border-radius: 999px; font-weight: 700; font-size: 10.5px;
    font-family: var(--font-display);
  }
  .sync-chip .live { width: 6px; height: 6px; border-radius: 50%; background: var(--green-deep);
    animation: pulse 1.8s ease-in-out infinite; }
  @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.35;transform:scale(.7)} }

  /* body scroll */
  .body {
    flex: 1; overflow-y: auto; padding: 4px 18px 28px;
    scrollbar-width: none;
  }
  .body::-webkit-scrollbar { display: none; }

  /* collab banner */
  .collab {
    display: flex; align-items: center; gap: 10px;
    background: linear-gradient(180deg, #eef9f1 0%, var(--card) 100%);
    border: 1px solid var(--green-soft);
    border-radius: 16px; padding: 10px 13px; margin-bottom: 14px;
  }
  .collab .av {
    width: 30px; height: 30px; border-radius: 50%; flex-shrink: 0;
    background: var(--pink); color: #fff; font-family: var(--font-display);
    font-weight: 700; font-size: 12px;
    display: flex; align-items: center; justify-content: center;
  }
  .collab .t { font-size: 12px; color: var(--ink-2); line-height: 1.3; }
  .collab .t b { color: var(--ink); font-family: var(--font-display); font-weight: 700; }

  .add-btn {
    appearance: none; border: 0; cursor: pointer; width: 100%;
    background: var(--green); color: #fff;
    font-family: var(--font-display); font-weight: 700; font-size: 14.5px;
    border-radius: 999px; padding: 13px; margin-bottom: 18px;
    display: flex; align-items: center; justify-content: center; gap: 8px;
    box-shadow: 0 6px 16px rgba(43,182,115,.30);
  }
  .add-btn span { font-size: 19px; line-height: 0; }

  /* section header */
  .sect { margin-bottom: 6px; }
  .sect-h {
    display: flex; align-items: center; gap: 9px;
    padding: 6px 2px 12px;
  }
  .sect-h .ic {
    width: 30px; height: 30px; border-radius: 9px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center; font-size: 15px;
  }
  .sect-h.buy .ic { background: var(--sub); }
  .sect-h.stow .ic { background: var(--green-soft); }
  .sect-h .ttl {
    font-family: var(--font-display); font-weight: 800; font-size: 17px; letter-spacing: -0.02em;
  }
  .sect-h .ct { font-size: 12px; color: var(--ink-3); font-weight: 600; margin-top: 1px; }
  .sect-h .stow-all {
    margin-left: auto; appearance: none; border: 0; cursor: pointer;
    background: var(--green-deep); color: #fff;
    font-family: var(--font-display); font-weight: 700; font-size: 12.5px;
    padding: 9px 14px; border-radius: 999px;
    display: inline-flex; align-items: center; gap: 6px;
    box-shadow: 0 4px 10px rgba(31,156,94,.28);
  }

  /* divider between sections */
  .divider {
    height: 1px; background: var(--rule); margin: 8px 2px 18px;
    position: relative;
  }
  .stow-wrap {
    background: rgba(43,182,115,.05);
    border: 1px solid var(--green-soft);
    border-radius: 22px; padding: 14px 12px 6px; margin-top: 8px;
  }

  /* rayon header */
  .rayon {
    display: flex; align-items: center; gap: 7px;
    padding: 14px 6px 8px; font-family: var(--font-display);
    font-weight: 700; font-size: 12px; color: var(--ink-2);
    text-transform: uppercase; letter-spacing: 0.04em;
  }
  .rayon:first-child { padding-top: 4px; }
  .rayon .cn { margin-left: auto; color: var(--ink-3); font-size: 10.5px; letter-spacing: 0; text-transform: none; }

  /* product row */
  .prod {
    background: var(--card); border-radius: 16px;
    padding: 11px 12px; display: flex; gap: 11px; align-items: center;
    box-shadow: 0 1px 2px rgba(0,0,0,.03), 0 3px 10px rgba(0,0,0,.035);
    margin-bottom: 8px;
    transition: transform .28s cubic-bezier(.4,1.3,.5,1), opacity .26s ease, box-shadow .2s;
    will-change: transform, opacity;
  }
  .prod.leaving { transform: translateX(60px); opacity: 0; }
  .prod.entering { animation: dropin .42s cubic-bezier(.34,1.4,.5,1) both; }
  @keyframes dropin {
    0% { transform: translateY(-10px) scale(.97); opacity: 0; }
    100% { transform: translateY(0) scale(1); opacity: 1; }
  }
  .prod .chk {
    width: 26px; height: 26px; border-radius: 50%; flex-shrink: 0;
    border: 2px solid var(--rule); background: var(--card); cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    color: #fff; transition: background .15s, border-color .15s, transform .12s;
  }
  .prod .chk:active { transform: scale(.85); }
  .prod.done .chk { background: var(--green); border-color: var(--green); }
  .prod .chk svg { width: 14px; height: 14px; opacity: 0; transition: opacity .15s; }
  .prod.done .chk svg { opacity: 1; }
  .prod .thumb {
    width: 44px; height: 44px; border-radius: 12px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center; font-size: 22px;
  }
  .prod .info { flex: 1; min-width: 0; }
  .prod .nm {
    font-family: var(--font-display); font-weight: 700; font-size: 14.5px; color: var(--ink);
    line-height: 1.15; display: flex; align-items: center; gap: 7px; flex-wrap: wrap;
  }
  .prod.done .nm .lbl { text-decoration: line-through; color: var(--ink-3); }
  .prod .meta { font-size: 11.5px; color: var(--ink-2); margin-top: 3px; }
  .prod .acts { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }
  .prod .ib {
    width: 30px; height: 30px; border-radius: 9px; cursor: pointer;
    display: flex; align-items: center; justify-content: center; color: var(--ink-3);
    background: transparent; border: 0; transition: background .15s, color .15s;
  }
  .prod .ib svg { width: 16px; height: 16px; }
  .prod .ib:hover { background: var(--sub); color: var(--ink-2); }
  .prod .ib.del:hover { background: var(--red-soft); color: var(--red); }
  .prod .ib.back:hover { background: var(--green-soft); color: var(--green-deep); }

  /* stow row tappable */
  .prod.stow-row { cursor: pointer; }
  .prod.stow-row:hover { box-shadow: 0 1px 2px rgba(0,0,0,.03), 0 6px 16px rgba(0,0,0,.07); }
  .prod.stow-row .chk { background: var(--green); border-color: var(--green); cursor: default; }
  .prod.stow-row .chk svg { opacity: 1; }
  .prod .go {
    width: 26px; height: 26px; border-radius: 8px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center; color: var(--green-deep);
  }
  .prod .go svg { width: 17px; height: 17px; }

  /* empty states */
  .empty {
    background: var(--card); border-radius: 22px;
    padding: 40px 24px; text-align: center; margin-top: 10px;
    box-shadow: 0 1px 2px rgba(0,0,0,.03), 0 4px 12px rgba(0,0,0,.04);
  }
  .empty .ic { font-size: 46px; margin-bottom: 12px; }
  .empty .ttl { font-family: var(--font-display); font-weight: 800; font-size: 17px; }
  .empty .txt { font-size: 13px; color: var(--ink-2); margin-top: 7px; line-height: 1.5; max-width: 250px; margin-left: auto; margin-right: auto; }
  .empty .cta {
    margin-top: 18px; appearance: none; border: 0; cursor: pointer;
    background: var(--green); color: #fff; font-family: var(--font-display); font-weight: 700;
    font-size: 13.5px; padding: 11px 20px; border-radius: 999px;
    display: inline-flex; align-items: center; gap: 7px;
  }
  .done-banner {
    background: linear-gradient(135deg, var(--green) 0%, var(--green-deep) 100%);
    border-radius: 22px; padding: 26px 22px; text-align: center; color: #fff;
    box-shadow: 0 12px 28px rgba(43,182,115,.35); margin-top: 8px;
  }
  .done-banner .ic { font-size: 42px; margin-bottom: 8px; }
  .done-banner .ttl { font-family: var(--font-display); font-weight: 800; font-size: 19px; }
  .done-banner .txt { font-size: 13px; opacity: .92; margin-top: 5px; }

  /* tabbar */
  .tabbar {
    background: var(--card); border-top: 1px solid var(--rule); flex-shrink: 0;
    padding: 10px 8px 26px; display: grid; grid-template-columns: repeat(5,1fr); gap: 4px;
  }
  .tabbar .tab {
    display: flex; flex-direction: column; align-items: center; gap: 3px;
    padding: 7px 0; color: var(--ink-3); border-radius: 14px;
  }
  .tabbar .tab svg { width: 21px; height: 21px; }
  .tabbar .tab.active { background: var(--green-soft); color: var(--green-deep); }
  .tabbar .tab .lbl { font-family: var(--font-display); font-size: 10px; font-weight: 600; }
  .tabbar .tab .badge {
    position: absolute; transform: translate(14px,-4px);
    background: var(--red); color: #fff; font-size: 9px; font-weight: 700;
    min-width: 15px; height: 15px; border-radius: 999px; padding: 0 3px;
    display: flex; align-items: center; justify-content: center; border: 2px solid var(--card);
  }
  .tabbar .tab .wrap { position: relative; display: flex; }

  /* ── bottom sheet (assistant) ──────────────────── */
  .sheet-scrim {
    position: absolute; inset: 0; z-index: 30;
    background: rgba(20,22,20,.42); opacity: 0; pointer-events: none;
    transition: opacity .26s ease; border-radius: 38px;
  }
  .sheet-scrim.open { opacity: 1; pointer-events: auto; }
  .sheet {
    position: absolute; left: 0; right: 0; bottom: 0; z-index: 31;
    background: var(--bg); border-radius: 28px 28px 38px 38px;
    padding: 10px 20px 30px; transform: translateY(110%);
    transition: transform .34s cubic-bezier(.32,1.1,.4,1);
    box-shadow: 0 -16px 40px rgba(0,0,0,.18);
    max-height: 90%; overflow-y: auto; scrollbar-width: none;
  }
  .sheet::-webkit-scrollbar { display: none; }
  .sheet.open { transform: translateY(0); }
  .grab { width: 40px; height: 5px; border-radius: 999px; background: var(--rule); margin: 0 auto 14px; }
  .sheet .prog {
    font-family: var(--font-display); font-weight: 700; font-size: 11px;
    color: var(--green-deep); letter-spacing: 0.05em; text-transform: uppercase;
  }
  .sheet .a-item {
    display: flex; align-items: center; gap: 12px; margin: 10px 0 20px;
    background: var(--card); border-radius: 16px; padding: 12px 14px;
    box-shadow: 0 1px 2px rgba(0,0,0,.03);
  }
  .sheet .a-item .thumb {
    width: 46px; height: 46px; border-radius: 13px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center; font-size: 24px;
  }
  .sheet .a-item .nm { font-family: var(--font-display); font-weight: 800; font-size: 17px; letter-spacing: -0.02em; }
  .sheet .a-item .meta { font-size: 12px; color: var(--ink-2); margin-top: 2px; }
  .sheet .fl { font-family: var(--font-display); font-weight: 700; font-size: 13px;
    margin: 0 2px 10px; display: flex; align-items: center; gap: 7px; }
  .sheet .fl .step-n {
    width: 19px; height: 19px; border-radius: 50%; background: var(--ink); color: var(--bg);
    font-size: 10.5px; display: flex; align-items: center; justify-content: center;
  }
  .opt-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; margin-bottom: 22px; }
  .opt {
    appearance: none; cursor: pointer; text-align: left;
    background: var(--card); border: 1.5px solid var(--rule); border-radius: 14px;
    padding: 13px 14px; display: flex; align-items: center; gap: 10px;
    font-family: var(--font-display); font-weight: 600; font-size: 13.5px; color: var(--ink);
    transition: border-color .15s, background .15s;
  }
  .opt .e { font-size: 20px; }
  .opt.sel { border-color: var(--green); background: var(--green-soft); color: var(--green-deep); }
  .chip-row { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 24px; }
  .dchip {
    appearance: none; cursor: pointer;
    background: var(--card); border: 1.5px solid var(--rule); border-radius: 999px;
    padding: 9px 15px; font-family: var(--font-display); font-weight: 600; font-size: 13px; color: var(--ink-2);
    transition: border-color .15s, background .15s, color .15s;
  }
  .dchip.sel { border-color: var(--green); background: var(--green-soft); color: var(--green-deep); }
  .sheet .actions { display: flex; gap: 10px; }
  .sheet .actions button {
    flex: 1; appearance: none; border: 0; cursor: pointer;
    font-family: var(--font-display); font-weight: 700; font-size: 14.5px;
    border-radius: 999px; padding: 14px; display: inline-flex; align-items: center; justify-content: center; gap: 7px;
  }
  .sheet .actions .secondary { flex: 0 0 auto; background: var(--sub); color: var(--ink-2); padding: 14px 18px; }
  .sheet .actions .primary { background: var(--green); color: #fff; box-shadow: 0 6px 16px rgba(43,182,115,.3); }

  /* toast */
  .toast {
    position: absolute; left: 50%; bottom: 96px; transform: translate(-50%, 20px);
    z-index: 40; background: var(--ink); color: #fff;
    font-family: var(--font-display); font-weight: 600; font-size: 13px;
    padding: 11px 18px; border-radius: 999px; opacity: 0; pointer-events: none;
    transition: opacity .25s, transform .25s; display: flex; align-items: center; gap: 8px;
    box-shadow: 0 10px 30px rgba(0,0,0,.3); white-space: nowrap;
  }
  .toast.show { opacity: 1; transform: translate(-50%, 0); }
  .toast .e { color: var(--green); }

  /* confirm dialog */
  .confirm {
    position: absolute; inset: 0; z-index: 50; display: flex; align-items: center; justify-content: center;
    padding: 28px; background: rgba(20,22,20,.42); opacity: 0; pointer-events: none;
    transition: opacity .2s; border-radius: 38px;
  }
  .confirm.open { opacity: 1; pointer-events: auto; }
  .confirm .box {
    background: var(--bg); border-radius: 22px; padding: 24px 22px; text-align: center;
    transform: scale(.94); transition: transform .2s;
  }
  .confirm.open .box { transform: scale(1); }
  .confirm .ttl { font-family: var(--font-display); font-weight: 800; font-size: 17px; }
  .confirm .txt { font-size: 13px; color: var(--ink-2); margin-top: 8px; line-height: 1.5; }
  .confirm .row { display: flex; gap: 10px; margin-top: 20px; }
  .confirm .row button { flex: 1; appearance: none; border: 0; cursor: pointer;
    font-family: var(--font-display); font-weight: 700; font-size: 14px; border-radius: 999px; padding: 12px; }
  .confirm .row .cancel { background: var(--sub); color: var(--ink); }
  .confirm .row .ok { background: var(--red); color: #fff; }

  /* ── action row (ajouter + scan) ── */
  .action-row { display: flex; gap: 9px; margin-bottom: 18px; }
  .action-row .add-btn { margin-bottom: 0; flex: 1; }
  .scan-btn { appearance:none; border:0; cursor:pointer; flex:0 0 auto; width:52px; border-radius:999px; background:var(--card); color:var(--ink); box-shadow:0 1px 2px rgba(0,0,0,.05),0 4px 12px rgba(0,0,0,.06); display:flex; align-items:center; justify-content:center; transition:transform .12s; }
  .scan-btn:active { transform: scale(.94); }

  /* ── scanner overlay ── */
  .scan-overlay { position:absolute; inset:0; z-index:60; border-radius:38px; overflow:hidden; opacity:0; pointer-events:none; transition:opacity .28s; }
  .scan-overlay.open { opacity:1; pointer-events:auto; }
  .scan-cam, .scan-perm, .scan-refused { position:absolute; inset:0; display:none; flex-direction:column; }
  .scan-cam.on, .scan-perm.on, .scan-refused.on { display:flex; }
  .scan-cam { background: radial-gradient(120% 80% at 50% 30%, #2b2f33 0%, #141618 70%, #0b0c0d 100%); color:#fff; }
  .scan-top { display:flex; align-items:center; justify-content:space-between; padding:52px 18px 8px; }
  .scan-top .scan-title { font-family:var(--font-display); font-weight:700; font-size:14px; color:#fff; }
  .scan-torch { appearance:none; border:0; cursor:pointer; width:40px; height:40px; border-radius:50%; background:rgba(255,255,255,.14); color:#fff; display:flex; align-items:center; justify-content:center; }
  .scan-torch.on { background:var(--yellow); color:#3a2e00; }
  .scan-done { appearance:none; border:0; cursor:pointer; background:rgba(255,255,255,.16); color:#fff; font-family:var(--font-display); font-weight:700; font-size:13.5px; padding:9px 16px; border-radius:999px; }
  .scan-view { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:18px; position:relative; }
  .scan-frame { width:250px; height:158px; border-radius:20px; position:relative; box-shadow:0 0 0 2000px rgba(10,11,13,.36); }
  .scan-frame .cnr { position:absolute; width:30px; height:30px; border:3px solid var(--green); }
  .scan-frame .cnr.tl { top:-2px; left:-2px; border-right:0; border-bottom:0; border-radius:14px 0 0 0; }
  .scan-frame .cnr.tr { top:-2px; right:-2px; border-left:0; border-bottom:0; border-radius:0 14px 0 0; }
  .scan-frame .cnr.bl { bottom:-2px; left:-2px; border-right:0; border-top:0; border-radius:0 0 0 14px; }
  .scan-frame .cnr.br { bottom:-2px; right:-2px; border-left:0; border-top:0; border-radius:0 0 14px 0; }
  .scan-line { position:absolute; left:10px; right:10px; height:2px; background:linear-gradient(90deg, transparent, var(--green), transparent); box-shadow:0 0 12px var(--green); top:14px; animation: scanmove 2.2s ease-in-out infinite; }
  @keyframes scanmove { 0%,100%{ top:14px } 50%{ top:142px } }
  .scan-hint { font-family:var(--font-display); font-weight:600; font-size:13px; color:rgba(255,255,255,.85); background:rgba(0,0,0,.3); padding:7px 14px; border-radius:999px; }
  .scan-sim { background:rgba(255,255,255,.06); border-top:1px solid rgba(255,255,255,.1); padding:12px 14px 26px; }
  .scan-sim-h { display:flex; align-items:center; gap:7px; font-family:var(--font-display); font-weight:600; font-size:10.5px; color:rgba(255,255,255,.6); text-transform:uppercase; letter-spacing:.04em; margin-bottom:10px; }
  .scan-net { margin-left:auto; appearance:none; border:0; cursor:pointer; display:inline-flex; align-items:center; gap:5px; background:rgba(255,255,255,.12); color:#fff; font-family:var(--font-display); font-weight:700; font-size:10.5px; padding:5px 10px; border-radius:999px; text-transform:none; letter-spacing:0; }
  .scan-net.off { background:var(--orange); color:#3a1c00; }
  .scan-shelf { display:flex; gap:9px; overflow-x:auto; scrollbar-width:none; padding-bottom:2px; }
  .scan-shelf::-webkit-scrollbar { display:none; }
  .scan-chip { flex:0 0 auto; width:132px; appearance:none; border:0; cursor:pointer; text-align:left; background:rgba(255,255,255,.1); border-radius:14px; padding:10px; color:#fff; display:flex; align-items:center; gap:9px; transition:transform .12s; }
  .scan-chip:active { transform: scale(.96); }
  .scan-chip .th { width:34px; height:34px; border-radius:10px; flex-shrink:0; display:flex; align-items:center; justify-content:center; }
  .scan-chip .cl { font-family:var(--font-display); font-weight:700; font-size:12px; line-height:1.15; }
  .scan-chip .ch { font-size:9.5px; color:rgba(255,255,255,.6); line-height:1.2; margin-top:2px; }
  .scan-flash { position:absolute; inset:0; background:var(--green); opacity:0; pointer-events:none; }
  .scan-flash.go { animation: flashfade .5s ease; }
  @keyframes flashfade { 0%{opacity:.28} 100%{opacity:0} }
  .scan-toast { position:absolute; left:16px; right:16px; bottom:158px; z-index:5; background:rgba(20,22,20,.94); color:#fff; border-radius:14px; padding:12px 14px; display:flex; align-items:center; gap:11px; font-family:var(--font-display); font-weight:600; font-size:13.5px; box-shadow:0 12px 30px rgba(0,0,0,.4); opacity:0; transform:translateY(12px); pointer-events:none; transition:opacity .25s, transform .25s; }
  .scan-toast.show { opacity:1; transform:translateY(0); }
  .scan-toast .te { width:30px; height:30px; border-radius:8px; background:var(--green); color:#fff; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .scan-toast .te.info { background:var(--blue); }
  .scan-toast .te.warn { background:var(--orange); }
  .scan-perm, .scan-refused { background: radial-gradient(120% 80% at 50% 20%, #22262a 0%, #131517 75%); color:#fff; align-items:center; justify-content:center; padding:34px 30px; text-align:center; }
  .scan-card-ic { width:66px; height:66px; border-radius:20px; display:flex; align-items:center; justify-content:center; margin-bottom:20px; background:rgba(43,182,115,.18); color:var(--green); }
  .scan-refused .scan-card-ic { background:rgba(239,74,90,.18); color:var(--red); }
  .scan-perm h2, .scan-refused h2 { font-family:var(--font-display); font-weight:800; font-size:20px; margin:0 0 12px; letter-spacing:-.02em; }
  .scan-perm p, .scan-refused p { font-size:13.5px; line-height:1.55; color:rgba(255,255,255,.72); margin:0 0 26px; max-width:280px; }
  .scan-perm .pbtn, .scan-refused .pbtn { appearance:none; border:0; cursor:pointer; width:100%; max-width:280px; font-family:var(--font-display); font-weight:700; font-size:15px; border-radius:999px; padding:15px; display:flex; align-items:center; justify-content:center; gap:8px; }
  .scan-perm .pbtn.primary, .scan-refused .pbtn.primary { background:var(--green); color:#fff; box-shadow:0 8px 20px rgba(43,182,115,.35); }
  .scan-perm .pbtn.ghost, .scan-refused .pbtn.ghost { background:transparent; color:rgba(255,255,255,.7); margin-top:4px; }
  .scan-perm .plink { margin-top:14px; background:none; border:0; cursor:pointer; color:rgba(255,255,255,.4); font-family:var(--font-display); font-size:12px; text-decoration:underline; }
  .scan-priv { display:inline-flex; align-items:center; gap:6px; font-size:11.5px; color:rgba(255,255,255,.5); margin-top:18px; }
  .scan-result-scrim { position:absolute; inset:0; z-index:8; background:rgba(8,9,10,.5); opacity:0; pointer-events:none; transition:opacity .24s; }
  .scan-result-scrim.open { opacity:1; pointer-events:auto; }
  .scan-result { position:absolute; left:0; right:0; bottom:0; z-index:9; background:var(--bg); border-radius:26px 26px 38px 38px; padding:12px 20px 30px; transform:translateY(110%); transition:transform .32s cubic-bezier(.32,1.1,.4,1); max-height:88%; overflow-y:auto; scrollbar-width:none; }
  .scan-result::-webkit-scrollbar { display:none; }
  .scan-result.open { transform:translateY(0); }
  .scan-result .grab { width:40px; height:5px; border-radius:999px; background:var(--rule); margin:0 auto 14px; }
  .scan-result .r-eyebrow { display:inline-flex; align-items:center; gap:6px; font-family:var(--font-display); font-weight:700; font-size:10.5px; text-transform:uppercase; letter-spacing:.06em; padding:5px 10px; border-radius:999px; margin-bottom:12px; }
  .scan-result h3 { font-family:var(--font-display); font-weight:800; font-size:19px; letter-spacing:-.02em; margin:0 0 6px; }
  .scan-result .r-txt { font-size:13.5px; color:var(--ink-2); line-height:1.5; margin:0 0 18px; }
  .scan-prev { display:flex; align-items:center; gap:13px; background:var(--card); border:1px solid var(--rule); border-radius:16px; padding:12px 14px; margin-bottom:18px; }
  .scan-prev .th { width:52px; height:52px; border-radius:14px; flex-shrink:0; display:flex; align-items:center; justify-content:center; }
  .scan-prev .nm { font-family:var(--font-display); font-weight:800; font-size:16px; }
  .scan-prev .mt { font-size:12px; color:var(--ink-2); margin-top:2px; }
  .scan-prev .off-img { margin-left:auto; width:56px; height:56px; border-radius:12px; background:var(--sub); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; color:var(--ink-3); flex-shrink:0; }
  .scan-prev .off-img span { font-size:8px; font-weight:700; font-family:var(--font-display); }
  .scan-field { margin-bottom:14px; }
  .scan-field .lb { font-family:var(--font-display); font-weight:700; font-size:12px; color:var(--ink-2); margin-bottom:7px; display:block; }
  .scan-input { width:100%; box-sizing:border-box; font-family:var(--font-body); font-size:14.5px; color:var(--ink); background:var(--card); border:1.5px solid var(--rule); border-radius:12px; padding:12px 14px; }
  .scan-input:focus { outline:0; border-color:var(--green); }
  .scan-picks { display:flex; gap:7px; flex-wrap:wrap; }
  .scan-pick { appearance:none; border:1.5px solid var(--rule); cursor:pointer; background:var(--card); border-radius:999px; padding:8px 13px; font-family:var(--font-display); font-weight:600; font-size:12.5px; color:var(--ink-2); display:inline-flex; align-items:center; gap:6px; }
  .scan-pick.sel { border-color:var(--green); background:var(--green-soft); color:var(--green-deep); }
  .scan-map-note { display:flex; align-items:center; gap:8px; background:var(--green-soft); color:var(--green-deep); border-radius:12px; padding:10px 12px; font-size:12px; font-weight:600; font-family:var(--font-display); margin:4px 0 16px; line-height:1.35; }
  .scan-r-actions { display:flex; gap:10px; margin-top:4px; }
  .scan-r-actions button { flex:1; appearance:none; border:0; cursor:pointer; font-family:var(--font-display); font-weight:700; font-size:14.5px; border-radius:999px; padding:14px; display:inline-flex; align-items:center; justify-content:center; gap:7px; }
  .scan-r-actions .sec { flex:0 0 auto; background:var(--sub); color:var(--ink-2); padding:14px 18px; }
  .scan-r-actions .pri { background:var(--green); color:#fff; box-shadow:0 6px 16px rgba(43,182,115,.3); }

  /* reset */
  .reset {
    margin-top: 26px; appearance: none; cursor: pointer;
    background: var(--card); border: 1px solid var(--rule); color: var(--ink-2);
    font-family: var(--font-display); font-weight: 600; font-size: 12.5px;
    padding: 9px 16px; border-radius: 999px;
    display: inline-flex; align-items: center; gap: 7px;
  }
</style>
</head>
<body>

  <div class="doc-head">
    <span class="eyebrow">Liste de courses · Scan code-barres</span>
    <h1>Scanner un <em>code-barres</em> dans les courses</h1>
    <p>En magasin ou au déballage, on scanne un article : s'il est « à acheter » il bascule vers « à ranger », s'il est déjà là l'assistant guidé s'ouvre, et un produit hors-liste peut être ajouté ou créé via Open Food Facts. Touche le bouton scan puis un produit du simulateur.</p>
    <div class="legend">
      <span class="chip"><span class="dot" style="background:var(--green);"></span>Scan d'un article <b>à acheter</b> → à ranger</span>
      <span class="chip"><span class="dot" style="background:var(--blue);"></span>Hors liste <b>→ ajout / création</b></span>
      <span class="chip"><span class="dot" style="background:var(--orange);"></span>Mode <b>scan continu</b></span>
    </div>
  </div>

  <div class="phone">
    <div class="scr" data-screen-label="Liste de courses">
      <div class="statusbar">
        <span>9:41</span>
        <span class="ind">
          <svg width="18" height="11" viewBox="0 0 18 11" fill="currentColor"><path d="M0 8h2v3H0zM4 6h2v5H4zM8 4h2v7H8zM12 2h2v9h-2zM16 0h2v11h-2z"/></svg>
          <svg width="16" height="11" viewBox="0 0 16 11" fill="none" stroke="currentColor" stroke-width="1"><path d="M8 3a8 8 0 0 1 5.5 2.2M8 6a5 5 0 0 1 3.5 1.4M8 9.5a1 1 0 0 1 .8.4"/></svg>
          <svg width="26" height="12" viewBox="0 0 26 12" fill="none"><rect x="1" y="1" width="20" height="10" rx="2.5" stroke="currentColor" stroke-width="1"/><rect x="2.5" y="2.5" width="17" height="7" rx="1.5" fill="currentColor"/><rect x="22" y="4" width="2" height="4" rx="0.7" fill="currentColor"/></svg>
        </span>
      </div>

      <div class="nav">
        <div class="title-wrap">
          <div class="title">Liste de courses</div>
          <div class="sub" id="navSub"></div>
        </div>
      </div>

      <div class="body" id="body"></div>

      <div class="tabbar">
        <div class="tab"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12 12 3l9 9v9a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/></svg><span class="lbl">Accueil</span></div>
        <div class="tab"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="7" r="3"/><circle cx="17" cy="11" r="3"/><circle cx="9" cy="16" r="3"/></svg><span class="lbl">Stock</span></div>
        <div class="tab active"><span class="wrap"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 4h2l2 11h12l2-7H7"/><circle cx="9" cy="20" r="1.5"/><circle cx="17" cy="20" r="1.5"/></svg><span class="badge" id="tabBadge"></span></span><span class="lbl">Courses</span></div>
        <div class="tab"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 5a2 2 0 0 1 2-2h6v18H5a2 2 0 0 1-2-2zM21 5a2 2 0 0 0-2-2h-6v18h6a2 2 0 0 0 2-2z"/></svg><span class="lbl">Recettes</span></div>
        <div class="tab"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg><span class="lbl">Plus</span></div>
      </div>

      <!-- scanner code-barres -->
      <div class="scan-overlay" id="scanOverlay"></div>

      <!-- toast -->
      <div class="toast" id="toast"></div>

      <!-- assistant bottom sheet -->
      <div class="sheet-scrim" id="scrim"></div>
      <div class="sheet" id="sheet"></div>

      <!-- confirm -->
      <div class="confirm" id="confirm">
        <div class="box">
          <div class="ttl">Supprimer cet article ?</div>
          <div class="txt" id="confirmTxt">Il ne sera ni rangé au stock ni gardé dans la liste.</div>
          <div class="row">
            <button class="cancel" id="confirmCancel">Annuler</button>
            <button class="ok" id="confirmOk">Supprimer</button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <button class="reset" id="reset">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>
    Réinitialiser la démo
  </button>

<script src="https://unpkg.com/lucide@0.460.0/dist/umd/lucide.min.js"></script>
<script src="scan-data.js"></script>
<script>
function lic(name, opts){ opts = opts || {}; const node = window.lucide && window.lucide.icons && window.lucide.icons[name]; const size = opts.size || 20; const color = opts.color || 'currentColor'; const sw = opts.sw || 1.9; let inner=''; if(node){ const ch = node[2] || []; inner = ch.map(function(c){ const at = c[1] || {}; const a = Object.keys(at).map(function(k){return k+'="'+at[k]+'"';}).join(' '); return '<'+c[0]+' '+a+'/>'; }).join(''); } return '<svg width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="'+color+'" stroke-width="'+sw+'" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;flex-shrink:0">'+inner+'</svg>'; }
const STROKE = {'var(--green-soft)':'#1f9c5e','var(--red-soft)':'#c83a48','var(--orange-soft)':'#d65a1f','var(--yellow-soft)':'#b88a14','var(--blue-soft)':'#3a72d9','var(--purple-soft)':'#6c50d0','var(--pink-soft)':'#d04475'};
const RAYONS = [
  { key:'legumes',   name:'Fruits et légumes',         ico:'Salad' },
  { key:'boucherie', name:'Boucherie · poissonnerie',  ico:'Beef' },
  { key:'cremerie',  name:'Crèmerie et frais',          ico:'Milk' },
  { key:'epicerie',  name:'Épicerie',                    ico:'Wheat' },
  { key:'boissons',  name:'Boissons et snacks',          ico:'Wine' },
];

const SEED = [
  { id:1,  name:'Oignon',           qty:'3',        emoji:'Salad', bg:'var(--green-soft)',  rayon:'legumes',   by:'vous' },
  { id:2,  name:'Ail',              qty:'2 gousses',emoji:'Salad', bg:'var(--green-soft)',  rayon:'legumes',   by:'vous' },
  { id:3,  name:'Céleri',           qty:'1',        emoji:'Salad', bg:'var(--green-soft)',  rayon:'legumes',   by:'vous' },
  { id:4,  name:'Tomates',          qty:'500 g',    emoji:'Apple', bg:'var(--red-soft)',    rayon:'legumes',   by:'Marie' },
  { id:5,  name:'Carottes',         qty:'7',        emoji:'Carrot', bg:'var(--orange-soft)', rayon:'legumes',   by:'vous' },
  { id:6,  name:'Bœuf haché',       qty:'600 g',    emoji:'Beef', bg:'var(--red-soft)',    rayon:'boucherie', by:'vous',  perish:true },
  { id:7,  name:'Pilon de poulet',  qty:'1 kg',     emoji:'Drumstick', bg:'var(--red-soft)',    rayon:'boucherie', by:'Marie', perish:true },
  { id:8,  name:'Fromage râpé',     qty:'70 g',     emoji:'Milk', bg:'var(--yellow-soft)', rayon:'cremerie',  by:'vous',  perish:true },
  { id:9,  name:'Lait',             qty:'1 L',      emoji:'Milk', bg:'var(--blue-soft)',   rayon:'cremerie',  by:'vous',  perish:true },
  { id:10, name:'Lasagnes',         qty:'1 paquet', emoji:'Wheat', bg:'var(--yellow-soft)', rayon:'epicerie',  by:'vous' },
  { id:11, name:'Chocolat noir',    qty:'100 g',    emoji:'Cookie', bg:'var(--orange-soft)', rayon:'boissons',  by:'vous' },
  { id:12, name:'Vin rouge',        qty:'1 btl',    emoji:'Wine', bg:'var(--purple-soft)', rayon:'boissons',  by:'Marie' },
];

const PILL = {
  legumes:{ico:'Salad',txt:'Légumes',cls:'green'}, boucherie:{ico:'Beef',txt:'Viandes',cls:'red'},
  cremerie:{ico:'Milk',txt:'Frais',cls:'blue'}, epicerie:{ico:'Wheat',txt:'Épicerie',cls:'yellow'},
  boissons:{ico:'Wine',txt:'Boissons',cls:'purple'},
};
const PILLBG = { green:'var(--green-soft)', red:'var(--red-soft)', blue:'var(--blue-soft)',
  yellow:'var(--yellow-soft)', purple:'var(--purple-soft)' };
const PILLFG = { green:'var(--green-deep)', red:'#b2333f', blue:'#1d4dab', yellow:'#8a6500', purple:'#5536c7' };

const LIEUX = [
  { key:'frigo',   e:'Refrigerator', label:'Réfrigérateur' },
  { key:'congel',  e:'Snowflake', label:'Congélateur' },
  { key:'placard', e:'Archive', label:'Placard' },
  { key:'corbeille',e:'Apple', label:'Corbeille' },
  { key:'cellier', e:'ShoppingBasket', label:'Cellier' },
  { key:'cave',    e:'Wine', label:'Cave' },
];
const DATES = [
  { key:'3j',  label:'+3 jours' },
  { key:'1s',  label:'+1 semaine' },
  { key:'2s',  label:'+2 semaines' },
  { key:'1m',  label:'+1 mois' },
  { key:'none',label:'Pas de date' },
];
// suggested storage by rayon
const SUGGEST = { legumes:'corbeille', boucherie:'frigo', cremerie:'frigo', epicerie:'placard', boissons:'cave' };

const KEY = 'fresh-courses-split-v1';
let items;
function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    if (raw && Array.isArray(raw.items)) { items = raw.items; return; }
  } catch(e) {}
  items = SEED.map(i => ({ ...i, state:'buy' }));
}
function save() { localStorage.setItem(KEY, JSON.stringify({ items })); }
load();

const $ = s => document.querySelector(s);
const body = $('#body');
let lastEntered = new Set();

function checkSvg() {
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M5 13l4 4L19 7"/></svg>';
}
function rowsByRayon(list) {
  const out = [];
  RAYONS.forEach(r => {
    const inR = list.filter(i => i.rayon === r.key);
    if (inR.length) out.push({ rayon:r, items:inR });
  });
  return out;
}

function render() {
  const buy = items.filter(i => i.state === 'buy');
  const stow = items.filter(i => i.state === 'stow');

  // nav sub + badge
  $('#navSub').innerHTML =
    `${buy.length} à acheter · ${stow.length} à ranger ` +
    `<span class="sync-chip"><span class="live"></span>Synchronisé</span>`;
  const badge = $('#tabBadge');
  if (buy.length + stow.length > 0) { badge.style.display='flex'; badge.textContent = buy.length + stow.length; }
  else badge.style.display='none';

  let html = '';

  // collab banner (V2 touch) — only while there are things in flight
  if (stow.length > 0) {
    html += `<div class="collab">
      <div class="av">M</div>
      <div class="t"><b>Marie</b> est en train de faire les courses — la liste se met à jour en direct.</div>
    </div>`;
  }

  html += `<div class="action-row">
    <button class="add-btn" data-add="1">${lic('Plus',{size:18})} Ajouter un article</button>
    <button class="scan-btn" data-scan="1" title="Scanner un code-barres">${lic('ScanBarcode',{size:22})}</button>
  </div>`;

  // fully empty
  if (buy.length === 0 && stow.length === 0) {
    html += `<div class="empty">
      <div class="ic">${lic('ShoppingCart',{size:44})}</div>
      <div class="ttl">Votre liste est vide</div>
      <div class="txt">Ajoutez des articles à acheter, ou laissez Fresh la remplir depuis vos recettes.</div>
      <div style="display:flex; gap:9px; justify-content:center; flex-wrap:wrap;">
        <button class="cta" data-add="1">${lic('Plus',{size:16})} Ajouter un article</button>
        <button class="cta" data-scan="1" style="background:var(--card);color:var(--ink);border:1px solid var(--rule);">${lic('ScanBarcode',{size:16})} Scanner</button>
      </div>
    </div>`;
    body.innerHTML = html;
    bind();
    return;
  }

  // everything bought & stowed handled above; if buy empty but stow exists → show only À ranger + hint
  // ── Section À acheter ──
  html += `<div class="sect">
    <div class="sect-h buy">
      <div class="ic">${lic('ShoppingCart',{size:22})}</div>
      <div><div class="ttl">À acheter</div><div class="ct">${buy.length} article${buy.length>1?'s':''}</div></div>
    </div>`;
  if (buy.length === 0) {
    html += `<div class="empty" style="padding:26px 22px;">
      <div class="ic" style="font-size:34px;">${lic('CircleCheck',{size:32,color:'#1f9c5e'})}</div>
      <div class="ttl" style="font-size:15px;">Tout est dans le panier&nbsp;!</div>
      <div class="txt">Il ne reste plus qu'à ranger.</div>
    </div>`;
  } else {
    rowsByRayon(buy).forEach(g => {
      const done = g.items.filter(i=>i._checked).length;
      html += `<div class="rayon">${lic(g.rayon.ico,{size:15})} ${g.rayon.name}<span class="cn">${done}/${g.items.length}</span></div>`;
      g.items.forEach(i => html += buyRow(i));
    });
  }
  html += `</div>`;

  // ── Section À ranger (only if items) ──
  if (stow.length > 0) {
    html += `<div class="divider"></div>`;
    html += `<div class="sect">
      <div class="sect-h stow">
        <div class="ic">${lic('Package',{size:22})}</div>
        <div><div class="ttl">À ranger</div><div class="ct">${stow.length} article${stow.length>1?'s':''} acheté${stow.length>1?'s':''}</div></div>
        <button class="stow-all" data-stowall="1">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 13l4 4L19 7"/></svg>
          Tout ranger
        </button>
      </div>
      <div class="stow-wrap">`;
    rowsByRayon(stow).forEach(g => {
      html += `<div class="rayon" style="padding-top:8px;">${lic(g.rayon.ico,{size:15})} ${g.rayon.name}<span class="cn">${g.items.length}</span></div>`;
      g.items.forEach(i => html += stowRow(i));
    });
    html += `</div></div>`;
  }

  body.innerHTML = html;
  bind();
  // entrance animation for newly stowed items
  lastEntered.forEach(id => {
    const el = body.querySelector(`.prod[data-id="${id}"]`);
    if (el) { el.classList.add('entering'); el.addEventListener('animationend', () => el.classList.remove('entering'), { once:true }); }
  });
  lastEntered.clear();
}

function pill(rayon) {
  const p = PILL[rayon];
  return `<span style="display:inline-flex;align-items:center;gap:3px;background:${PILLBG[p.cls]};color:${PILLFG[p.cls]};padding:2px 8px;border-radius:999px;font-family:var(--font-display);font-weight:700;font-size:10px;">${lic(p.ico,{size:11,color:PILLFG[p.cls]})} ${p.txt}</span>`;
}

function buyRow(i) {
  return `<div class="prod${i._checked?' done':''}" data-id="${i.id}">
    <div class="chk" data-check="${i.id}">${checkSvg()}</div>
    <div class="thumb" style="background:${i.bg};">${lic(i.emoji,{size:24,color:STROKE[i.bg]||'#1a1d1a'})}</div>
    <div class="info">
      <div class="nm"><span class="lbl">${i.name}</span> ${pill(i.rayon)}</div>
      <div class="meta">${i.qty} · Ajouté par ${i.by}</div>
    </div>
    <div class="acts">
      <button class="ib del" data-del="${i.id}" title="Supprimer">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14"/></svg>
      </button>
    </div>
  </div>`;
}

function stowRow(i) {
  return `<div class="prod stow-row" data-id="${i.id}" data-stow="${i.id}">
    <div class="chk">${checkSvg()}</div>
    <div class="thumb" style="background:${i.bg};">${lic(i.emoji,{size:24,color:STROKE[i.bg]||'#1a1d1a'})}</div>
    <div class="info">
      <div class="nm">${i.name} ${pill(i.rayon)}</div>
      <div class="meta">${i.qty} · Toucher pour ranger</div>
    </div>
    <div class="acts">
      <button class="ib back" data-back="${i.id}" title="Remettre dans à acheter">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 5 5v3"/></svg>
      </button>
      <div class="go"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M9 6l6 6-6 6"/></svg></div>
    </div>
  </div>`;
}

/* ── interactions ── */
function bind() {
  body.querySelectorAll('[data-add]').forEach(b => b.onclick = () => toast('Ouverture du formulaire d\'ajout…', '＋'));
  body.querySelectorAll('[data-scan]').forEach(b => b.onclick = () => openScanner());
  body.querySelectorAll('[data-check]').forEach(b => b.onclick = e => { e.stopPropagation(); checkItem(+b.dataset.check); });
  body.querySelectorAll('[data-del]').forEach(b => b.onclick = e => { e.stopPropagation(); askDelete(+b.dataset.del, false); });
  body.querySelectorAll('[data-back]').forEach(b => b.onclick = e => { e.stopPropagation(); moveBack(+b.dataset.back); });
  body.querySelectorAll('[data-stow]').forEach(b => b.onclick = () => openAssistant([+b.dataset.stow]));
  const sa = body.querySelector('[data-stowall]');
  if (sa) sa.onclick = () => openAssistant(items.filter(i=>i.state==='stow').map(i=>i.id));
}

function checkItem(id) {
  const el = body.querySelector(`.prod[data-id="${id}"]`);
  const it = items.find(i => i.id === id);
  if (!it || !el) return;
  el.classList.add('done');               // fill check
  setTimeout(() => {
    el.classList.add('leaving');          // slide out
    setTimeout(() => { it.state = 'stow'; lastEntered.add(id); save(); render(); }, 260);
  }, 160);
}

function moveBack(id) {
  const it = items.find(i => i.id === id);
  if (!it) return;
  it.state = 'buy'; it._checked = false; save(); render();
  toast(`${it.name} remis dans « À acheter »`, '↩');
}

/* delete with confirm only for stow items (already bought) */
let pendingDel = null;
function askDelete(id, fromStow) {
  const it = items.find(i => i.id === id);
  if (!it) return;
  if (!fromStow) { // À acheter: delete directly (swipe-like)
    removeItem(id);
    toast(`${it.name} supprimé`, lic('Trash2',{size:15}));
    return;
  }
  pendingDel = id;
  $('#confirmTxt').textContent = `« ${it.name} » ne sera ni rangé au stock ni gardé dans la liste.`;
  $('#confirm').classList.add('open');
}
function removeItem(id) { items = items.filter(i => i.id !== id); save(); render(); }

$('#confirmCancel').onclick = () => $('#confirm').classList.remove('open');
$('#confirmOk').onclick = () => {
  if (pendingDel != null) { const it = items.find(i=>i.id===pendingDel); removeItem(pendingDel); toast(`${it?it.name:'Article'} supprimé`, lic('Trash2',{size:15})); pendingDel = null; }
  $('#confirm').classList.remove('open');
};

/* ── assistant (bottom sheet) ── */
let queue = [], qIdx = 0, sel = { lieu:null, date:null };
function openAssistant(ids) {
  queue = ids.filter(id => items.find(i => i.id===id && i.state==='stow'));
  if (!queue.length) return;
  qIdx = 0;
  renderSheet();
  $('#scrim').classList.add('open');
  $('#sheet').classList.add('open');
}
function closeAssistant() {
  $('#scrim').classList.remove('open');
  $('#sheet').classList.remove('open');
}
$('#scrim').onclick = closeAssistant;

function renderSheet() {
  const it = items.find(i => i.id === queue[qIdx]);
  if (!it) { closeAssistant(); return; }
  sel = { lieu: SUGGEST[it.rayon] || 'frigo', date: it.perish ? '1s' : '1m' };
  const total = queue.length;
  const sheet = $('#sheet');
  sheet.innerHTML = `
    <div class="grab"></div>
    <div class="prog">Rangement guidé${total>1?` · article ${qIdx+1} sur ${total}`:''}</div>
    <div class="a-item">
      <div class="thumb" style="background:${it.bg};">${lic(it.emoji,{size:26,color:STROKE[it.bg]||'#1a1d1a'})}</div>
      <div><div class="nm">${it.name}</div><div class="meta">${it.qty} · ${PILL[it.rayon].txt}</div></div>
    </div>
    <div class="fl"><span class="step-n">1</span> Où le ranger&nbsp;?</div>
    <div class="opt-grid" id="lieux">
      ${LIEUX.map(l => `<button class="opt${sel.lieu===l.key?' sel':''}" data-lieu="${l.key}"><span class="e" style="display:inline-flex;align-items:center">${lic(l.e,{size:18})}</span> ${l.label}</button>`).join('')}
    </div>
    <div class="fl"><span class="step-n">2</span> Péremption <span style="color:var(--ink-3);font-weight:600;">— optionnel</span></div>
    <div class="chip-row" id="dates">
      ${DATES.map(d => `<button class="dchip${sel.date===d.key?' sel':''}" data-date="${d.key}">${d.label}</button>`).join('')}
    </div>
    <div class="actions">
      <button class="secondary" data-skip="1" title="Passer">Passer</button>
      <button class="primary" data-confirm="1">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 13l4 4L19 7"/></svg>
        ${qIdx < total-1 ? 'Ranger et suivant' : 'Ranger au stock'}
      </button>
    </div>`;
  sheet.querySelectorAll('[data-lieu]').forEach(b => b.onclick = () => {
    sel.lieu = b.dataset.lieu;
    sheet.querySelectorAll('[data-lieu]').forEach(x => x.classList.toggle('sel', x===b));
  });
  sheet.querySelectorAll('[data-date]').forEach(b => b.onclick = () => {
    sel.date = b.dataset.date;
    sheet.querySelectorAll('[data-date]').forEach(x => x.classList.toggle('sel', x===b));
  });
  sheet.querySelector('[data-confirm]').onclick = () => confirmStow(it.id);
  sheet.querySelector('[data-skip]').onclick = () => nextInQueue();
}
function confirmStow(id) {
  items = items.filter(i => i.id !== id);  // goes to stock → leaves list
  save();
  nextInQueue(true);
}
function nextInQueue(stowed) {
  qIdx++;
  if (qIdx >= queue.length) {
    closeAssistant();
    render();
    const remaining = items.filter(i=>i.state==='stow').length;
    if (remaining === 0 && items.filter(i=>i.state==='buy').length === 0) {
      // all done — show satisfaction in render via state, plus toast
      showAllDone();
    } else {
      toast(stowed ? 'Rangé au stock' : 'Assistant fermé', stowed ? '✓' : '');
    }
    return;
  }
  render();      // reflect removal behind the sheet
  renderSheet();
}
function showAllDone() {
  body.innerHTML = `<div class="action-row">
      <button class="add-btn" data-add="1">${lic('Plus',{size:18})} Ajouter un article</button>
      <button class="scan-btn" data-scan="1" title="Scanner un code-barres">${lic('ScanBarcode',{size:22})}</button>
    </div>
    <div class="done-banner">
      <div class="ic">${lic('PartyPopper',{size:42,color:'#1f9c5e'})}</div>
      <div class="ttl">Toutes les courses rangées&nbsp;!</div>
      <div class="txt">Votre stock est à jour. Bon appétit&nbsp;!</div>
    </div>`;
  body.querySelectorAll('[data-add]').forEach(b => b.onclick = () => toast('Ouverture du formulaire d\'ajout…', '＋'));
  body.querySelectorAll('[data-scan]').forEach(b => b.onclick = () => openScanner());
  $('#navSub').innerHTML = `0 à acheter · 0 à ranger <span class="sync-chip"><span class="live"></span>Synchronisé</span>`;
  $('#tabBadge').style.display='none';
}

/* ── toast ── */
let toastT;
function toast(msg, emoji) {
  const t = $('#toast');
  t.innerHTML = (emoji ? `<span class="e">${emoji}</span>` : '') + msg;
  t.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove('show'), 1900);
}

$('#reset').onclick = () => { localStorage.removeItem(KEY); load(); render(); };

/* ─────────── Scanner code-barres (caméra simulée) ─────────── */
const BG_BY_RAYON = { legumes:'var(--green-soft)', boucherie:'var(--red-soft)', cremerie:'var(--blue-soft)', epicerie:'var(--yellow-soft)', boissons:'var(--orange-soft)' };
let scanBuilt=false, scanOnline=true, camState='prompt', torchOn=false, offSel={rayon:null,unit:null};

function buildScanner(){
  const ov = $('#scanOverlay');
  ov.innerHTML = `
    <div class="scan-perm on" id="scanPerm">
      <div class="scan-card-ic">${lic('Camera',{size:32})}</div>
      <h2>Scanner tes articles</h2>
      <p>Fresh utilise la caméra pour scanner les codes-barres et gagner du temps pendant tes courses. Aucune photo n'est conservée.</p>
      <button class="pbtn primary" id="scanGrant">${lic('Camera',{size:18})} Activer la caméra</button>
      <button class="pbtn ghost" id="scanLater">Plus tard</button>
      <button class="plink" id="scanRefuse">Simuler un refus</button>
      <div class="scan-priv">${lic('ShieldCheck',{size:14})} Aucune image enregistrée</div>
    </div>
    <div class="scan-refused" id="scanRefused">
      <div class="scan-card-ic">${lic('CameraOff',{size:32})}</div>
      <h2>Scan indisponible</h2>
      <p>Le scan n'est pas disponible sans accès caméra. Autorise la caméra dans les réglages de l'app pour scanner tes codes-barres.</p>
      <button class="pbtn primary" id="scanOpenSettings">${lic('Settings',{size:18})} Activer la caméra</button>
      <button class="pbtn ghost" id="scanRefusedClose">Fermer</button>
    </div>
    <div class="scan-cam" id="scanCam">
      <div class="scan-top">
        <button class="scan-torch" id="scanTorch">${lic('Flashlight',{size:19})}</button>
        <div class="scan-title">Scanner un code-barres</div>
        <button class="scan-done" id="scanDone">Terminé</button>
      </div>
      <div class="scan-view">
        <div class="scan-frame">
          <div class="cnr tl"></div><div class="cnr tr"></div><div class="cnr bl"></div><div class="cnr br"></div>
          <div class="scan-line"></div>
        </div>
        <div class="scan-hint" id="scanHint">Vise un code-barres…</div>
      </div>
      <div class="scan-sim">
        <div class="scan-sim-h">${lic('Sparkles',{size:13})} Simulateur — touche un produit
          <button class="scan-net" id="scanNet">${lic('Wifi',{size:12})} En ligne</button>
        </div>
        <div class="scan-shelf" id="scanShelf"></div>
      </div>
      <div class="scan-flash" id="scanFlash"></div>
      <div class="scan-toast" id="scanToast"></div>
    </div>
    <div class="scan-result-scrim" id="scanResScrim"></div>
    <div class="scan-result" id="scanResult"></div>`;

  $('#scanShelf').innerHTML = FreshScan.DEMO_SHELF.map(d=>`
    <button class="scan-chip" data-bc="${d.barcode}">
      <div class="th" style="background:${d.bg};">${lic(d.emoji,{size:19,color:STROKE[d.bg]||'#fff'})}</div>
      <div><div class="cl">${d.label}</div><div class="ch">${d.hint}</div></div>
    </button>`).join('');
  $('#scanShelf').querySelectorAll('[data-bc]').forEach(b=> b.onclick=()=> doScan(b.dataset.bc));

  $('#scanGrant').onclick = ()=>{ camState='granted'; showScanPanel('cam'); };
  $('#scanLater').onclick = closeScanner;
  $('#scanRefuse').onclick = ()=>{ camState='refused'; showScanPanel('refused'); };
  $('#scanOpenSettings').onclick = ()=>{ camState='granted'; showScanPanel('cam'); scanToast('Caméra activée','ok'); };
  $('#scanRefusedClose').onclick = closeScanner;
  $('#scanDone').onclick = closeScanner;
  $('#scanTorch').onclick = ()=>{ torchOn=!torchOn; const t=$('#scanTorch'); t.classList.toggle('on',torchOn); t.innerHTML=lic(torchOn?'Flashlight':'FlashlightOff',{size:19}); };
  $('#scanNet').onclick = ()=>{ scanOnline=!scanOnline; const n=$('#scanNet'); n.classList.toggle('off',!scanOnline); n.innerHTML= scanOnline? lic('Wifi',{size:12})+' En ligne' : lic('WifiOff',{size:12})+' Hors ligne'; };
  $('#scanResScrim').onclick = closeResult;
  scanBuilt=true;
}
function showScanPanel(which){
  ['Perm','Refused','Cam'].forEach(p=>{ const el=$('#scan'+p); if(el) el.classList.remove('on'); });
  $('#scan'+({perm:'Perm',refused:'Refused',cam:'Cam'})[which]).classList.add('on');
}
function openScanner(){
  if(!scanBuilt) buildScanner();
  $('#scanOverlay').classList.add('open');
  showScanPanel(camState==='granted'?'cam':(camState==='refused'?'refused':'perm'));
}
function closeScanner(){ $('#scanOverlay').classList.remove('open'); closeResult(); }
function closeResult(){ const r=$('#scanResult'); if(r) r.classList.remove('open'); const s=$('#scanResScrim'); if(s) s.classList.remove('open'); }

function doScan(barcode){
  const f=$('#scanFlash'); f.classList.remove('go'); void f.offsetWidth; f.classList.add('go');
  const hint=$('#scanHint'); hint.textContent='Code détecté ✓';
  setTimeout(()=>{ hint.textContent='Vise un code-barres…'; }, 1400);
  handleScan(FreshScan.resolveScan(barcode, { items, online:scanOnline }));
}
function scanToast(msg, kind){
  const t=$('#scanToast'); const ic = kind==='warn'?'TriangleAlert':(kind==='info'?'Info':'Check');
  t.innerHTML = `<span class="te ${kind==='warn'?'warn':(kind==='info'?'info':'')}">${lic(ic,{size:16})}</span> ${msg}`;
  t.classList.add('show'); clearTimeout(t._t); t._t=setTimeout(()=>t.classList.remove('show'), 2400);
}
function openResult(html){ $('#scanResult').innerHTML = `<div class="grab"></div>`+html; $('#scanResScrim').classList.add('open'); $('#scanResult').classList.add('open'); }

function handleScan(r){
  if(r.kase===1){ const it=r.item; it.state='stow'; it._checked=false; lastEntered.add(it.id); save(); render(); scanToast(`${it.name} ajouté à « À ranger »`,'ok'); return; }
  if(r.kase===2){ closeScanner(); openAssistant([r.item.id]); return; }
  if(r.kase===3){ openResultCatalog(r); return; }
  if(r.kase===4){ openResultOff(r); return; }
  if(r.kase===5){ openResultUnknown(r); return; }
  if(r.kase==='offline'){ openResultOffline(r); return; }
}
function openResultCatalog(r){
  const c=r.catalog;
  openResult(`
    <div class="r-eyebrow" style="background:var(--blue-soft);color:#1d4dab;">${lic('PackageSearch',{size:12})} Hors liste · déjà au catalogue</div>
    <h3>Tu n'avais pas prévu cet article</h3>
    <p class="r-txt">Ce produit n'était pas dans ta liste. L'ajouter directement à « À ranger » ?</p>
    <div class="scan-prev">
      <div class="th" style="background:${c.bg};">${lic(c.emoji,{size:26,color:STROKE[c.bg]||'#1a1d1a'})}</div>
      <div><div class="nm">${c.name}</div><div class="mt">${c.qty} · ${FreshScan.PILL[c.rayon].txt}</div></div>
    </div>
    <div class="scan-r-actions">
      <button class="sec" data-x>Annuler</button>
      <button class="pri" data-ok>${lic('PackagePlus',{size:16})} Ajouter</button>
    </div>`);
  $('#scanResult').querySelector('[data-x]').onclick=closeResult;
  $('#scanResult').querySelector('[data-ok]').onclick=()=>{ items.push({ ...c, state:'stow', by:'vous', _checked:false }); lastEntered.add(c.id); save(); render(); closeResult(); scanToast(`${c.name} ajouté à « À ranger »`,'ok'); };
}
function openResultOff(r){
  const o=r.off; offSel={ rayon:r.rayon, unit:o.suggestedUnit||'pièce' };
  const units=['pièce','paquet','g','kg','L','x4'];
  openResult(`
    <div class="r-eyebrow" style="background:var(--yellow-soft);color:#8a6500;">${lic('Globe',{size:12})} Nouveau · Open Food Facts</div>
    <h3>Créer cet article</h3>
    <p class="r-txt">Produit trouvé sur Open Food Facts. Vérifie puis ajoute-le à ton catalogue et à « À ranger ».</p>
    <div class="scan-prev">
      <div class="th" style="background:${o.bg};">${lic(o.emoji,{size:26,color:STROKE[o.bg]||'#1a1d1a'})}</div>
      <div><div class="nm">${o.product_name_fr}</div><div class="mt">${o.quantity||''} · code ${r.barcode}</div></div>
      <div class="off-img">${lic('Image',{size:18})}<span>OFF</span></div>
    </div>
    <div class="scan-field"><label class="lb">Nom du produit</label><input class="scan-input" id="offName" value="${o.product_name_fr}"></div>
    <div class="scan-field"><label class="lb">Catégorie</label><div class="scan-picks" id="offCat">
      ${FreshScan.RAYONS.map(x=>`<button class="scan-pick${offSel.rayon===x.key?' sel':''}" data-cat="${x.key}">${lic(x.ico,{size:13})} ${x.name}</button>`).join('')}
    </div></div>
    <div class="scan-field"><label class="lb">Unité par défaut</label><div class="scan-picks" id="offUnit">
      ${units.map(u=>`<button class="scan-pick${offSel.unit===u?' sel':''}" data-unit="${u}">${u}</button>`).join('')}
    </div></div>
    <div class="scan-map-note">${lic('Users',{size:15})} Le mapping code-barres ↔ article sera partagé avec tous les foyers.</div>
    <div class="scan-r-actions">
      <button class="sec" data-x>Annuler</button>
      <button class="pri" data-ok>${lic('Check',{size:16})} Créer et ajouter</button>
    </div>`);
  const res=$('#scanResult');
  res.querySelectorAll('[data-cat]').forEach(b=> b.onclick=()=>{ offSel.rayon=b.dataset.cat; res.querySelectorAll('[data-cat]').forEach(x=>x.classList.toggle('sel',x===b)); });
  res.querySelectorAll('[data-unit]').forEach(b=> b.onclick=()=>{ offSel.unit=b.dataset.unit; res.querySelectorAll('[data-unit]').forEach(x=>x.classList.toggle('sel',x===b)); });
  res.querySelector('[data-x]').onclick=closeResult;
  res.querySelector('[data-ok]').onclick=()=>{
    const name=(res.querySelector('#offName').value||o.product_name_fr).trim();
    const rayon=offSel.rayon, id=Date.now();
    items.push({ id, name, qty:o.quantity||offSel.unit, emoji:o.emoji, bg:o.bg||BG_BY_RAYON[rayon], rayon, by:'vous', perish:(rayon==='cremerie'||rayon==='boucherie'), state:'stow', _checked:false });
    lastEntered.add(id);
    FreshScan.BARCODE_MAP[r.barcode]={ itemId:id, confidence:0.7, validated_count:1 };
    save(); render(); closeResult(); scanToast(`${name} créé · mapping partagé`,'ok');
  };
}
function openResultUnknown(r){
  openResult(`
    <div class="r-eyebrow" style="background:var(--sub);color:var(--ink-2);">${lic('SearchX',{size:12})} Non identifié</div>
    <h3>Produit non identifié</h3>
    <p class="r-txt">Le code ${r.barcode} n'est pas reconnu par Open Food Facts. Tu peux l'ajouter manuellement.</p>
    <div class="scan-r-actions">
      <button class="sec" data-x>Continuer les scans</button>
      <button class="pri" data-ok>${lic('PenLine',{size:16})} Ajouter manuellement</button>
    </div>`);
  $('#scanResult').querySelector('[data-x]').onclick=closeResult;
  $('#scanResult').querySelector('[data-ok]').onclick=()=>{ closeResult(); closeScanner(); toast('Ouverture du formulaire d\'ajout…','＋'); };
}
function openResultOffline(r){
  openResult(`
    <div class="r-eyebrow" style="background:var(--orange-soft);color:#d65a1f;">${lic('WifiOff',{size:12})} Hors ligne</div>
    <h3>Connexion requise</h3>
    <p class="r-txt">Ce nouveau code-barres n'est pas dans le cache local. Connecte-toi pour l'identifier, réessaie plus tard ou ajoute-le manuellement.</p>
    <div class="scan-r-actions">
      <button class="sec" data-x>Fermer</button>
      <button class="pri" data-ok>${lic('PenLine',{size:16})} Ajouter manuellement</button>
    </div>`);
  $('#scanResult').querySelector('[data-x]').onclick=closeResult;
  $('#scanResult').querySelector('[data-ok]').onclick=()=>{ closeResult(); closeScanner(); toast('Ouverture du formulaire d\'ajout…','＋'); };
}

render();
</script>
</body>
</html>
