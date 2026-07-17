<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Fresh — Liste de courses (Desktop)</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  :root {
    --bg: #f4e8c9;
    --card: #fbf4e0;
    --sub: #ece0bf;
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
    --shadow-sm: 0 4px 10px rgba(0,0,0,.04);
    --shadow-md: 0 6px 16px rgba(0,0,0,.05);
    --shadow-lg: 0 14px 32px rgba(0,0,0,.07);
    --display: "DM Sans", system-ui, sans-serif;
    --body: "Inter", ui-sans-serif, system-ui, sans-serif;
    --page-bg: #e8e0cf;
  }
  [data-theme="dark"] {
    --bg: #15181b;
    --card: #1f2326;
    --sub: #272c30;
    --ink: #f4ede0;
    --ink-2: #a8b0a8;
    --ink-3: #6a7370;
    --rule: #2e3439;
    --green: #34c97f;
    --green-soft: #1d3a2c;
    --green-deep: #5ee4a0;
    --orange: #ff8a4f;
    --orange-soft: #4a2a1a;
    --red: #ff6071;
    --red-soft: #4a1d24;
    --yellow: #ffd158;
    --yellow-soft: #423318;
    --blue: #6aa3ff;
    --blue-soft: #1c2e4d;
    --pink: #ff85ab;
    --pink-soft: #4a1f30;
    --purple: #a48cff;
    --purple-soft: #2e2350;
    --shadow-sm: 0 4px 10px rgba(0,0,0,.35);
    --shadow-md: 0 6px 16px rgba(0,0,0,.45);
    --shadow-lg: 0 14px 32px rgba(0,0,0,.55);
    --page-bg: #0a0c0d;
  }
  [data-theme="dark"] .screen { box-shadow: 0 30px 60px rgba(0,0,0,.55), 0 4px 12px rgba(0,0,0,.4); }
  [data-theme="dark"] .badge-soft-blue { color: #9cc2ff; }
  [data-theme="dark"] .badge-soft-orange { color: #ff9e6b; }
  [data-theme="dark"] .badge-soft-yellow { color: #ffd97a; }
  [data-theme="dark"] .badge-soft-pink { color: #ff9ec0; }
  [data-theme="dark"] .badge-soft-purple { color: #c3acff; }
  [data-theme="dark"] .badge-soft-red { color: #ff98a4; }
  [data-theme="dark"] .toast { background: #2b3137; }
  [data-theme="dark"] .stow-panel { background: rgba(52,201,127,.06); }
  [data-theme="dark"] .collab { background: linear-gradient(180deg, #1d2e26 0%, var(--card) 100%); }

  .theme-toggle {
    position: fixed; top: 22px; right: 24px; z-index: 200;
    background: var(--card); color: var(--ink);
    border: 1px solid var(--rule); border-radius: 999px;
    padding: 9px 15px 9px 13px;
    display: inline-flex; align-items: center; gap: 9px;
    font-family: var(--display); font-weight: 700; font-size: 13px;
    cursor: pointer; box-shadow: 0 8px 24px rgba(0,0,0,.18);
  }
  .theme-toggle .tsw { width: 30px; height: 17px; border-radius: 999px; background: var(--rule); position: relative; transition: background .2s; }
  .theme-toggle .tsw::after { content: ""; position: absolute; top: 2px; left: 2px; width: 13px; height: 13px; border-radius: 50%; background: #fff; transition: left .2s; }
  [data-theme="dark"] .theme-toggle .tsw { background: var(--green); }
  [data-theme="dark"] .theme-toggle .tsw::after { left: 15px; }

  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    background: var(--page-bg);
    font-family: var(--body);
    color: var(--ink);
    -webkit-font-smoothing: antialiased;
    padding: 40px 24px 80px;
    display: flex; justify-content: center;
  }

  .screen {
    width: 1440px;
    background: var(--bg);
    border-radius: 18px;
    overflow: hidden;
    box-shadow: 0 30px 60px rgba(0,0,0,.12), 0 4px 12px rgba(0,0,0,.06);
    display: grid;
    grid-template-columns: 256px 1fr;
    height: 900px;
    position: relative;
  }

  /* ── Sidebar ─────────────────────────────────────────────── */
  .sidebar { background: var(--card); border-right: 1px solid var(--rule); padding: 20px 14px 16px; display: flex; flex-direction: column; }
  .brand { display: flex; align-items: center; gap: 10px; padding: 6px 8px 22px; }
  .brand-logo { width: 36px; height: 36px; border-radius: 12px; background: var(--green-soft); display: flex; align-items: center; justify-content: center; overflow: hidden; }
  .brand-logo img { width: 100%; height: 100%; object-fit: cover; }
  .brand-name { font-family: var(--display); font-size: 19px; font-weight: 800; letter-spacing: -0.02em; }
  .brand-name em { color: var(--green); font-style: normal; }
  .nav { display: flex; flex-direction: column; gap: 2px; }
  .nav a { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 12px; font-family: var(--display); font-size: 14px; font-weight: 600; color: var(--ink-2); text-decoration: none; cursor: pointer; }
  .nav a .icn { width: 18px; height: 18px; display: inline-flex; align-items: center; justify-content: center; color: var(--ink-2); }
  .nav a.active { background: var(--green-soft); color: var(--green-deep); }
  .nav a.active .icn { color: var(--green-deep); }
  .nav a:hover:not(.active) { background: var(--sub); color: var(--ink); }
  .nav a .tag { margin-left: auto; background: var(--green); color: #fff; font-family: var(--display); font-weight: 700; font-size: 11px; min-width: 20px; height: 20px; padding: 0 6px; border-radius: 999px; display: inline-flex; align-items: center; justify-content: center; }
  .sidebar-foot { margin-top: auto; padding-top: 12px; border-top: 1px solid var(--rule); }
  .collapse { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: 10px; color: var(--ink-3); font-family: var(--display); font-size: 12.5px; font-weight: 600; cursor: pointer; }
  .collapse:hover { background: var(--sub); color: var(--ink-2); }
  .i { width: 18px; height: 18px; stroke-width: 1.8; }
  .lic { width: 1em; height: 1em; vertical-align: -0.13em; }

  /* ── Main ────────────────────────────────────────────────── */
  .main { display: flex; flex-direction: column; height: 100%; overflow: hidden; }
  .topbar { height: 64px; border-bottom: 1px solid var(--rule); background: var(--bg); display: flex; align-items: center; justify-content: space-between; padding: 0 28px; flex-shrink: 0; }
  .topbar .crumb { font-family: var(--display); font-size: 13px; font-weight: 600; color: var(--ink-3); display: flex; align-items: center; gap: 8px; }
  .topbar .crumb b { color: var(--ink); font-weight: 700; }
  .topbar-right { display: flex; align-items: center; gap: 14px; }
  .avatars { display: flex; align-items: center; }
  .avatars .av { width: 32px; height: 32px; border-radius: 50%; border: 2px solid var(--bg); display: flex; align-items: center; justify-content: center; font-family: var(--display); font-weight: 700; font-size: 12px; color: #fff; margin-left: -8px; }
  .avatars .av:first-child { margin-left: 0; }
  .sync-chip { display: inline-flex; align-items: center; gap: 6px; background: var(--green-soft); color: var(--green-deep); padding: 6px 11px; border-radius: 999px; font-family: var(--display); font-weight: 700; font-size: 12px; }
  .sync-chip .live { width: 7px; height: 7px; border-radius: 50%; background: var(--green-deep); animation: pulse 1.8s ease-in-out infinite; }
  @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.35;transform:scale(.7)} }
  .icon-btn { width: 38px; height: 38px; border-radius: 50%; background: var(--card); display: flex; align-items: center; justify-content: center; box-shadow: var(--shadow-sm); color: var(--ink-2); position: relative; cursor: pointer; }
  .icon-btn .dot { position: absolute; top: 4px; right: 4px; width: 17px; height: 17px; border-radius: 50%; background: var(--red); color: #fff; font-size: 10px; font-weight: 700; display: flex; align-items: center; justify-content: center; border: 2px solid var(--bg); font-family: var(--display); }
  .user-chip { display: flex; align-items: center; gap: 10px; background: var(--card); padding: 4px 14px 4px 4px; border-radius: 999px; box-shadow: var(--shadow-sm); cursor: pointer; }
  .user-chip .avatar { width: 30px; height: 30px; border-radius: 50%; background: var(--ink); color: var(--bg); font-family: var(--display); font-weight: 700; font-size: 11px; display: flex; align-items: center; justify-content: center; }
  .user-chip .nm { font-family: var(--display); font-size: 13px; font-weight: 700; }

  .content { flex: 1; overflow: auto; padding: 26px 32px 40px; position: relative; }
  .content::-webkit-scrollbar { width: 10px; }
  .content::-webkit-scrollbar-thumb { background: rgba(0,0,0,.10); border-radius: 999px; border: 3px solid transparent; background-clip: padding-box; }

  .pg-head { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 18px; }
  .pg-head h1 { margin: 0; font-family: var(--display); font-size: 30px; font-weight: 700; letter-spacing: -0.025em; line-height: 1.1; display: flex; align-items: center; gap: 12px; }
  .pg-head h1 .ico { width: 38px; height: 38px; border-radius: 12px; background: var(--green-soft); color: var(--green-deep); display: inline-flex; align-items: center; justify-content: center; }
  .pg-head .sub { margin-top: 7px; color: var(--ink-2); font-size: 14px; }
  .pg-actions { display: flex; align-items: center; gap: 10px; }

  .btn { appearance: none; border: 0; cursor: pointer; font-family: var(--display); font-weight: 700; font-size: 13.5px; padding: 11px 18px; border-radius: 999px; display: inline-flex; align-items: center; gap: 8px; transition: transform .12s, box-shadow .12s; }
  .btn-primary { background: var(--green); color: #fff; box-shadow: 0 4px 12px rgba(43,182,115,.28); }
  .btn-primary:hover { transform: translateY(-1px); }
  .btn-ghost { background: var(--card); color: var(--ink); box-shadow: var(--shadow-sm); }
  .btn-soft { background: var(--green-soft); color: var(--green-deep); }
  .btn-sm { padding: 9px 15px; font-size: 12.5px; }

  /* collab banner */
  .collab { display: flex; align-items: center; gap: 12px; background: linear-gradient(180deg, #eef9f1 0%, var(--card) 100%); border: 1px solid var(--green-soft); border-radius: 16px; padding: 12px 16px; margin-bottom: 18px; box-shadow: var(--shadow-sm); }
  .collab .av { width: 34px; height: 34px; border-radius: 50%; flex-shrink: 0; background: var(--pink); color: #fff; font-family: var(--display); font-weight: 700; font-size: 13px; display: flex; align-items: center; justify-content: center; }
  .collab .t { font-size: 13.5px; color: var(--ink-2); line-height: 1.35; }
  .collab .t b { color: var(--ink); font-family: var(--display); font-weight: 700; }

  /* two column layout */
  .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 22px; align-items: start; }
  .panel { background: transparent; }
  .panel-h { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
  .panel-h .ic { width: 40px; height: 40px; border-radius: 12px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
  .panel-h.buy .ic { background: var(--sub); color: var(--ink-2); }
  .panel-h.stow .ic { background: var(--green-soft); color: var(--green-deep); }
  .panel-h .ttl { font-family: var(--display); font-weight: 800; font-size: 20px; letter-spacing: -0.02em; }
  .panel-h .ct { font-size: 12.5px; color: var(--ink-3); font-weight: 600; margin-top: 2px; }
  .panel-h .spacer { flex: 1; }

  .stow-panel { background: rgba(43,182,115,.05); border: 1px solid var(--green-soft); border-radius: 20px; padding: 8px 14px 14px; }

  .rayon { display: flex; align-items: center; gap: 8px; padding: 16px 4px 9px; font-family: var(--display); font-weight: 700; font-size: 11.5px; color: var(--ink-2); text-transform: uppercase; letter-spacing: 0.05em; }
  .rayon:first-child { padding-top: 6px; }
  .rayon .cn { margin-left: auto; color: var(--ink-3); font-size: 11px; letter-spacing: 0; text-transform: none; font-weight: 600; }

  /* product row */
  .prod { background: var(--card); border: 1px solid var(--rule); border-radius: 15px; padding: 12px 14px; display: flex; gap: 13px; align-items: center; box-shadow: var(--shadow-sm); margin-bottom: 9px; transition: transform .28s cubic-bezier(.4,1.3,.5,1), opacity .26s ease, box-shadow .16s, border-color .16s; will-change: transform, opacity; }
  .prod:hover { box-shadow: var(--shadow-md); border-color: #ddd2b8; }
  [data-theme="dark"] .prod:hover { border-color: #3b444a; }
  .prod.leaving { transform: translateX(50px); opacity: 0; }
  .prod.entering { animation: dropin .42s cubic-bezier(.34,1.4,.5,1) both; }
  @keyframes dropin { 0% { transform: translateY(-10px) scale(.97); opacity: 0; } 100% { transform: translateY(0) scale(1); opacity: 1; } }
  .prod .chk { width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0; border: 2px solid var(--rule); background: var(--bg); cursor: pointer; display: flex; align-items: center; justify-content: center; color: #fff; transition: background .15s, border-color .15s, transform .12s; }
  .prod .chk:active { transform: scale(.85); }
  .prod.done .chk { background: var(--green); border-color: var(--green); }
  .prod .chk svg { width: 15px; height: 15px; opacity: 0; transition: opacity .15s; }
  .prod.done .chk svg { opacity: 1; }
  .prod .thumb { width: 48px; height: 48px; border-radius: 13px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
  .prod .info { flex: 1; min-width: 0; }
  .prod .nm { font-family: var(--display); font-weight: 700; font-size: 15.5px; color: var(--ink); line-height: 1.15; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .prod.done .nm .lbl { text-decoration: line-through; color: var(--ink-3); }
  .prod .meta { font-size: 12.5px; color: var(--ink-2); margin-top: 3px; }
  .prod .acts { display: flex; align-items: center; gap: 5px; flex-shrink: 0; }
  .prod .ib { width: 34px; height: 34px; border-radius: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; color: var(--ink-3); background: transparent; border: 0; transition: background .15s, color .15s; }
  .prod .ib svg { width: 17px; height: 17px; }
  .prod .ib:hover { background: var(--sub); color: var(--ink-2); }
  .prod .ib.del:hover { background: var(--red-soft); color: var(--red); }
  .prod .ib.back:hover { background: var(--green-soft); color: var(--green-deep); }

  /* stow row */
  .prod.stow-row { cursor: pointer; }
  .prod.stow-row .chk { background: var(--green); border-color: var(--green); cursor: default; }
  .prod.stow-row .chk svg { opacity: 1; }
  .prod .ranger-btn { appearance: none; border: 0; cursor: pointer; background: var(--green-deep); color: #fff; font-family: var(--display); font-weight: 700; font-size: 12.5px; padding: 9px 14px; border-radius: 999px; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 3px 8px rgba(31,156,94,.25); }

  /* empty / done states */
  .empty { background: var(--card); border: 1px solid var(--rule); border-radius: 18px; padding: 40px 26px; text-align: center; box-shadow: var(--shadow-sm); }
  .empty .eic { width: 58px; height: 58px; border-radius: 16px; margin: 0 auto 14px; display: flex; align-items: center; justify-content: center; background: var(--sub); color: var(--ink-3); }
  .empty.ok .eic { background: var(--green-soft); color: var(--green-deep); }
  .empty .ttl { font-family: var(--display); font-weight: 800; font-size: 17px; }
  .empty .txt { font-size: 13.5px; color: var(--ink-2); margin-top: 8px; line-height: 1.5; max-width: 280px; margin-left: auto; margin-right: auto; }
  .empty .cta { margin-top: 18px; }

  .done-banner { background: linear-gradient(135deg, var(--green) 0%, var(--green-deep) 100%); border-radius: 20px; padding: 30px 24px; text-align: center; color: #fff; box-shadow: 0 12px 28px rgba(43,182,115,.32); }
  .done-banner .dic { width: 56px; height: 56px; border-radius: 16px; margin: 0 auto 12px; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,.2); }
  .done-banner .ttl { font-family: var(--display); font-weight: 800; font-size: 20px; }
  .done-banner .txt { font-size: 14px; opacity: .92; margin-top: 6px; }

  /* pill */
  .pill { display: inline-flex; align-items: center; gap: 4px; padding: 3px 9px; border-radius: 999px; font-family: var(--display); font-weight: 700; font-size: 10.5px; }

  /* ── Modal (assistant) ─────────────────────────────────── */
  .scrim { position: absolute; inset: 0; z-index: 50; background: rgba(20,22,20,.42); backdrop-filter: blur(2px); opacity: 0; pointer-events: none; transition: opacity .22s; }
  .scrim.show { opacity: 1; pointer-events: auto; }
  .modal { position: absolute; top: 50%; left: 50%; z-index: 55; width: 520px; transform: translate(-50%, -46%); background: var(--bg); border-radius: 24px; box-shadow: 0 30px 70px rgba(0,0,0,.30); padding: 22px 26px 26px; opacity: 0; pointer-events: none; transition: opacity .22s, transform .22s; max-height: 84%; overflow-y: auto; }
  .modal.show { opacity: 1; pointer-events: auto; transform: translate(-50%, -50%); }
  .modal .prog { font-family: var(--display); font-weight: 700; font-size: 11.5px; color: var(--green-deep); letter-spacing: 0.06em; text-transform: uppercase; }
  .modal .a-item { display: flex; align-items: center; gap: 14px; margin: 12px 0 22px; background: var(--card); border: 1px solid var(--rule); border-radius: 16px; padding: 14px 16px; }
  .modal .a-item .thumb { width: 52px; height: 52px; border-radius: 14px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
  .modal .a-item .nm { font-family: var(--display); font-weight: 800; font-size: 19px; letter-spacing: -0.02em; }
  .modal .a-item .meta { font-size: 13px; color: var(--ink-2); margin-top: 2px; }
  .modal .fl { font-family: var(--display); font-weight: 700; font-size: 14px; margin: 0 2px 12px; display: flex; align-items: center; gap: 8px; }
  .modal .fl .step-n { width: 21px; height: 21px; border-radius: 50%; background: var(--ink); color: var(--bg); font-size: 11px; display: flex; align-items: center; justify-content: center; }
  .modal .fl .opt-lbl { color: var(--ink-3); font-weight: 600; font-size: 12.5px; }
  .opt-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 24px; }
  .opt { appearance: none; cursor: pointer; text-align: left; background: var(--card); border: 1.5px solid var(--rule); border-radius: 14px; padding: 13px 14px; display: flex; align-items: center; gap: 10px; font-family: var(--display); font-weight: 600; font-size: 13.5px; color: var(--ink); transition: border-color .15s, background .15s; }
  .opt .e { display: inline-flex; align-items: center; color: var(--ink-2); }
  .opt.sel { border-color: var(--green); background: var(--green-soft); color: var(--green-deep); }
  .opt.sel .e { color: var(--green-deep); }
  .chip-row { display: flex; gap: 9px; flex-wrap: wrap; margin-bottom: 26px; }
  .dchip { appearance: none; cursor: pointer; background: var(--card); border: 1.5px solid var(--rule); border-radius: 999px; padding: 10px 16px; font-family: var(--display); font-weight: 600; font-size: 13px; color: var(--ink-2); transition: border-color .15s, background .15s, color .15s; }
  .dchip.sel { border-color: var(--green); background: var(--green-soft); color: var(--green-deep); }
  .modal .m-actions { display: flex; gap: 10px; }
  .modal .m-actions button { appearance: none; border: 0; cursor: pointer; font-family: var(--display); font-weight: 700; font-size: 14.5px; border-radius: 999px; padding: 14px; display: inline-flex; align-items: center; justify-content: center; gap: 8px; }
  .modal .m-actions .secondary { flex: 0 0 auto; background: var(--sub); color: var(--ink-2); padding: 14px 20px; }
  .modal .m-actions .primary { flex: 1; background: var(--green); color: #fff; box-shadow: 0 6px 16px rgba(43,182,115,.3); }

  /* confirm */
  .confirm-box { position: absolute; top: 50%; left: 50%; z-index: 56; width: 400px; transform: translate(-50%, -46%) scale(.96); background: var(--bg); border-radius: 22px; box-shadow: 0 30px 70px rgba(0,0,0,.30); padding: 26px 24px; text-align: center; opacity: 0; pointer-events: none; transition: opacity .2s, transform .2s; }
  .confirm-box.show { opacity: 1; pointer-events: auto; transform: translate(-50%, -50%) scale(1); }
  .confirm-box .cic { width: 52px; height: 52px; border-radius: 15px; margin: 0 auto 14px; display: flex; align-items: center; justify-content: center; background: var(--red-soft); color: var(--red); }
  .confirm-box .ttl { font-family: var(--display); font-weight: 800; font-size: 18px; }
  .confirm-box .txt { font-size: 13.5px; color: var(--ink-2); margin-top: 8px; line-height: 1.5; }
  .confirm-box .row { display: flex; gap: 10px; margin-top: 22px; }
  .confirm-box .row button { flex: 1; appearance: none; border: 0; cursor: pointer; font-family: var(--display); font-weight: 700; font-size: 14px; border-radius: 999px; padding: 13px; }
  .confirm-box .row .cancel { background: var(--sub); color: var(--ink); }
  .confirm-box .row .ok { background: var(--red); color: #fff; }

  /* toast */
  .toast-wrap { position: absolute; right: 24px; bottom: 24px; z-index: 70; display: flex; flex-direction: column; gap: 10px; align-items: flex-end; }
  .toast { background: var(--ink); color: #fff; border-radius: 15px; padding: 13px 18px; display: flex; align-items: center; gap: 12px; box-shadow: 0 16px 40px rgba(0,0,0,.32); font-family: var(--display); font-weight: 600; font-size: 14px; transform: translateX(30px); opacity: 0; transition: transform .3s cubic-bezier(.2,.85,.25,1), opacity .3s; white-space: nowrap; }
  [data-theme="dark"] .toast { color: var(--ink); }
  .toast.show { transform: translateX(0); opacity: 1; }
  .toast .te { display: inline-flex; align-items: center; color: var(--green); }
</style>
</head>
<body>

<button class="theme-toggle" id="themeToggle"><i data-lucide="moon" class="lic"></i> <span id="themeLbl">Sombre</span> <span class="tsw"></span></button>

<div class="screen" id="screen" data-screen-label="Liste de courses (Desktop)">
  <!-- SIDEBAR -->
  <aside class="sidebar">
    <div class="brand">
      <div class="brand-logo"><img src="mascot/chef-happy.png" alt=""></div>
      <div class="brand-name">Mon<em>Frigo</em></div>
    </div>
    <nav class="nav">
      <a><span class="icn"><svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg></span>Tableau de bord</a>
      <a><span class="icn"><svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21 8.5L12 3 3 8.5v7L12 21l9-5.5v-7z"/><path d="M3 8.5L12 14l9-5.5"/></svg></span>Mes produits</a>
      <a><span class="icn"><svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 4h12a4 4 0 0 1 4 4v12H8a4 4 0 0 1-4-4V4z"/></svg></span>Recettes</a>
      <a><span class="icn"><svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="4" width="18" height="17" rx="2"/></svg></span>Plan de repas</a>
      <a class="active"><span class="icn"><svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 4h2l2.5 12.5a2 2 0 0 0 2 1.5h7.5a2 2 0 0 0 2-1.5L21 8H6"/><circle cx="9" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/></svg></span>Liste de courses<span class="tag" id="navCount">12</span></a>
      <a><span class="icn"><svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 6h16M7 12h10M10 18h4"/></svg></span>Stock minimum</a>
      <a><span class="icn"><svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="6" r="2.5"/><circle cx="6" cy="14" r="2.5"/><circle cx="18" cy="14" r="2.5"/><circle cx="12" cy="20" r="2.5"/></svg></span>Stockages</a>
    </nav>
    <div class="sidebar-foot">
      <div class="collapse"><svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M15 18l-6-6 6-6"/><path d="M9 18l-6-6 6-6"/></svg>Réduire la barre latérale</div>
    </div>
  </aside>

  <!-- MAIN -->
  <div class="main">
    <header class="topbar">
      <div class="crumb">Liste de courses <svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" style="width:14px;height:14px"><path d="M9 6l6 6-6 6"/></svg> <b>Maison Dubois</b></div>
      <div class="topbar-right">
        <div class="sync-chip"><span class="live"></span> Synchronisé</div>
        <div class="avatars">
          <div class="av" style="background:var(--ink)">JD</div>
          <div class="av" style="background:var(--pink)">M</div>
          <div class="av" style="background:var(--blue)">L</div>
        </div>
        <div class="icon-btn"><svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9z"/></svg><span class="dot">2</span></div>
        <div class="user-chip"><div class="avatar">JD</div><div class="nm">Julien</div></div>
      </div>
    </header>

    <div class="content" id="content">
      <div class="pg-head">
        <div>
          <h1><span class="ico"><i data-lucide="shopping-cart" class="lic"></i></span>Liste de courses</h1>
          <div class="sub" id="pgSub">12 articles · mise à jour en direct avec Marie</div>
        </div>
        <div class="pg-actions">
          <button class="btn btn-ghost" data-add="1"><i data-lucide="sparkles" class="lic"></i> Depuis mes recettes</button>
          <button class="btn btn-primary" data-add="1"><i data-lucide="plus" class="lic"></i> Ajouter un article</button>
        </div>
      </div>

      <div id="collabSlot"></div>

      <div class="cols">
        <!-- À ACHETER -->
        <section class="panel">
          <div class="panel-h buy">
            <div class="ic"><i data-lucide="shopping-cart" class="lic" style="width:22px;height:22px"></i></div>
            <div>
              <div class="ttl">À acheter</div>
              <div class="ct" id="buyCt">6 articles</div>
            </div>
          </div>
          <div id="buyList"></div>
        </section>

        <!-- À RANGER -->
        <section class="panel">
          <div class="panel-h stow">
            <div class="ic"><i data-lucide="package" class="lic" style="width:22px;height:22px"></i></div>
            <div>
              <div class="ttl">À ranger</div>
              <div class="ct" id="stowCt">0 article acheté</div>
            </div>
            <div class="spacer"></div>
            <button class="btn btn-soft btn-sm" id="stowAll" style="display:none;"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 13l4 4L19 7"/></svg> Tout ranger</button>
          </div>
          <div id="stowList"></div>
        </section>
      </div>
    </div>

    <!-- overlays -->
    <div class="scrim" id="scrim"></div>
    <div class="modal" id="modal"></div>
    <div class="confirm-box" id="confirm">
      <div class="cic"><i data-lucide="trash-2" class="lic" style="width:24px;height:24px"></i></div>
      <div class="ttl">Supprimer cet article ?</div>
      <div class="txt" id="confirmTxt">Il ne sera ni rangé au stock ni gardé dans la liste.</div>
      <div class="row">
        <button class="cancel" id="confirmCancel">Annuler</button>
        <button class="ok" id="confirmOk">Supprimer</button>
      </div>
    </div>
    <div class="toast-wrap" id="toastWrap"></div>
  </div>
</div>

<script src="https://unpkg.com/lucide@0.460.0/dist/umd/lucide.min.js"></script>
<script>
function lic(name, opts){ opts = opts || {}; const node = window.lucide && window.lucide.icons && window.lucide.icons[name]; const size = opts.size || 20; const color = opts.color || 'currentColor'; const sw = opts.sw || 1.9; let inner=''; if(node){ const ch = node[2] || []; inner = ch.map(function(c){ const at = c[1] || {}; const a = Object.keys(at).map(function(k){return k+'="'+at[k]+'"';}).join(' '); return '<'+c[0]+' '+a+'/>'; }).join(''); } return '<svg width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="'+color+'" stroke-width="'+sw+'" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;flex-shrink:0">'+inner+'</svg>'; }
const STROKE = {'var(--green-soft)':'#1f9c5e','var(--red-soft)':'#c83a48','var(--orange-soft)':'#d65a1f','var(--yellow-soft)':'#b88a14','var(--blue-soft)':'#3a72d9','var(--purple-soft)':'#6c50d0','var(--pink-soft)':'#d04475'};

const RAYONS = [
  { key:'legumes',   name:'Fruits et légumes',        ico:'Salad' },
  { key:'boucherie', name:'Boucherie · poissonnerie', ico:'Beef' },
  { key:'cremerie',  name:'Crèmerie et frais',         ico:'Milk' },
  { key:'epicerie',  name:'Épicerie',                   ico:'Wheat' },
  { key:'boissons',  name:'Boissons et snacks',         ico:'Wine' },
];
const SEED = [
  { id:1,  name:'Oignon',           qty:'3',        emoji:'Salad',     bg:'var(--green-soft)',  rayon:'legumes',   by:'vous' },
  { id:2,  name:'Ail',              qty:'2 gousses',emoji:'Salad',     bg:'var(--green-soft)',  rayon:'legumes',   by:'vous' },
  { id:3,  name:'Céleri',           qty:'1',        emoji:'Salad',     bg:'var(--green-soft)',  rayon:'legumes',   by:'vous' },
  { id:4,  name:'Tomates',          qty:'500 g',    emoji:'Apple',     bg:'var(--red-soft)',    rayon:'legumes',   by:'Marie' },
  { id:5,  name:'Carottes',         qty:'7',        emoji:'Carrot',    bg:'var(--orange-soft)', rayon:'legumes',   by:'vous' },
  { id:6,  name:'Bœuf haché',       qty:'600 g',    emoji:'Beef',      bg:'var(--red-soft)',    rayon:'boucherie', by:'vous',  perish:true },
  { id:7,  name:'Pilon de poulet',  qty:'1 kg',     emoji:'Drumstick', bg:'var(--red-soft)',    rayon:'boucherie', by:'Marie', perish:true },
  { id:8,  name:'Fromage râpé',     qty:'70 g',     emoji:'Milk',      bg:'var(--yellow-soft)', rayon:'cremerie',  by:'vous',  perish:true },
  { id:9,  name:'Lait',             qty:'1 L',      emoji:'Milk',      bg:'var(--blue-soft)',   rayon:'cremerie',  by:'vous',  perish:true },
  { id:10, name:'Lasagnes',         qty:'1 paquet', emoji:'Wheat',     bg:'var(--yellow-soft)', rayon:'epicerie',  by:'vous' },
  { id:11, name:'Chocolat noir',    qty:'100 g',    emoji:'Cookie',    bg:'var(--orange-soft)', rayon:'boissons',  by:'vous' },
  { id:12, name:'Vin rouge',        qty:'1 btl',    emoji:'Wine',      bg:'var(--purple-soft)', rayon:'boissons',  by:'Marie' },
];
const PILL = {
  legumes:{ico:'Salad',txt:'Légumes',cls:'green'}, boucherie:{ico:'Beef',txt:'Viandes',cls:'red'},
  cremerie:{ico:'Milk',txt:'Frais',cls:'blue'}, epicerie:{ico:'Wheat',txt:'Épicerie',cls:'yellow'},
  boissons:{ico:'Wine',txt:'Boissons',cls:'purple'},
};
const PILLBG = { green:'var(--green-soft)', red:'var(--red-soft)', blue:'var(--blue-soft)', yellow:'var(--yellow-soft)', purple:'var(--purple-soft)' };
const PILLFG = { green:'var(--green-deep)', red:'#b2333f', blue:'#1d4dab', yellow:'#8a6500', purple:'#5536c7' };
const LIEUX = [
  { key:'frigo',   e:'Refrigerator', label:'Réfrigérateur' },
  { key:'congel',  e:'Snowflake',    label:'Congélateur' },
  { key:'placard', e:'Archive',      label:'Placard' },
  { key:'corbeille',e:'Apple',       label:'Corbeille' },
  { key:'cellier', e:'ShoppingBasket',label:'Cellier' },
  { key:'cave',    e:'Wine',         label:'Cave' },
];
const DATES = [
  { key:'3j', label:'+3 jours' }, { key:'1s', label:'+1 semaine' }, { key:'2s', label:'+2 semaines' },
  { key:'1m', label:'+1 mois' }, { key:'none', label:'Pas de date' },
];
const SUGGEST = { legumes:'corbeille', boucherie:'frigo', cremerie:'frigo', epicerie:'placard', boissons:'cave' };

const KEY = 'fresh-courses-desktop-v1';
let items;
function load() {
  try { const raw = JSON.parse(localStorage.getItem(KEY)); if (raw && Array.isArray(raw.items)) { items = raw.items; return; } } catch(e) {}
  items = SEED.map(i => ({ ...i, state:'buy' }));
}
function save() { localStorage.setItem(KEY, JSON.stringify({ items })); }
load();

const $ = s => document.querySelector(s);
const buyList = $('#buyList'), stowList = $('#stowList');
let lastEntered = new Set();

function checkSvg(){ return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M5 13l4 4L19 7"/></svg>'; }
function rowsByRayon(list){ const out=[]; RAYONS.forEach(r=>{ const inR=list.filter(i=>i.rayon===r.key); if(inR.length) out.push({rayon:r,items:inR}); }); return out; }
function pill(rayon){ const p=PILL[rayon]; return `<span class="pill" style="background:${PILLBG[p.cls]};color:${PILLFG[p.cls]};">${lic(p.ico,{size:11,color:PILLFG[p.cls]})} ${p.txt}</span>`; }

function buyRow(i){
  return `<div class="prod${i._checked?' done':''}" data-id="${i.id}">
    <div class="chk" data-check="${i.id}">${checkSvg()}</div>
    <div class="thumb" style="background:${i.bg};">${lic(i.emoji,{size:26,color:STROKE[i.bg]||'#1a1d1a'})}</div>
    <div class="info">
      <div class="nm"><span class="lbl">${i.name}</span> ${pill(i.rayon)}</div>
      <div class="meta">${i.qty} · Ajouté par ${i.by}</div>
    </div>
    <div class="acts">
      <button class="ib del" data-del="${i.id}" title="Supprimer">${lic('Trash2',{size:17})}</button>
    </div>
  </div>`;
}
function stowRow(i){
  return `<div class="prod stow-row" data-id="${i.id}" data-stow="${i.id}">
    <div class="chk">${checkSvg()}</div>
    <div class="thumb" style="background:${i.bg};">${lic(i.emoji,{size:26,color:STROKE[i.bg]||'#1a1d1a'})}</div>
    <div class="info">
      <div class="nm">${i.name} ${pill(i.rayon)}</div>
      <div class="meta">${i.qty} · acheté par ${i.by}</div>
    </div>
    <div class="acts">
      <button class="ib back" data-back="${i.id}" title="Remettre dans à acheter">${lic('Undo2',{size:17})}</button>
      <button class="ranger-btn" data-stow="${i.id}">${lic('PackageCheck',{size:15})} Ranger</button>
    </div>
  </div>`;
}

function render(){
  const buy = items.filter(i=>i.state==='buy');
  const stow = items.filter(i=>i.state==='stow');
  const total = buy.length + stow.length;

  $('#pgSub').textContent = `${total} article${total>1?'s':''} · mise à jour en direct avec Marie`;
  const nc = $('#navCount'); if(total>0){ nc.style.display='inline-flex'; nc.textContent=total; } else nc.style.display='none';
  $('#buyCt').textContent = `${buy.length} article${buy.length>1?'s':''}`;
  $('#stowCt').textContent = `${stow.length} article${stow.length>1?'s':''} acheté${stow.length>1?'s':''}`;

  // collab banner
  $('#collabSlot').innerHTML = stow.length>0
    ? `<div class="collab"><div class="av">M</div><div class="t"><b>Marie</b> est en train de faire les courses — les articles cochés arrivent dans « À ranger » en direct.</div></div>`
    : '';

  // stow all button
  const sa = $('#stowAll'); sa.style.display = stow.length>0 ? 'inline-flex' : 'none';

  // fully done
  if (total === 0) {
    buyList.innerHTML = `<div class="empty ok"><div class="eic">${lic('PartyPopper',{size:28})}</div><div class="ttl">Tout est rangé&nbsp;!</div><div class="txt">Votre stock est à jour. La liste est vide — ajoutez des articles ou générez-la depuis vos recettes.</div><button class="btn btn-primary cta" data-add="1"><i data-lucide="plus" class="lic"></i> Ajouter un article</button></div>`;
    stowList.innerHTML = '';
    bind(); refreshIcons(); return;
  }

  // buy column
  if (buy.length === 0) {
    buyList.innerHTML = `<div class="empty ok"><div class="eic">${lic('CircleCheck',{size:28})}</div><div class="ttl">Tout est dans le panier&nbsp;!</div><div class="txt">Il ne reste plus qu'à ranger les articles achetés.</div></div>`;
  } else {
    let h='';
    rowsByRayon(buy).forEach(g=>{
      const done = g.items.filter(i=>i._checked).length;
      h += `<div class="rayon">${lic(g.rayon.ico,{size:15})} ${g.rayon.name}<span class="cn">${done}/${g.items.length}</span></div>`;
      g.items.forEach(i=> h+=buyRow(i));
    });
    buyList.innerHTML = h;
  }

  // stow column
  if (stow.length === 0) {
    stowList.innerHTML = `<div class="empty"><div class="eic">${lic('PackageOpen',{size:28})}</div><div class="ttl">Rien à ranger pour l'instant</div><div class="txt">Cochez un article « à acheter » — il glissera ici pour être rangé au stock.</div></div>`;
  } else {
    let h = `<div class="stow-panel">`;
    rowsByRayon(stow).forEach(g=>{
      h += `<div class="rayon" style="padding-top:8px;">${lic(g.rayon.ico,{size:15})} ${g.rayon.name}<span class="cn">${g.items.length}</span></div>`;
      g.items.forEach(i=> h+=stowRow(i));
    });
    h += `</div>`;
    stowList.innerHTML = h;
  }

  bind(); refreshIcons();
  lastEntered.forEach(id=>{ const el=stowList.querySelector(`.prod[data-id="${id}"]`); if(el){ el.classList.add('entering'); el.addEventListener('animationend',()=>el.classList.remove('entering'),{once:true}); } });
  lastEntered.clear();
}

function refreshIcons(){ if(window.lucide && window.lucide.createIcons) window.lucide.createIcons(); }

function bind(){
  document.querySelectorAll('[data-add]').forEach(b=> b.onclick=()=> toast('Ouverture du formulaire d\'ajout…','＋'));
  buyList.querySelectorAll('[data-check]').forEach(b=> b.onclick=e=>{ e.stopPropagation(); checkItem(+b.dataset.check); });
  buyList.querySelectorAll('[data-del]').forEach(b=> b.onclick=e=>{ e.stopPropagation(); askDelete(+b.dataset.del); });
  stowList.querySelectorAll('[data-back]').forEach(b=> b.onclick=e=>{ e.stopPropagation(); moveBack(+b.dataset.back); });
  stowList.querySelectorAll('[data-stow]').forEach(b=> b.onclick=e=>{ e.stopPropagation(); openAssistant([+b.dataset.stow]); });
  $('#stowAll').onclick = ()=> openAssistant(items.filter(i=>i.state==='stow').map(i=>i.id));
}

function checkItem(id){
  const el = buyList.querySelector(`.prod[data-id="${id}"]`); const it = items.find(i=>i.id===id);
  if(!it||!el) return;
  el.classList.add('done');
  setTimeout(()=>{ el.classList.add('leaving'); setTimeout(()=>{ it.state='stow'; lastEntered.add(id); save(); render(); }, 260); }, 160);
}
function moveBack(id){ const it=items.find(i=>i.id===id); if(!it) return; it.state='buy'; it._checked=false; save(); render(); toast(`${it.name} remis dans « À acheter »`, lic('Undo2',{size:15})); }

let pendingDel=null;
function askDelete(id){ const it=items.find(i=>i.id===id); if(!it) return; pendingDel=id; $('#confirmTxt').textContent=`« ${it.name} » sera retiré de la liste de courses.`; $('#scrim').classList.add('show'); $('#confirm').classList.add('show'); }
function closeConfirm(){ $('#confirm').classList.remove('show'); if(!$('#modal').classList.contains('show')) $('#scrim').classList.remove('show'); }
function removeItem(id){ items=items.filter(i=>i.id!==id); save(); render(); }
$('#confirmCancel').onclick = ()=>{ pendingDel=null; closeConfirm(); };
$('#confirmOk').onclick = ()=>{ if(pendingDel!=null){ const it=items.find(i=>i.id===pendingDel); removeItem(pendingDel); toast(`${it?it.name:'Article'} supprimé`, lic('Trash2',{size:15})); pendingDel=null; } closeConfirm(); };

/* assistant modal */
let queue=[], qIdx=0, sel={lieu:null,date:null};
function openAssistant(ids){ queue=ids.filter(id=>items.find(i=>i.id===id&&i.state==='stow')); if(!queue.length) return; qIdx=0; renderModal(); $('#scrim').classList.add('show'); $('#modal').classList.add('show'); }
function closeAssistant(){ $('#modal').classList.remove('show'); if(!$('#confirm').classList.contains('show')) $('#scrim').classList.remove('show'); }
$('#scrim').onclick = ()=>{ closeAssistant(); if(pendingDel!=null){ pendingDel=null; closeConfirm(); } };

function renderModal(){
  const it = items.find(i=>i.id===queue[qIdx]); if(!it){ closeAssistant(); return; }
  sel = { lieu: SUGGEST[it.rayon]||'frigo', date: it.perish?'1s':'1m' };
  const total = queue.length;
  const m = $('#modal');
  m.innerHTML = `
    <div class="prog">Rangement guidé${total>1?` · article ${qIdx+1} sur ${total}`:''}</div>
    <div class="a-item">
      <div class="thumb" style="background:${it.bg};">${lic(it.emoji,{size:28,color:STROKE[it.bg]||'#1a1d1a'})}</div>
      <div><div class="nm">${it.name}</div><div class="meta">${it.qty} · ${PILL[it.rayon].txt}</div></div>
    </div>
    <div class="fl"><span class="step-n">1</span> Où le ranger&nbsp;?</div>
    <div class="opt-grid" id="lieux">
      ${LIEUX.map(l=>`<button class="opt${sel.lieu===l.key?' sel':''}" data-lieu="${l.key}"><span class="e">${lic(l.e,{size:18})}</span> ${l.label}</button>`).join('')}
    </div>
    <div class="fl"><span class="step-n">2</span> Péremption <span class="opt-lbl">— optionnel</span></div>
    <div class="chip-row" id="dates">
      ${DATES.map(d=>`<button class="dchip${sel.date===d.key?' sel':''}" data-date="${d.key}">${d.label}</button>`).join('')}
    </div>
    <div class="m-actions">
      <button class="secondary" data-skip="1">Passer</button>
      <button class="primary" data-confirm="1">${lic('PackageCheck',{size:16})} ${qIdx<total-1?'Ranger et suivant':'Ranger au stock'}</button>
    </div>`;
  m.querySelectorAll('[data-lieu]').forEach(b=> b.onclick=()=>{ sel.lieu=b.dataset.lieu; m.querySelectorAll('[data-lieu]').forEach(x=>x.classList.toggle('sel',x===b)); });
  m.querySelectorAll('[data-date]').forEach(b=> b.onclick=()=>{ sel.date=b.dataset.date; m.querySelectorAll('[data-date]').forEach(x=>x.classList.toggle('sel',x===b)); });
  m.querySelector('[data-confirm]').onclick = ()=> confirmStow(it.id);
  m.querySelector('[data-skip]').onclick = ()=> nextInQueue(false);
  refreshIcons();
}
function confirmStow(id){ items=items.filter(i=>i.id!==id); save(); nextInQueue(true); }
function nextInQueue(stowed){
  qIdx++;
  if(qIdx>=queue.length){
    closeAssistant(); render();
    const remaining = items.length;
    if(remaining===0) toast('Toutes les courses rangées !', lic('PartyPopper',{size:15}));
    else toast(stowed?'Rangé au stock':'Assistant fermé', stowed?lic('CircleCheck',{size:15}):'');
    return;
  }
  render(); renderModal();
}

let toastT;
function toast(msg, emoji){ const wrap=$('#toastWrap'); const t=document.createElement('div'); t.className='toast'; t.innerHTML=(emoji?`<span class="te">${emoji}</span>`:'')+msg; wrap.appendChild(t); requestAnimationFrame(()=>t.classList.add('show')); setTimeout(()=>{ t.classList.remove('show'); setTimeout(()=>t.remove(),320); }, 2100); }

/* theme */
const themeToggle=$('#themeToggle'), themeLbl=$('#themeLbl');
function applyTheme(t){ document.documentElement.setAttribute('data-theme', t); themeLbl.textContent = t==='dark'?'Clair':'Sombre'; themeToggle.querySelector('i').setAttribute('data-lucide', t==='dark'?'sun':'moon'); refreshIcons(); }
themeToggle.onclick = ()=>{ const cur=document.documentElement.getAttribute('data-theme')==='dark'?'light':'dark'; localStorage.setItem('fresh-theme',cur); applyTheme(cur); };
applyTheme(localStorage.getItem('fresh-theme')||'light');

render();
</script>
</body>
</html>
