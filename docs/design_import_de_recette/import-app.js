<!doctype html>
<html lang="fr" data-theme="light">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Fresh — Import de recette (interactif)</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  :root {
    --bg: #fdf8ed; --card: #ffffff; --sub: #f6efde; --page-bg: #ece2cc;
    --ink: #1a1d1a; --ink-2: #5e6760; --ink-3: #9ba59f; --rule: #ece4d2;
    --green: #2bb673; --green-soft: #d6f3e3; --green-deep: #1f9c5e;
    --orange: #ff7a3a; --orange-soft: #ffe0cc; --orange-deep: #a4451a;
    --red: #ef4a5a; --red-soft: #ffd9de; --red-deep: #b22233;
    --yellow: #ffc839; --yellow-soft: #fff1c4; --amber: #8a6a06;
    --blue: #4f8ef5; --blue-soft: #dae9ff; --blue-deep: #2b5db8;
    --purple: #8c6df0; --purple-soft: #e4dafa; --purple-deep: #5536c7;
    --pink-soft: #ffd9e6;
    --font-display: "DM Sans", system-ui, sans-serif;
    --font-body: "Inter", ui-sans-serif, system-ui, sans-serif;
    --bezel: #1a1d1a; --bezel-2: #3a3d3a; --island: #1a1d1a;
    --sh-sm: 0 1px 2px rgba(0,0,0,.04); --sh-md: 0 6px 18px rgba(0,0,0,.06); --sh-lg: 0 24px 60px rgba(0,0,0,.10);
  }
  [data-theme="dark"] {
    --bg: #15181b; --card: #1f2326; --sub: #272c30; --page-bg: #0a0c0d;
    --ink: #f4ede0; --ink-2: #a8b0a8; --ink-3: #6a7370; --rule: #2e3439;
    --green: #34c97f; --green-soft: #1d3a2c; --green-deep: #5ee4a0;
    --orange: #ff8a4f; --orange-soft: #4a2a1a; --orange-deep: #ffb98a;
    --red: #ff6071; --red-soft: #4a1d24; --red-deep: #ff9aa6;
    --yellow: #ffd158; --yellow-soft: #423318; --amber: #ffd158;
    --blue: #6aa3ff; --blue-soft: #1c2e4d; --blue-deep: #a9c8ff;
    --purple: #a48cff; --purple-soft: #2e2350; --purple-deep: #c9b8ff;
    --pink-soft: #4a1f30;
    --bezel: #08090a; --bezel-2: #25282a; --island: #08090a;
    --sh-sm: 0 1px 2px rgba(0,0,0,.4); --sh-md: 0 6px 16px rgba(0,0,0,.45); --sh-lg: 0 14px 32px rgba(0,0,0,.55);
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: var(--font-body); color: var(--ink); background: var(--page-bg);
    -webkit-font-smoothing: antialiased; min-height: 100vh;
    display: flex; align-items: center; justify-content: center; padding: 40px 20px;
    transition: background-color .25s;
  }
  .lic { width: 1em; height: 1em; display: inline-block; vertical-align: -0.12em; stroke-width: 2; }

  /* ── Phone ─────────────────────────────── */
  .phone {
    width: 390px; background: var(--bg); border-radius: 46px; padding: 8px; flex-shrink: 0;
    box-shadow: 0 0 0 11px var(--bezel), 0 0 0 12px var(--bezel-2),
                0 30px 60px -20px rgba(0,0,0,.35), 0 18px 36px -22px rgba(0,0,0,.25);
    position: relative;
  }
  .scr {
    background: var(--bg); border-radius: 38px; overflow: hidden; position: relative;
    height: 812px; display: flex; flex-direction: column;
  }
  .statusbar {
    height: 50px; flex-shrink: 0; display: flex; align-items: center; justify-content: space-between;
    padding: 0 30px; font-family: var(--font-display); font-size: 15px; font-weight: 700;
    color: var(--ink); position: relative; z-index: 6; background: var(--bg);
  }
  .statusbar .time { font-variant-numeric: tabular-nums; }
  .statusbar .ind { display: flex; gap: 6px; align-items: center; }
  .statusbar::after { content: ""; position: absolute; top: 10px; left: 50%; transform: translateX(-50%); width: 92px; height: 30px; border-radius: 999px; background: var(--island); }

  .flow { flex: 1; min-height: 0; display: flex; flex-direction: column; overflow: hidden; position: relative; }
  .scroll { flex: 1; min-height: 0; overflow-y: auto; overflow-x: hidden; -webkit-overflow-scrolling: touch; display: flex; flex-direction: column; }
  .scroll::-webkit-scrollbar { width: 0; }
  .center { justify-content: center; align-items: center; text-align: center; padding: 24px 26px 34px; }

  .nav { display: flex; align-items: center; padding: 6px 18px 12px; gap: 13px; background: var(--bg); flex-shrink: 0; }
  .nav .back, .nav .iconb {
    width: 36px; height: 36px; border-radius: 12px; background: var(--card);
    display: flex; align-items: center; justify-content: center; color: var(--ink);
    box-shadow: var(--sh-sm); flex-shrink: 0; cursor: pointer; border: 0;
  }
  .nav .back:active, .nav .iconb:active { transform: scale(.94); }
  .nav .back .lic, .nav .iconb .lic { width: 19px; height: 19px; }
  .nav .title-wrap { flex: 1; min-width: 0; }
  .nav .title { font-family: var(--font-display); font-weight: 700; font-size: 19px; color: var(--ink); line-height: 1.1; letter-spacing: -0.02em; }
  .nav .sub { font-size: 12px; color: var(--ink-2); margin-top: 2px; }
  .body { padding: 2px 16px 18px; }

  .card { background: var(--card); border-radius: 20px; padding: 16px 18px; box-shadow: var(--sh-sm); }
  .label { font-family: var(--font-display); font-weight: 700; font-size: 12px; color: var(--ink-2); margin: 0 2px 7px; }
  .field {
    background: var(--sub); border: 1.5px solid transparent; border-radius: 14px; padding: 12px 14px;
    display: flex; align-items: center; gap: 9px; transition: border-color .12s, background .12s;
  }
  .field:focus-within { border-color: var(--green); background: var(--card); }
  .field.err { border-color: var(--red); background: var(--red-soft); }
  .field .lic { color: var(--ink-3); width: 17px; height: 17px; flex-shrink: 0; }
  .field input { border: 0; background: transparent; outline: 0; flex: 1; min-width: 0; font-family: var(--font-body); font-size: 14px; color: var(--ink); }
  .field input::placeholder { color: var(--ink-3); }
  .field .paste { border: 0; background: var(--card); color: var(--ink-2); cursor: pointer; font-family: var(--font-display); font-weight: 700; font-size: 12px; border-radius: 999px; padding: 6px 11px; display: inline-flex; align-items: center; gap: 5px; }
  .field .paste .lic { width: 13px; height: 13px; color: var(--ink-2); }
  .field .paste:active { transform: scale(.95); }

  .btn { appearance: none; border: 0; cursor: pointer; font-family: var(--font-display); font-weight: 700; border-radius: 999px; padding: 13px 20px; font-size: 14.5px; display: inline-flex; align-items: center; justify-content: center; gap: 8px; transition: transform .08s, box-shadow .2s, opacity .2s; }
  .btn:active { transform: translateY(1px) scale(.995); }
  .btn .lic { width: 17px; height: 17px; }
  .btn.green { background: var(--green); color: #fff; box-shadow: 0 6px 16px rgba(43,182,115,.28); width: 100%; }
  .btn.ghost { background: var(--sub); color: var(--ink); width: 100%; }
  .btn.dark  { background: var(--ink); color: var(--bg); width: 100%; }
  .btn.sm { padding: 10px 15px; font-size: 13px; width: auto; }
  [data-theme="dark"] .btn.green { box-shadow: 0 6px 16px rgba(52,201,127,.35); }

  .intro-head { display: flex; align-items: flex-start; gap: 12px; }
  .tile { width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .tile .lic { width: 20px; height: 20px; }
  .intro-head .t { font-family: var(--font-display); font-weight: 700; font-size: 16px; letter-spacing: -0.01em; }
  .intro-head .d { font-size: 12.5px; color: var(--ink-2); margin-top: 3px; line-height: 1.45; }
  .helper { display: flex; align-items: flex-start; gap: 9px; font-size: 12.5px; color: var(--ink-2); line-height: 1.5; margin-top: 15px; }
  .helper .lic { width: 16px; height: 16px; color: var(--ink-3); flex-shrink: 0; margin-top: 1px; }
  .inline-err { display: none; align-items: center; gap: 7px; color: var(--red-deep); font-size: 12px; font-weight: 600; margin-top: 10px; }
  .inline-err.show { display: flex; }
  .inline-err .lic { width: 14px; height: 14px; }
  .try-note { font-size: 11.5px; color: var(--ink-3); text-align: center; margin-top: 16px; line-height: 1.5; }
  .try-note b { color: var(--ink-2); }

  /* ── Loading / centered ─────────────────── */
  .mascot-holder { width: 150px; height: 150px; border-radius: 50%; background: var(--sub); display: flex; align-items: flex-end; justify-content: center; overflow: hidden; }
  .mascot-holder img { width: 132px; object-fit: contain; margin-bottom: -6px; }
  .center h2 { font-family: var(--font-display); font-weight: 800; font-size: 22px; letter-spacing: -0.02em; margin: 22px 0 0; }
  .center .p { font-size: 13.5px; color: var(--ink-2); margin-top: 8px; line-height: 1.5; max-width: 260px; }
  .src-chip { display: inline-flex; align-items: center; gap: 6px; margin-top: 14px; background: var(--sub); color: var(--ink-2); border-radius: 999px; padding: 6px 13px; font-family: var(--font-display); font-weight: 700; font-size: 12px; max-width: 260px; }
  .src-chip .lic { width: 13px; height: 13px; flex-shrink: 0; }
  .src-chip span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .progress { width: 100%; max-width: 300px; height: 7px; border-radius: 999px; background: var(--sub); overflow: hidden; margin-top: 26px; }
  .progress > i { display: block; height: 100%; width: 8%; border-radius: 999px; background: var(--green); transition: width .5s ease; }
  .steps-list { width: 100%; max-width: 300px; margin-top: 22px; display: flex; flex-direction: column; gap: 12px; }
  .sl-row { display: flex; align-items: center; gap: 11px; font-family: var(--font-display); font-weight: 600; font-size: 13.5px; text-align: left; transition: color .3s; }
  .sl-row .dot { width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all .3s; }
  .sl-row .dot .lic { width: 13px; height: 13px; }
  .sl-row.done { color: var(--ink); } .sl-row.done .dot { background: var(--green); color: #fff; }
  .sl-row.active { color: var(--ink); } .sl-row.active .dot { background: var(--green-soft); color: var(--green-deep); }
  .sl-row.wait { color: var(--ink-3); } .sl-row.wait .dot { background: var(--sub); color: var(--ink-3); }
  .spin { animation: spin 1s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }
  .err-url { display: inline-flex; align-items: center; gap: 7px; max-width: 290px; background: var(--red-soft); color: var(--red-deep); border-radius: 12px; padding: 9px 13px; font-size: 12.5px; margin-top: 16px; overflow: hidden; }
  .err-url span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .err-url .lic { width: 14px; height: 14px; flex-shrink: 0; }

  /* ── Review ─────────────────────────────── */
  .rev-source { display: inline-flex; align-items: center; gap: 7px; margin: 0 2px 12px; color: var(--ink-2); font-family: var(--font-display); font-weight: 600; font-size: 12.5px; }
  .rev-source a { color: var(--green-deep); text-decoration: none; display: inline-flex; align-items: center; gap: 4px; font-weight: 700; }
  .rev-source .lic { width: 14px; height: 14px; }
  .rev-photo { position: relative; border-radius: 18px; overflow: hidden; height: 166px; background: radial-gradient(120% 120% at 20% 10%, rgba(255,180,90,.30), transparent 55%), radial-gradient(120% 120% at 90% 90%, rgba(230,90,30,.22), transparent 50%), var(--sub); display: flex; align-items: center; justify-content: center; }
  .rev-photo .cook .lic { width: 60px; height: 60px; stroke-width: 1.3; color: var(--orange-deep); opacity: .5; }
  .rev-photo .change { position: absolute; bottom: 11px; right: 11px; display: inline-flex; align-items: center; gap: 6px; background: rgba(255,255,255,.94); color: #1a1d1a; border: 0; cursor: pointer; font-family: var(--font-display); font-weight: 700; font-size: 12px; border-radius: 999px; padding: 7px 12px; box-shadow: var(--sh-sm); }
  .rev-photo .change .lic { width: 13px; height: 13px; }
  .editable { outline: 0; border-radius: 8px; transition: box-shadow .12s, background .12s; }
  .editable:focus { box-shadow: 0 0 0 2px var(--green); background: var(--card); }
  .rev-title { font-family: var(--font-display); font-weight: 800; font-size: 25px; line-height: 1.12; letter-spacing: -0.03em; color: var(--ink); margin: 15px 2px 0; }
  .rev-desc { font-family: var(--font-body); font-size: 13.5px; line-height: 1.5; color: var(--ink-2); margin: 9px 2px 0; }

  .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 11px; margin-top: 16px; }
  .bubble { border-radius: 18px; padding: 13px 15px; }
  .bubble .ic { width: 32px; height: 32px; border-radius: 10px; background: var(--card); display: flex; align-items: center; justify-content: center; margin-bottom: 9px; }
  .bubble .ic .lic { width: 17px; height: 17px; }
  .bubble .v { font-family: var(--font-display); font-weight: 800; font-size: 22px; letter-spacing: -0.02em; line-height: 1; display: flex; align-items: baseline; gap: 4px; }
  .bubble .v .u { font-size: 13px; font-weight: 700; opacity: .6; }
  .bubble .v .editable { min-width: 22px; display: inline-block; }
  .bubble .l { font-family: var(--font-display); font-weight: 600; font-size: 12px; color: var(--ink-2); margin-top: 6px; }
  .bubble.blue { background: var(--blue-soft); } .bubble.blue .ic { color: var(--blue); } .bubble.blue .v { color: var(--blue-deep); }
  .bubble.orange { background: var(--orange-soft); } .bubble.orange .ic { color: var(--orange); } .bubble.orange .v { color: var(--orange-deep); }
  .bubble.green { background: var(--green-soft); } .bubble.green .ic { color: var(--green); } .bubble.green .v { color: var(--green-deep); }
  .bubble.yellow { background: var(--yellow-soft); } .bubble.yellow .ic { color: #d9a300; } .bubble.yellow .v { color: var(--amber); }
  [data-theme="dark"] .bubble.yellow .ic { color: var(--yellow); }

  .tags { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 15px; }
  .tag { display: inline-flex; align-items: center; gap: 6px; padding: 7px 13px; border-radius: 999px; font-family: var(--font-display); font-weight: 700; font-size: 12.5px; }
  .tag .lic { width: 13px; height: 13px; }
  .tag .rm { cursor: pointer; opacity: .55; display: inline-flex; } .tag .rm:hover { opacity: 1; }
  .tag .rm .lic { width: 12px; height: 12px; }
  .tag.green { background: var(--green-soft); color: var(--green-deep); }
  .tag.blue { background: var(--blue-soft); color: var(--blue-deep); }
  .tag.purple { background: var(--purple-soft); color: var(--purple-deep); }
  .tag.add { background: transparent; border: 1.5px dashed #d6cdb3; color: var(--ink-2); cursor: pointer; }
  [data-theme="dark"] .tag.add { border-color: #3a4148; }

  .sec { margin-top: 22px; }
  .sec-h { display: flex; align-items: center; gap: 10px; margin: 0 2px 12px; }
  .sec-h .pic { width: 32px; height: 32px; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
  .sec-h .pic .lic { width: 17px; height: 17px; }
  .sec-h h3 { margin: 0; font-family: var(--font-display); font-weight: 700; font-size: 18px; letter-spacing: -0.02em; }
  .sec-h .count { margin-left: auto; font-family: var(--font-display); font-weight: 700; font-size: 12.5px; color: var(--ink-3); }

  .recap { background: var(--card); border: 1px solid var(--rule); border-radius: 16px; padding: 13px 15px; margin: 2px 0 14px; box-shadow: var(--sh-sm); }
  .recap .row { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
  .recap .item { display: inline-flex; align-items: center; gap: 7px; font-family: var(--font-display); font-weight: 700; font-size: 13px; }
  .recap .item .lic { width: 15px; height: 15px; }
  .recap .item.danger { color: var(--red-deep); } .recap .item.warn { color: var(--amber); } .recap .item.ok { color: var(--green-deep); }
  .recap .item.zero { color: var(--ink-3); }
  .recap .note { font-size: 11.5px; color: var(--ink-2); margin-top: 9px; display: flex; align-items: center; gap: 7px; line-height: 1.4; }
  .recap .note.allgood { color: var(--green-deep); font-weight: 600; }
  .recap .note .lic { width: 14px; height: 14px; color: var(--ink-3); flex-shrink: 0; }
  .recap .note.allgood .lic { color: var(--green); }

  .ings { display: flex; flex-direction: column; gap: 9px; }
  .ing { display: grid; grid-template-columns: 40px 1fr auto; gap: 12px; align-items: center; background: var(--card); border: 1px solid var(--rule); border-left: 3px solid var(--rule); border-radius: 14px; padding: 11px 13px; min-height: 62px; cursor: pointer; transition: border-color .12s, background .12s, transform .1s; }
  .ing:active { transform: scale(.99); }
  .ing:hover { border-color: #d9cfb6; } [data-theme="dark"] .ing:hover { border-color: #3a4148; }
  .ing .cat { width: 40px; height: 40px; border-radius: 11px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .ing .cat .lic { width: 20px; height: 20px; }
  .ing .cat.missing { border: 1.5px dashed currentColor; background: transparent; }
  .ing .main { min-width: 0; }
  .ing .art { font-family: var(--font-display); font-weight: 700; font-size: 14.5px; color: var(--ink); line-height: 1.15; }
  .ing .art .none { color: var(--red-deep); font-style: italic; font-weight: 600; }
  .ing .brut { font-size: 11.5px; color: var(--ink-3); margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .ing .stat { display: inline-flex; align-items: center; gap: 5px; margin-top: 6px; font-family: var(--font-display); font-weight: 700; font-size: 11px; padding: 3px 9px 3px 7px; border-radius: 999px; }
  .ing .stat .lic { width: 13px; height: 13px; }
  .ing .right { display: flex; flex-direction: column; align-items: flex-end; gap: 7px; flex-shrink: 0; }
  .qty { font-family: var(--font-display); font-weight: 800; font-size: 14px; color: var(--ink); white-space: nowrap; }
  .qty .u { font-weight: 700; font-size: 12px; color: var(--ink-2); margin-left: 2px; }
  .qty.eye { display: inline-flex; align-items: center; gap: 5px; font-weight: 700; font-size: 12px; color: var(--ink-2); background: var(--sub); border-radius: 999px; padding: 4px 10px; }
  .qty.eye .lic { width: 12px; height: 12px; color: var(--ink-3); }
  .ing .chev { color: var(--ink-3); display: flex; } .ing .chev .lic { width: 16px; height: 16px; }
  .fix-btn { display: inline-flex; align-items: center; gap: 6px; border: 0; cursor: pointer; font-family: var(--font-display); font-weight: 700; font-size: 12px; border-radius: 999px; padding: 8px 13px; }
  .fix-btn:active { transform: scale(.96); }
  .fix-btn .lic { width: 14px; height: 14px; }
  .ing.ok .stat { background: var(--green-soft); color: var(--green-deep); }
  .ing.ok .cat { background: var(--sub); color: var(--ink-2); }
  .ing.warn { border-left-color: var(--orange); background: color-mix(in srgb, var(--orange-soft) 45%, var(--card)); }
  .ing.warn .stat { background: var(--orange-soft); color: var(--orange-deep); }
  .ing.warn .cat { color: var(--orange-deep); background: var(--orange-soft); }
  .ing.warn .fix-btn { background: transparent; color: var(--orange-deep); border: 1.5px solid color-mix(in srgb, var(--orange) 55%, transparent); }
  .ing.danger { border-left-color: var(--red); background: color-mix(in srgb, var(--red-soft) 45%, var(--card)); }
  .ing.danger .stat { background: var(--red-soft); color: var(--red-deep); }
  .ing.danger .cat { color: var(--red-deep); }
  .ing.danger .fix-btn { background: var(--red); color: #fff; }
  .ing.danger .full { grid-column: 1 / -1; display: flex; gap: 8px; margin-top: 2px; }
  .ing.danger .full .fix-btn.alt { background: transparent; color: var(--red-deep); border: 1.5px solid color-mix(in srgb, var(--red) 45%, transparent); }
  . flash { animation: flash .6s ease; }
  @keyframes flash { 0% { background: var(--green-soft); } 100% {} }

  .steps { position: relative; margin-top: 4px; }
  .steps.has-line::before { content: ""; position: absolute; left: 16px; top: 10px; bottom: 26px; width: 2px; background: var(--rule); }
  .step { display: grid; grid-template-columns: 34px 1fr; gap: 14px; padding-bottom: 13px; position: relative; }
  .step .node { width: 34px; height: 34px; border-radius: 50%; background: var(--green); color: #fff; z-index: 1; display: flex; align-items: center; justify-content: center; font-family: var(--font-display); font-weight: 800; font-size: 14px; box-shadow: 0 0 0 4px var(--bg); }
  .step .sc { background: var(--sub); border-radius: 14px; padding: 12px 14px; }
  .step .stxt { font-family: var(--font-body); font-size: 13.5px; line-height: 1.5; color: var(--ink); }
  .step .sfoot { display: flex; align-items: center; gap: 9px; margin-top: 9px; }
  .step .dur { display: inline-flex; align-items: center; gap: 5px; background: var(--card); border-radius: 999px; padding: 5px 11px; font-family: var(--font-display); font-weight: 700; font-size: 11.5px; color: var(--ink-2); }
  .step .dur .lic { width: 13px; height: 13px; color: var(--orange); }
  .step .sdel { margin-left: auto; color: var(--ink-3); cursor: pointer; display: flex; border: 0; background: transparent; padding: 5px; border-radius: 8px; }
  .step .sdel:hover { background: var(--red-soft); color: var(--red); }
  .step .sdel .lic { width: 15px; height: 15px; }
  .step .sgrip { color: var(--ink-3); cursor: grab; display: flex; border: 0; background: transparent; padding: 5px; border-radius: 8px; touch-action: none; }
  .step .sgrip:hover { background: var(--sub); color: var(--ink-2); }
  .step .sgrip:active { cursor: grabbing; }
  .step .sgrip .lic { width: 15px; height: 15px; }
  .step.dragging { opacity: .45; }
  .step.dragging .sc { box-shadow: 0 0 0 2px var(--green); }
  .add-line { display: flex; align-items: center; justify-content: center; gap: 8px; border: 1.5px dashed #d6cdb3; border-radius: 13px; padding: 12px; font-family: var(--font-display); font-weight: 700; font-size: 13px; color: var(--green-deep); background: transparent; cursor: pointer; margin-top: 2px; width: 100%; }
  [data-theme="dark"] .add-line { border-color: #3a4148; }
  .add-line .lic { width: 16px; height: 16px; }

  /* step ↔ ingredient links */
  .step-ings { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; align-items: center; }
  .step-ing { display: inline-flex; align-items: center; gap: 5px; padding: 4px 5px 4px 10px; border-radius: 999px; background: var(--green-soft); color: var(--green-deep); font-family: var(--font-display); font-weight: 700; font-size: 11.5px; }
  .step-ing .q { opacity: .7; font-weight: 600; }
  .step-ing .rm { width: 15px; height: 15px; border-radius: 50%; background: rgba(31,156,94,.18); display: flex; align-items: center; justify-content: center; cursor: pointer; }
  .step-ing .rm .lic { width: 10px; height: 10px; }
  [data-theme="dark"] .step-ing .rm { background: rgba(94,228,160,.2); }
  .ing-pick-btn { display: inline-flex; align-items: center; gap: 6px; padding: 5px 11px; border-radius: 999px; cursor: pointer; border: 1.5px dashed #d6cdb3; background: transparent; color: var(--ink-2); font-family: var(--font-display); font-weight: 700; font-size: 11.5px; }
  [data-theme="dark"] .ing-pick-btn { border-color: #3a4148; }
  .ing-pick-btn.active, .ing-pick-btn:hover { border-style: solid; border-color: var(--green); color: var(--green-deep); background: var(--green-soft); }
  .ing-pick-btn .lic { width: 13px; height: 13px; }
  .ing-menu { display: none; margin-top: 8px; background: var(--card); border: 1px solid var(--rule); border-radius: 14px; padding: 6px; box-shadow: var(--sh-md); max-height: 230px; overflow-y: auto; }
  .ing-menu.open { display: block; }
  .ing-menu .mtitle { font-family: var(--font-display); font-weight: 700; font-size: 10.5px; letter-spacing: .04em; text-transform: uppercase; color: var(--ink-3); padding: 4px 8px 6px; }
  .ing-opt { display: flex; align-items: center; gap: 10px; padding: 8px 9px; border-radius: 10px; cursor: pointer; font-size: 13px; color: var(--ink); }
  .ing-opt:hover { background: var(--sub); }
  .ing-opt .box { width: 18px; height: 18px; border-radius: 6px; border: 2px solid #cfc7b2; display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: #fff; }
  [data-theme="dark"] .ing-opt .box { border-color: #3a4148; }
  .ing-opt .box .lic { width: 12px; height: 12px; opacity: 0; }
  .ing-opt.on .box { background: var(--green); border-color: var(--green); }
  .ing-opt.on .box .lic { opacity: 1; }
  .ing-opt .nm { flex: 1; }
  .ing-opt .q { font-family: var(--font-display); font-weight: 700; font-size: 11.5px; color: var(--ink-3); }

  .action-bar { position: sticky; bottom: 0; z-index: 5; background: color-mix(in srgb, var(--bg) 88%, transparent); backdrop-filter: blur(10px); border-top: 1px solid var(--rule); margin-top: 20px; padding: 13px 16px 18px; display: flex; gap: 10px; align-items: center; }
  .action-bar .btn.ghost { width: auto; padding: 13px 18px; }
  .action-bar .btn.green { flex: 1; }

  /* ── Bottom sheet ───────────────────────── */
  .sheet-wrap { position: absolute; inset: 0; z-index: 20; display: none; }
  .sheet-wrap.open { display: block; }
  .sheet-bd { position: absolute; inset: 0; background: rgba(10,12,13,.45); opacity: 0; transition: opacity .25s; }
  .sheet-wrap.open .sheet-bd { opacity: 1; }
  .sheet { position: absolute; left: 0; right: 0; bottom: 0; background: var(--bg); border-radius: 26px 26px 0 0; box-shadow: 0 -14px 40px rgba(0,0,0,.3); padding: 8px 18px 22px; transform: translateY(100%); transition: transform .3s cubic-bezier(.22,1,.36,1); max-height: 92%; display: flex; flex-direction: column; }
  .sheet-wrap.open .sheet { transform: translateY(0); }
  .sheet .handle { width: 40px; height: 5px; border-radius: 999px; background: var(--rule); margin: 6px auto 12px; flex-shrink: 0; }
  .sheet .sh-top { display: flex; align-items: flex-start; gap: 11px; margin-bottom: 4px; }
  .sheet .sh-top .close { margin-left: auto; width: 32px; height: 32px; border-radius: 10px; background: var(--sub); border: 0; cursor: pointer; display: flex; align-items: center; justify-content: center; color: var(--ink-2); flex-shrink: 0; }
  .sheet .sh-top .close .lic { width: 17px; height: 17px; }
  .sheet .sh-title { font-family: var(--font-display); font-weight: 800; font-size: 19px; letter-spacing: -0.02em; }
  .sheet .sh-brut { font-size: 12px; color: var(--ink-3); margin-top: 2px; }
  .sheet-scroll { overflow-y: auto; margin: 0 -18px; padding: 8px 18px 0; flex: 1; min-height: 0; }
  .sheet-scroll::-webkit-scrollbar { width: 0; }
  .sh-label { font-family: var(--font-display); font-weight: 700; font-size: 11.5px; letter-spacing: .04em; text-transform: uppercase; color: var(--ink-3); margin: 16px 2px 8px; }
  .create-cta { display: flex; align-items: center; gap: 11px; background: var(--red-soft); border-radius: 14px; padding: 13px 14px; margin-top: 12px; }
  .create-cta .ic { width: 36px; height: 36px; border-radius: 10px; background: var(--card); display: flex; align-items: center; justify-content: center; color: var(--red-deep); flex-shrink: 0; }
  .create-cta .ic .lic { width: 18px; height: 18px; }
  .create-cta .tx { flex: 1; min-width: 0; } .create-cta .tx .t { font-family: var(--font-display); font-weight: 700; font-size: 13.5px; } .create-cta .tx .d { font-size: 11.5px; color: var(--ink-2); }
  .create-cta .go { border: 0; background: var(--red); color: #fff; border-radius: 999px; padding: 9px 14px; font-family: var(--font-display); font-weight: 700; font-size: 12.5px; cursor: pointer; flex-shrink: 0; }
  .cat-list { display: flex; flex-direction: column; gap: 6px; }
  .cat-opt { display: flex; align-items: center; gap: 11px; padding: 10px 11px; border-radius: 12px; cursor: pointer; border: 1.5px solid transparent; }
  .cat-opt:hover { background: var(--sub); }
  .cat-opt.sel { border-color: var(--green); background: var(--green-soft); }
  .cat-opt .ci { width: 34px; height: 34px; border-radius: 10px; background: var(--sub); display: flex; align-items: center; justify-content: center; color: var(--ink-2); flex-shrink: 0; }
  .cat-opt.sel .ci { background: var(--card); color: var(--green-deep); }
  .cat-opt .ci .lic { width: 17px; height: 17px; }
  .cat-opt .nm { font-family: var(--font-display); font-weight: 700; font-size: 14px; flex: 1; }
  .cat-opt .ck { color: var(--green); display: none; } .cat-opt.sel .ck { display: flex; } .cat-opt .ck .lic { width: 18px; height: 18px; }
  .cat-empty { text-align: center; color: var(--ink-3); font-size: 12.5px; padding: 14px; }
  .qty-row { display: grid; grid-template-columns: 1fr 1.3fr; gap: 10px; }
  .qty-in { background: var(--sub); border: 1.5px solid transparent; border-radius: 12px; padding: 12px 14px; display: flex; align-items: center; }
  .qty-in:focus-within { border-color: var(--green); background: var(--card); }
  .qty-in input { border: 0; background: transparent; outline: 0; width: 100%; font-family: var(--font-display); font-weight: 800; font-size: 17px; color: var(--ink); }
  .unit-sel { background: var(--sub); border: 1.5px solid transparent; border-radius: 12px; padding: 0 12px; font-family: var(--font-body); font-size: 14px; color: var(--ink); -webkit-appearance: none; appearance: none; cursor: pointer; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%239ba59f' stroke-width='2.2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 12px center; }
  .eye-toggle { display: flex; align-items: center; gap: 11px; background: var(--sub); border-radius: 12px; padding: 12px 14px; margin-top: 10px; cursor: pointer; }
  .eye-toggle .ic { color: var(--ink-2); display: flex; } .eye-toggle .ic .lic { width: 18px; height: 18px; }
  .eye-toggle .tx { flex: 1; } .eye-toggle .tx .t { font-family: var(--font-display); font-weight: 700; font-size: 13.5px; } .eye-toggle .tx .d { font-size: 11.5px; color: var(--ink-2); }
  .sw { width: 44px; height: 26px; border-radius: 999px; background: var(--rule); position: relative; flex-shrink: 0; transition: background .2s; }
  .sw::after { content: ""; position: absolute; top: 3px; left: 3px; width: 20px; height: 20px; border-radius: 50%; background: #fff; transition: left .2s; box-shadow: 0 1px 3px rgba(0,0,0,.2); }
  .eye-toggle.on .sw { background: var(--green); } .eye-toggle.on .sw::after { left: 21px; }
  .eye-labels { display: flex; gap: 8px; margin-top: 10px; }
  .eye-labels .el { flex: 1; text-align: center; padding: 10px; border-radius: 12px; background: var(--sub); border: 1.5px solid transparent; cursor: pointer; font-family: var(--font-display); font-weight: 700; font-size: 13px; color: var(--ink-2); }
  .eye-labels .el.sel { border-color: var(--green); background: var(--green-soft); color: var(--green-deep); }
  .sheet-foot { display: flex; gap: 10px; padding-top: 14px; flex-shrink: 0; }
  .sheet-foot .btn { flex: 1; }

  /* saved */
  .saved-badge { position: relative; }
  .saved-badge .ring { width: 150px; height: 150px; border-radius: 50%; background: var(--green-soft); display: flex; align-items: flex-end; justify-content: center; overflow: hidden; }
  .saved-badge .ring img { width: 132px; margin-bottom: -6px; }
  .saved-badge .tick { position: absolute; bottom: -4px; right: -4px; width: 46px; height: 46px; border-radius: 50%; background: var(--green); color: #fff; display: flex; align-items: center; justify-content: center; box-shadow: 0 6px 16px rgba(43,182,115,.4); border: 4px solid var(--bg); }
  .saved-badge .tick .lic { width: 22px; height: 22px; }
  .saved-sum { display: flex; gap: 10px; margin-top: 24px; }
  .saved-sum .s { background: var(--card); border-radius: 14px; padding: 12px 8px; text-align: center; flex: 1; box-shadow: var(--sh-sm); }
  .saved-sum .s .n { font-family: var(--font-display); font-weight: 800; font-size: 20px; color: var(--ink); }
  .saved-sum .s .l { font-size: 10.5px; color: var(--ink-2); margin-top: 2px; }

  /* toast */
  .toast { position: absolute; left: 50%; bottom: 96px; transform: translateX(-50%) translateY(16px); background: var(--ink); color: var(--bg); font-family: var(--font-display); font-weight: 700; font-size: 13px; padding: 12px 18px; border-radius: 999px; box-shadow: var(--sh-lg); display: flex; align-items: center; gap: 9px; opacity: 0; pointer-events: none; transition: opacity .25s, transform .25s; z-index: 30; white-space: nowrap; }
  .toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }
  .toast .lic { width: 16px; height: 16px; color: var(--green-deep); }
  [data-theme="dark"] .toast .lic { color: var(--green); }

  .fade-in { animation: fade .35s ease; }
  @keyframes fade { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }

  /* theme toggle */
  .theme-toggle { position: fixed; top: 18px; right: 18px; z-index: 999; background: var(--card); color: var(--ink); border: 1px solid var(--rule); border-radius: 999px; padding: 9px 15px 9px 13px; display: inline-flex; align-items: center; gap: 9px; font-family: var(--font-display); font-weight: 700; font-size: 13px; cursor: pointer; box-shadow: 0 8px 24px rgba(0,0,0,.14); }
  .theme-toggle .lic { width: 16px; height: 16px; }
  .theme-toggle .swm { width: 30px; height: 17px; border-radius: 999px; background: var(--rule); position: relative; }
  .theme-toggle .swm::after { content: ""; position: absolute; top: 2px; left: 2px; width: 13px; height: 13px; border-radius: 50%; background: #fff; transition: left .2s; }
  [data-theme="dark"] .theme-toggle .swm { background: var(--green); }
  [data-theme="dark"] .theme-toggle .swm::after { left: 15px; }
  .hint-badge { position: fixed; left: 18px; bottom: 18px; z-index: 999; background: var(--card); color: var(--ink-2); border: 1px solid var(--rule); border-radius: 12px; padding: 9px 13px; font-family: var(--font-display); font-weight: 600; font-size: 12px; box-shadow: 0 8px 24px rgba(0,0,0,.12); display: flex; align-items: center; gap: 8px; max-width: 240px; }
  .hint-badge .lic { width: 15px; height: 15px; color: var(--green); flex-shrink: 0; }
</style>
</head>
<body>

<button class="theme-toggle" id="themeToggle">
  <i data-lucide="moon" class="lic" id="themeIcon"></i>
  <span id="themeLabel">Sombre</span>
  <span class="swm"></span>
</button>

<div class="hint-badge">
  <i data-lucide="hand" class="lic"></i>
  Prototype cliquable — colle l'URL, puis touche un ingrédient pour le corriger.
</div>

<div class="phone">
  <div class="scr">
    <div class="statusbar">
      <span class="time">9:41</span>
      <span class="ind">
        <svg width="18" height="11" viewBox="0 0 18 11" fill="currentColor"><path d="M0 8h2v3H0zM4 6h2v5H4zM8 4h2v7H8zM12 2h2v9h-2zM16 0h2v11h-2z"/></svg>
        <svg width="16" height="11" viewBox="0 0 16 11" fill="none" stroke="currentColor" stroke-width="1"><path d="M8 3a8 8 0 0 1 5.5 2.2M8 6a5 5 0 0 1 3.5 1.4M8 9.5a1 1 0 0 1 .8.4"/></svg>
        <svg width="26" height="12" viewBox="0 0 26 12" fill="none"><rect x="1" y="1" width="20" height="10" rx="2.5" stroke="currentColor" stroke-width="1"/><rect x="2.5" y="2.5" width="17" height="7" rx="1.5" fill="currentColor"/><rect x="22" y="4" width="2" height="4" rx="0.7" fill="currentColor"/></svg>
      </span>
    </div>
    <div class="flow" id="flow"></div>
    <div class="sheet-wrap" id="sheetWrap">
      <div class="sheet-bd" data-action="close-sheet"></div>
      <div class="sheet" id="sheet"></div>
    </div>
    <div class="toast" id="toast"><i data-lucide="check-circle-2" class="lic"></i> <span id="toastMsg"></span></div>
  </div>
</div>

<script src="https://unpkg.com/lucide@0.460.0/dist/umd/lucide.min.js"></script>
<script src="import-app.js"></script>
</body>
</html>
