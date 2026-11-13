// MakerVault Mobile (Stage 12). An installable web app (https) that keeps its own synced copy of the workshop through
// Google Drive, so it works at home or away, and offline. Built from the Stage 10/11 phone pages: the screens are the
// same, but every answer comes from the phone's own copy (store.js), and changes travel as sync notes (engine.js).
// Text from the library is always set with textContent (never as HTML).
"use strict";
(function () {
  const app = document.getElementById("app");
  const state = { hello: null, projects: null, filament: null, choices: null, online: true, projectChip: "all", projectSearch: "", filTile: "all", filSearch: "", lastScan: null };
  const CONFIG = window.MV_CONFIG || {};
  const E = window.MVEngine;
  let store = E.emptyStore();
  const sync = { phase: "idle", message: "", busy: false };

  // ------------------------------------------------------------------ small helpers
  function h(tag, props, ...kids) {
    const el = document.createElement(tag);
    if (props) for (const [k, v] of Object.entries(props)) {
      if (v === null || v === undefined || v === false) continue;
      if (k === "class") el.className = v;
      else if (k === "text") el.textContent = v;
      else if (k === "style") el.setAttribute("style", v);
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else if (k in el && typeof v !== "string") el[k] = v;
      else el.setAttribute(k, v === true ? "" : v);
    }
    for (const kid of kids.flat()) if (kid !== null && kid !== undefined && kid !== false) el.append(kid.nodeType ? kid : String(kid));
    return el;
  }
  const ICON = {
    projects: "M4 5h16v14H4z M4 10h16", filament: "M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18 M12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6",
    scan: "M4 8V4h4 M16 4h4v4 M20 16v4h-4 M8 20H4v-4 M7 12h10", more: "M5 12h.01 M12 12h.01 M19 12h.01",
    search: "M11 4a7 7 0 1 0 0 14a7 7 0 1 0 0-14 M20 20l-4-4",
    home: "M4 5h16v14H4z M4 10h16", supplies: "M3 7l9-4 9 4v10l-9 4-9-4z M3 7l9 4 9-4 M12 11v10",
    tag: "M6 8a8 8 0 0 1 0 8 M10 6a11 11 0 0 1 0 12 M14 4a14 14 0 0 1 0 16", log: "M6 3h9l4 4v14H6z M9 11h7 M9 15h7 M9 7h3",
    light: "M9 2h6l-1 7h3l-6 13 1-9H8z",
  };
  function icon(name, color, width) {
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 24 24"); svg.setAttribute("fill", "none"); svg.setAttribute("stroke", color || "currentColor");
    svg.setAttribute("stroke-width", width || "1.8"); svg.setAttribute("stroke-linecap", "round"); svg.setAttribute("aria-hidden", "true");
    const p = document.createElementNS(ns, "path"); p.setAttribute("d", ICON[name]); svg.append(p);
    return svg;
  }
  function hex(v) { return /^#[0-9A-Fa-f]{6}$/.test(v || "") ? v : "#8A8F96"; }
  function swatch(color, cls) { const s = h("span", { class: "sw" + (cls ? " " + cls : "") }); s.style.background = hex(color); return s; }
  let toastTimer = 0;
  function toast(text, bad) {
    document.querySelectorAll(".toast").forEach(t => t.remove());
    const t = h("div", { class: "toast" + (bad ? " bad" : ""), role: "status", text });
    document.body.append(t);
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.remove(), bad ? 4500 : 2200);
  }
  function go(hash) { if (location.hash === hash) render(); else location.hash = hash; }

  class ApiError extends Error { constructor(status, message, data) { super(message); this.status = status; this.data = data; } }
  let localApi = null;
  // The same questions the laptop's phone page asked, answered from this phone's own copy (store.js).
  async function api(path, body) {
    try { return await localApi(path, body); }
    catch (e) { if (e instanceof window.MVStore.ApiError) throw new ApiError(e.status, e.message, e.data); throw e; }
  }
  function pill() {
    const n = store.outbox.length;
    switch (sync.phase) {
      case "syncing": return { cls: " busy", text: "Syncing…", label: "Syncing with Google Drive" };
      case "offline": return { cls: " off", text: "Offline" + (n ? " · " + n + " waiting" : ""), label: "Offline. Changes wait on this phone." };
      case "signin": return { cls: " off", text: "Tap to sync", label: "Sign in to Google to sync" };
      case "error": return { cls: " off", text: "Sync problem", label: "Sync problem: " + sync.message };
      case "synced": return { cls: "", text: "Synced", label: "Synced. Tap to sync now." };
      default: return { cls: " busy", text: "Sync", label: "Tap to sync now" };
    }
  }
  function updatePills() { const p = pill(); document.querySelectorAll(".conn").forEach(c => { c.className = "conn" + p.cls; c.lastChild.textContent = p.text; c.setAttribute("aria-label", p.label); }); }
  function conn() {
    const p = pill();
    return h("button", { class: "conn" + p.cls, "aria-label": p.label, onclick: () => { if (sync.phase === "error") toast(sync.message, true); runSync(true); } }, h("i"), p.text);
  }
  function header(title, sub, opts) {
    opts = opts || {};
    return h("header", { class: "top" },
      opts.back ? h("button", { class: "back", "aria-label": "Back", onclick: () => history.length > 1 ? history.back() : go(opts.back) }, "‹") : null,
      h("div", { class: "titles" }, h("h1", { text: title }), sub ? h("div", { class: "sub", text: sub }) : null),
      opts.right === undefined ? conn() : opts.right);
  }
  function tabs(active) {
    const fresh = hash => { state.projects = null; state.filament = null; go(hash); };
    const item = (name, label, hash) => {
      if (name === "scan") return h("button", { class: "scan" + (active === name ? " on" : ""), "aria-label": "Scan", onclick: () => fresh(hash) }, h("span", null, icon("scan", "#FFFFFF", "2")));
      return h("button", { class: active === name ? "on" : "", onclick: () => fresh(hash), "aria-current": active === name ? "page" : null }, icon(name), label);
    };
    return h("nav", { class: "tabs", "aria-label": "Sections" }, h("div", { class: "in" },
      item("home", "Home", "#/home"), item("filament", "Filament", "#/filament"), item("scan", "Scan", "#/scan"), item("supplies", "Supplies", "#/supplies"), item("more", "More", "#/more")));
  }
  function screen(...parts) { app.replaceChildren(...parts.filter(Boolean)); window.scrollTo(0, 0); }
  function searchBox(placeholder, value, onInput) {
    const input = h("input", { type: "search", placeholder, "aria-label": placeholder, value, autocomplete: "off", enterkeyhint: "search" });
    input.addEventListener("input", () => onInput(input.value));
    return h("label", { class: "search" }, icon("search", "#9AA4B2", "2"), input);
  }
  function plural(n, one, many) { return n + " " + (n === 1 ? one : (many || one + "s")); }
  function errorScreen(title, e, back) {
    screen(header(title, "", { back }), h("main", null, h("div", { class: "note warn", text: e.message }),
      h("button", { class: "btn primary wide", onclick: () => render() }, "Try again")), tabs(""));
  }

  // ------------------------------------------------------------------ projects
  async function loadProjects(force) { if (!state.projects || force) state.projects = await api("/api/projects"); return state.projects; }
  function picture(fileId, cls, fallback) {
    const box = h("div", { class: cls });
    if (fileId) {
      const img = h("img", { alt: "", loading: "lazy", decoding: "async", src: "/api/thumb/" + fileId });
      img.addEventListener("error", () => { img.remove(); box.append(h("div", { class: "ph", text: fallback })); });
      box.append(img);
    } else box.append(h("div", { class: "ph", text: fallback }));
    return box;
  }
  async function projectsScreen() {
    const data = await loadProjects();
    const list = h("div", { class: "grid" });
    const chipRow = h("div", { class: "chips", role: "group", "aria-label": "Filter" });
    const chips = [["all", "All"], ["fav", "Favorites"], ["notmade", "Not made yet"]].concat(data.groups.map(g => ["g:" + g.id, g.name]));
    function drawChips() {
      chipRow.replaceChildren(...chips.map(([key, label]) => h("button", { class: "chip" + (state.projectChip === key ? " on" : ""), "aria-pressed": String(state.projectChip === key), onclick: () => { state.projectChip = key; drawChips(); draw(); } }, label)));
    }
    function draw() {
      const words = state.projectSearch.toLowerCase().split(/\s+/).filter(Boolean);
      const shown = data.projects.filter(p => {
        if (state.projectChip === "fav" && !p.favorite) return false;
        if (state.projectChip === "notmade" && !p.notMade) return false;
        if (state.projectChip.startsWith("g:") && !p.groups.includes(state.projectChip.slice(2))) return false;
        const hay = (p.name + " " + p.kind + " " + p.status + " " + p.tags.join(" ") + " " + p.words).toLowerCase();
        return words.every(w => hay.includes(w));
      });
      list.replaceChildren(...shown.map(p => {
        const pic = picture(p.cover, "pic", "Pictures on the computers");
        if (p.favorite) pic.append(h("span", { class: "star", "aria-label": "Favorite", text: "★" }));
        return h("button", { class: "pcard", onclick: () => go("#/project/" + p.id) }, pic,
          h("div", { class: "t" }, h("div", { class: "n", text: p.name }), h("div", { class: "s", text: [p.kind, p.status].filter(Boolean).join(" · ") })));
      }));
      if (!shown.length) list.replaceChildren(h("div", { class: "muted", style: "grid-column: 1 / -1; padding: 20px 0", text: data.projects.length ? "Nothing matches. Clear the search or pick All." : "No projects yet. Add them on the laptop." }));
    }
    drawChips(); draw();
    screen(header("Projects", plural(data.projects.length, "project"), { back: "#/more" }),
      h("main", null, searchBox("Search projects and files", state.projectSearch, v => { state.projectSearch = v; draw(); }), chipRow, list), tabs("more"));
  }
  async function projectScreen(id) {
    const p = await api("/api/projects/" + id);
    const files = h("div", { class: "files" }, p.files.map(f => h("div", { class: "file" },
      f.picture ? picture(f.id, "fi", "") : h("div", { class: "fi", text: (f.name.split(".").pop() || "").toUpperCase().slice(0, 4) }),
      h("div", { class: "m" }, h("div", { class: "n", text: f.name }), h("div", { class: "s", text: [f.role, f.folder, f.missing ? "missing right now" : ""].filter(Boolean).join(" · ") })))));
    screen(header(p.name, [p.kinds.join(", "), p.status].filter(Boolean).join(" · "), { back: "#/projects" }),
      h("main", null,
        picture(p.cover, "big", p.files.length ? "No picture yet. It appears after the laptop has shown this project." : "Pictures show on the computers"),
        p.tags.length || p.groups.length ? h("div", { class: "tags" }, p.groups.map(g => h("span", { class: "tag", text: "▦ " + g })), p.tags.map(t => h("span", { class: "tag", text: t }))) : null,
        p.notes ? h("div", { class: "box" }, h("h2", { text: "Notes" }), h("div", { style: "white-space: pre-wrap", text: p.notes })) : null,
        p.designer || p.source ? h("div", { class: "note", text: [p.designer && "Designer: " + p.designer, p.source && "Source: " + p.source].filter(Boolean).join(" · ") }) : null,
        h("div", { class: "note", text: "Linked files and pictures show on the computers (they open the files from Google Drive)." }), files), tabs("more"));
  }

  // ------------------------------------------------------------------ filament
  async function loadFilament(force) { if (!state.filament || force) state.filament = await api("/api/filament"); return state.filament; }
  function amountText(f) {
    if (!f.open.length) return f.unopened ? "×" + f.unopened : "none";
    return f.open.slice(0, 2).map(r => r.percent === null ? "?" : r.percent + "%").join(" · ") + (f.open.length > 2 ? " …" : "");
  }
  function rollsText(f) {
    const parts = [f.material];
    if (f.unopened) parts.push(f.unopened + " unopened");
    if (f.open.length) parts.push(f.open.length + " open");
    if (!f.unopened && !f.open.length) parts.push("no rolls");
    return parts.join(" · ");
  }
  function replaceFilament(f) {
    if (!state.filament) return;
    const i = state.filament.filaments.findIndex(x => x.id === f.id);
    if (i >= 0) state.filament.filaments[i] = f; else state.filament.filaments.push(f);
    state.filament.counts = null; // recount next time
  }
  function counts(list) {
    return {
      rolls: list.reduce((a, f) => a + f.total, 0), unopened: list.reduce((a, f) => a + f.unopened, 0),
      open: list.reduce((a, f) => a + f.open.length, 0), low: list.filter(f => f.low).length, confirm: list.filter(f => f.confirm).length,
    };
  }
  function matches(f, words) {
    const hay = (f.material + " " + f.brand + " " + f.colour + " " + f.notes + " " + f.diameter).toLowerCase();
    return words.every(w => hay.includes(w));
  }
  async function filamentScreen() {
    const data = await loadFilament();
    const c = counts(data.filaments);
    const tileBox = h("div", { class: "tiles" });
    const list = h("div", { class: "rows" });
    const defs = [["all", "All rolls", c.rolls, ""], ["low", "Running low", c.low, "warn"], ["confirm", "To confirm", c.confirm, "info"], ["unopened", "Unopened", c.unopened, ""], ["open", "Open rolls", c.open, ""]];
    function drawTiles() {
      tileBox.replaceChildren(...defs.map(([key, label, value, cls]) => h("button", {
        class: "tile " + cls + (state.filTile === key ? " on" : ""), "aria-pressed": String(state.filTile === key),
        onclick: () => { state.filTile = state.filTile === key ? "all" : key; drawTiles(); draw(); },
      }, h("div", { class: "l", text: label }), h("div", { class: "v", text: String(value) }))));
      if (defs.length % 2) tileBox.lastChild.style.gridColumn = "1 / -1";
    }
    function draw() {
      const words = state.filSearch.toLowerCase().split(/\s+/).filter(Boolean);
      const t = state.filTile;
      const shown = data.filaments.filter(f =>
        (t === "all" || (t === "low" && f.low) || (t === "confirm" && f.confirm) || (t === "unopened" && f.unopened > 0) || (t === "open" && f.open.length > 0)) && matches(f, words));
      list.replaceChildren(...shown.map(f => {
        // Like the laptop: the Unopened tile counts only unopened rolls, the Open rolls tile only open ones.
        let sub = rollsText(f), amt = amountText(f);
        if (t === "unopened") { sub = f.material + " · " + f.unopened + " unopened"; amt = "×" + f.unopened; }
        if (t === "open") sub = f.material + " · " + f.open.length + " open";
        return h("button", { class: "frow" + (f.low ? " low" : ""), onclick: () => go("#/filament/" + f.id) }, swatch(f.hex),
          h("span", { class: "mid" }, h("span", { class: "n", text: f.name }), h("span", { class: "s", text: sub })), h("span", { class: "amt", text: amt }));
      }));
      if (!shown.length) list.replaceChildren(h("div", { class: "muted", style: "padding: 20px 0", text: data.filaments.length ? "Nothing matches. Clear the search, or tap the highlighted tile again." : "No filament yet. Tap Add, or import your list on the laptop." }));
    }
    drawTiles(); draw();
    const add = h("button", { class: "link", onclick: () => go("#/add") }, "+ Add");
    screen(header("Filament", c.unopened + " unopened · " + c.open + " open", { right: h("div", { style: "display:flex;align-items:center;gap:8px" }, add, conn()) }),
      h("main", null, tileBox, searchBox("Search brand, colour…", state.filSearch, v => { state.filSearch = v; draw(); }), list), tabs("filament"));
  }

  function percentSheet(title, current, onPick) {
    const input = h("input", { class: "text", type: "number", inputmode: "numeric", min: "0", max: "100", value: current === null || current === undefined ? "" : String(current), "aria-label": "Percent left" });
    const close = () => back.remove();
    const pick = v => { if (!(v >= 0 && v <= 100)) { toast("Type a number from 0 to 100.", true); return; } close(); onPick(Math.round(v)); };
    const back = h("div", { class: "sheet-back", onclick: e => { if (e.target === back) close(); } },
      h("div", { class: "sheet", role: "dialog", "aria-label": title },
        h("h3", { text: title }), input,
        h("div", { class: "quick" }, [100, 75, 50, 25, 10, 0].map(v => h("button", { onclick: () => pick(v) }, v + "%"))),
        h("div", { class: "btns" }, h("button", { class: "btn ghost", onclick: close }, "Cancel"), h("button", { class: "btn primary", onclick: () => pick(parseFloat(input.value)) }, "Save"))));
    input.addEventListener("keydown", e => { if (e.key === "Enter") pick(parseFloat(input.value)); });
    document.body.append(back);
    setTimeout(() => input.focus(), 50);
  }
  async function change(id, path, body, done) {
    try {
      const r = await api("/api/filament/" + id + path, body || {});
      replaceFilament(r.filament);
      if (done) done(r.filament);
      return r.filament;
    } catch (e) { if (e.status !== 401) toast(e.message, true); return null; }
  }
  function rollControls(f, roll, i, redraw) {
    const p = roll.percent;
    const bar = h("span", { class: "bar" + (p !== null && p <= 10 ? " low" : "") }, h("b"));
    bar.firstChild.style.width = (p || 0) + "%";
    return h("div", { class: "roll" },
      h("div", { class: "barline" }, bar, h("span", { class: "pct", text: p === null ? "?" : p + "%" })),
      h("div", { class: "btns" },
        h("button", { class: "btn", disabled: p === null || p === 0, "aria-label": "Roll " + (i + 1) + ": 10% less", onclick: () => change(f.id, "/roll/" + roll.id, { delta: -10 }, redraw) }, "−10%"),
        h("button", { class: "btn", "aria-label": "Roll " + (i + 1) + ": type the percent left", onclick: () => percentSheet("How much is left on this roll?", p, v => change(f.id, "/roll/" + roll.id, { percent: v }, redraw)) }, "Type %"),
        h("button", { class: "btn", "aria-label": "Roll " + (i + 1) + ": used up", onclick: () => { if (confirm("This roll is used up? It will be removed from the list.")) change(f.id, "/roll/" + roll.id + "/used-up", {}, redraw); } }, "Used up")));
  }
  async function filamentDetail(id) {
    const data = await api("/api/filament/" + id);
    let f = data.filament;
    replaceFilament(f);
    const body = h("main");
    function draw(next) {
      if (next) f = next;
      const ring = h("div", { class: "ring" }, h("div", { class: "hole" }));
      ring.style.background = hex(f.hex);
      const notes = h("textarea", { class: "text", maxlength: "2000", "aria-label": "Notes" });
      notes.value = f.notes;
      notes.addEventListener("change", () => change(f.id, "/notes", { notes: notes.value }, x => { f = x; toast("Notes saved"); }));
      body.replaceChildren(
        h("div", { class: "spool" }, ring),
        h("div", { class: "box stepper" }, h("span", { class: "l", text: "Unopened" }),
          h("button", { class: "sq", "aria-label": "One less unopened roll", disabled: f.unopened === 0, onclick: () => change(f.id, "/unopened", { delta: -1 }, draw) }, "−"),
          h("span", { class: "num", text: String(f.unopened) }),
          h("button", { class: "sq", "aria-label": "One more unopened roll", onclick: () => change(f.id, "/unopened", { delta: 1 }, draw) }, "+")),
        h("div", { class: "box" }, h("h2", { text: f.open.length ? "Open rolls" : "No open rolls" }),
          f.open.map((r, i) => rollControls(f, r, i, draw)),
          h("button", { class: "btn primary wide", onclick: () => change(f.id, "/open-new", {}, x => { draw(x); toast(f.unopened > 0 ? "Opened a new roll" : "Added an open roll"); }) }, f.unopened > 0 ? "Open a new roll" : "Add an open roll")),
        h("label", { class: "field" }, h("span", { text: "Notes" }), notes),
        h("div", { class: "btns" },
          h("button", { class: "btn ghost", onclick: () => go("#/filament/" + f.id + "/label") }, "QR label"),
          h("button", { class: "btn ghost", onclick: () => go("#/filament/" + f.id + "/barcodes") }, "Barcodes & tags (" + data.barcodes.length + ")"),
          h("button", { class: "btn ghost", onclick: () => go("#/filament/" + f.id + "/nfc") }, "NFC tag")),
        h("div", { class: "note small", style: "margin-top:14px", text: "To change the name, brand or colour, use Edit on the laptop." }));
    }
    draw();
    screen(header(f.name, f.material + " · " + f.diameter + " mm", { back: "#/filament" }), body, tabs("filament"));
  }
  async function barcodesScreen(id) {
    const data = await api("/api/filament/" + id);
    const f = data.filament;
    const list = h("div", { class: "rows" }, data.barcodes.map(code => h("div", { class: "frow" },
      h("span", { class: "mid" }, h("span", { class: "n", text: /^NFC:/.test(code) ? "NFC tag " + code.slice(4) : code })),
      h("button", { class: "btn danger", style: "flex:0 0 auto", onclick: async () => {
        if (!confirm(/^NFC:/.test(code) ? "Forget this NFC tag? The filament stays in your list. Tap the tag again to put it on another roll." : "Forget this barcode? The filament stays in your list.")) return;
        try { await api("/api/barcode/forget", { code }); render(); } catch (e) { toast(e.message, true); }
      } }, "Forget"))));
    screen(header("Barcodes & tags", f.name, { back: "#/filament/" + id }), h("main", null,
      h("div", { class: "note", text: "Barcodes and NFC tags you taught MakerVault for this filament. Forget one to reuse it: tap or scan it again and pick a different roll." }),
      data.barcodes.length ? list : h("div", { class: "muted", text: "None yet. Scan a box's barcode to add one." }),
      h("button", { class: "btn primary wide", style: "margin-top:14px", onclick: () => go("#/scan") }, "Scan a barcode")), tabs("filament"));
  }
  async function labelScreen(id) {
    const data = await api("/api/filament/" + id);
    const label = localLabel("MVF1:" + id);
    const f = data.filament;
    const canvas = drawLabel(f, label);
    const save = h("a", { class: "btn primary wide", style: "display:flex;align-items:center;justify-content:center;text-decoration:none", download: "MakerVault label - " + f.name.replace(/[^\w \-]+/g, "") + ".png", href: canvas.toDataURL("image/png") }, "Save picture");
    screen(header("QR label", f.name, { back: "#/filament/" + id }), h("main", null, canvas,
      h("div", { class: "note", text: "Stick this on the spool or its box. Scanning it opens this filament. Save the picture for a label-printer app, or print sheets of labels from the laptop (Filament › Print labels)." }),
      save), tabs("filament"));
  }
  // The QR code is made here on the phone (ZXing), the same code the laptop prints.
  function localLabel(text) {
    const Z = window.ZXing;
    if (!Z || !Z.QRCodeEncoder) throw new Error("The QR maker didn't load. Reload the page, or print labels on the laptop.");
    const m = Z.QRCodeEncoder.encode(text, Z.QRCodeDecoderErrorCorrectionLevel.M).getMatrix();
    const size = m.getWidth();
    let modules = "";
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) modules += m.get(x, y) === 1 ? "1" : "0";
    return { code: text, size, modules };
  }
  function drawLabel(f, label) {
    const W = 840, H = 420, pad = 30, size = label.size, cell = Math.floor((H - pad * 2) / (size + 8)), qr = cell * (size + 8);
    const c = h("canvas", { class: "label", width: String(W), height: String(H), "aria-label": "Label for " + f.name, role: "img" });
    const g = c.getContext("2d");
    g.fillStyle = "#fff"; g.fillRect(0, 0, W, H);
    g.fillStyle = "#000";
    const ox = pad + cell * 4, oy = (H - qr) / 2 + cell * 4;
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (label.modules[y * size + x] === "1") g.fillRect(ox + x * cell, oy + y * cell, cell, cell);
    const tx = pad + qr + 24, maxW = W - tx - pad;
    const fit = (text, px, weight) => { let s = px; do { g.font = weight + " " + s + "px system-ui, sans-serif"; s -= 2; } while (g.measureText(text).width > maxW && s > 14); };
    g.fillStyle = "#000"; fit(f.colour, 56, "700"); g.fillText(f.colour, tx, 150);
    g.fillStyle = "#222"; fit(f.brand || " ", 38, "500"); g.fillText(f.brand || "", tx, 210);
    fit(f.material + " · " + f.diameter + " mm", 34, "400"); g.fillText(f.material + " · " + f.diameter + " mm", tx, 262);
    g.fillStyle = "#777"; g.font = "400 22px system-ui, sans-serif"; g.fillText("MakerVault", tx, 330);
    const dot = new Path2D(); dot.arc(tx + maxW - 30, 320, 22, 0, Math.PI * 2);
    g.fillStyle = hex(f.hex); g.fill(dot); g.strokeStyle = "#999"; g.lineWidth = 2; g.stroke(dot);
    return c;
  }

  async function loadChoices() { if (!state.choices) state.choices = await api("/api/choices"); return state.choices; }
  async function addScreen(barcode) {
    const ch = await loadChoices();
    let diameter = "1.75";
    const list = (id, items) => h("datalist", { id }, items.map(v => h("option", { value: v })));
    const material = h("input", { class: "text", list: "mv-materials", autocomplete: "off", "aria-label": "Material", placeholder: "PLA, PETG…" });
    const brand = h("input", { class: "text", list: "mv-brands", autocomplete: "off", "aria-label": "Brand", placeholder: "Brand" });
    const colour = h("input", { class: "text", list: "mv-colours", autocomplete: "off", "aria-label": "Colour", placeholder: "Colour name" });
    const preview = swatch("#8A8F96");
    colour.addEventListener("input", () => {
      const known = ch.colours.find(c => c.name.toLowerCase() === colour.value.trim().toLowerCase());
      preview.style.background = hex(known ? known.hex : "#8A8F96");
    });
    let count = 1;
    const num = h("span", { class: "num", text: "1" });
    const step = d => { count = Math.max(0, Math.min(9999, count + d)); num.textContent = String(count); };
    const isOpen = h("input", { type: "checkbox" });
    let openPercent = 100;
    const pctButton = h("button", { class: "btn hidden", onclick: () => percentSheet("How much is left?", openPercent, v => { openPercent = v; pctButton.textContent = "Open roll: " + v + "% left"; }) }, "Open roll: 100% left");
    isOpen.addEventListener("change", () => pctButton.classList.toggle("hidden", !isOpen.checked));
    const seg = h("div", { class: "seg", role: "group", "aria-label": "Diameter" });
    const drawSeg = () => seg.replaceChildren(...ch.diameters.map(d => h("button", { class: d === diameter ? "on" : "", "aria-pressed": String(d === diameter), onclick: () => { diameter = d; drawSeg(); } }, d + " mm")));
    drawSeg();
    const save = h("button", { class: "btn primary wide" }, "Save filament");
    save.addEventListener("click", async () => {
      const body = { material: material.value.trim(), brand: brand.value.trim(), colour: colour.value.trim(), diameter, unopened: count, openPercent: isOpen.checked ? openPercent : null, barcode: barcode || null };
      if (!body.material || !body.colour) { toast("Material and colour are needed.", true); return; }
      if (!count && !isOpen.checked) { toast("Add at least one roll.", true); return; }
      save.disabled = true;
      try {
        const r = await api("/api/filament", body);
        state.filament = null; state.choices = null;
        toast("Saved " + r.filament.name);
        history.replaceState(null, "", "#/filament/" + r.filament.id); render();
      } catch (e) {
        save.disabled = false;
        if (e.status === 409 && e.data && e.data.existing) {
          const ex = e.data.existing;
          if (confirm("You already have " + ex.name + " (" + ex.material + "). Add " + plural(count, "unopened roll") + " to it instead?")) {
            let f = ex;
            if (count) f = await change(ex.id, "/unopened", { delta: count }) || f;
            if (isOpen.checked) f = await change(ex.id, "/open-new", {}) || f;
            if (barcode) { try { await api("/api/barcode", { code: barcode, filamentId: ex.id, addUnopened: false }); } catch (err) { toast(err.message, true); } }
            state.filament = null;
            history.replaceState(null, "", "#/filament/" + ex.id); render();
          }
        } else if (e.status !== 401) toast(e.message, true);
      }
    });
    screen(header(barcode ? "New filament" : "Add filament", barcode ? "Barcode " + barcode : "Pick from the lists or type", { back: barcode ? "#/scan" : "#/filament" }),
      h("main", null, list("mv-materials", ch.materials), list("mv-brands", ch.brands), list("mv-colours", ch.colours.map(c => c.name)),
        h("label", { class: "field" }, h("span", { text: "Material" }), material),
        h("label", { class: "field" }, h("span", { text: "Brand" }), brand),
        h("label", { class: "field" }, h("span", { text: "Colour" }), h("div", { style: "display:flex;gap:10px;align-items:center" }, colour, preview)),
        h("div", { class: "muted small", style: "margin:-4px 0 6px", text: "Diameter" }), seg,
        h("div", { class: "box stepper" }, h("span", { class: "l", text: "Unopened rolls" }), h("button", { class: "sq", "aria-label": "One less", onclick: () => step(-1) }, "−"), num, h("button", { class: "sq", "aria-label": "One more", onclick: () => step(1) }, "+")),
        h("label", { class: "check" }, isOpen, "Also one roll that's already open"), pctButton,
        h("div", { style: "height:12px" }), save), tabs("filament"));
    material.focus();
  }

  // ------------------------------------------------------------------ scanning (photo → read in this browser)
  let readerReady = null;
  function reader() {
    if (!window.ZXing) throw new Error("The scanner didn't load. Reload the page.");
    if (readerReady) return readerReady;
    const Z = window.ZXing, hints = new Map();
    hints.set(Z.DecodeHintType.TRY_HARDER, true);
    hints.set(Z.DecodeHintType.POSSIBLE_FORMATS, [Z.BarcodeFormat.QR_CODE, Z.BarcodeFormat.DATA_MATRIX, Z.BarcodeFormat.EAN_13, Z.BarcodeFormat.EAN_8,
      Z.BarcodeFormat.UPC_A, Z.BarcodeFormat.UPC_E, Z.BarcodeFormat.CODE_128, Z.BarcodeFormat.CODE_39, Z.BarcodeFormat.ITF]);
    const r = new Z.MultiFormatReader(); r.setHints(hints);
    return (readerReady = r);
  }
  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file), img = new Image();
      img.onload = () => resolve({ img, url });
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("That picture couldn't be opened.")); };
      img.src = url;
    });
  }
  function tryRead(img, maxSide, crop) {
    const Z = window.ZXing;
    const sw = img.naturalWidth * crop, sh = img.naturalHeight * crop, sx = (img.naturalWidth - sw) / 2, sy = (img.naturalHeight - sh) / 2;
    const scale = Math.min(1, maxSide / Math.max(sw, sh));
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(sw * scale)); c.height = Math.max(1, Math.round(sh * scale));
    c.getContext("2d", { willReadFrequently: true }).drawImage(img, sx, sy, sw, sh, 0, 0, c.width, c.height);
    try {
      const bitmap = new Z.BinaryBitmap(new Z.HybridBinarizer(new Z.HTMLCanvasElementLuminanceSource(c)));
      return reader().decode(bitmap).getText();
    } catch (e) { return null; } finally { reader().reset(); }
  }
  async function readCode(file) {
    const { img, url } = await loadImage(file);
    try {
      for (const [side, crop] of [[1400, 1], [2200, 1], [1400, 0.6], [900, 1], [2200, 0.5]]) {
        const text = tryRead(img, side, crop);
        if (text) return { text, url };
        await new Promise(r => setTimeout(r, 0));
      }
      return { text: null, url };
    } catch (e) { URL.revokeObjectURL(url); throw e; }
  }
  async function scanScreen() {
    const pad = h("div", { class: "scanpad" }, h("div", { class: "frame" }, h("i")), h("div", { class: "muted", text: "Take a picture of a MakerVault QR label or the barcode on a filament box" }));
    const out = h("div");
    const camera = h("input", { type: "file", accept: "image/*", capture: "environment", class: "hidden" });
    const gallery = h("input", { type: "file", accept: "image/*", class: "hidden" });
    const typed = h("input", { class: "text", inputmode: "numeric", autocomplete: "off", "aria-label": "Barcode number", placeholder: "Or type the barcode number" });
    async function handle(file) {
      if (!file) return;
      pad.replaceChildren(h("div", { class: "muted", text: "Reading the code…" }));
      try {
        const { text, url } = await readCode(file);
        const shot = h("img", { alt: "Your picture", src: url });
        shot.addEventListener("load", () => URL.revokeObjectURL(url));
        if (!text) {
          pad.replaceChildren(shot, h("div", { class: "muted", text: "No code found. Get closer, hold steady, and make sure the whole code is in the picture." }));
          return;
        }
        pad.replaceChildren(shot);
        await lookup(text);
      } catch (e) { pad.replaceChildren(h("div", { class: "muted", text: e.message })); }
    }
    async function lookup(code) {
      out.replaceChildren(h("div", { class: "muted", text: "Looking it up…" }));
      try {
        const r = await api("/api/lookup?code=" + encodeURIComponent(code));
        state.lastScan = r;
        if (r.drawer) { go("#/drawer/" + r.drawer); return; }
        if (r.found) out.replaceChildren(found(r.filament, r.via));
        else if (r.label) out.replaceChildren(h("div", { class: "note warn", text: r.message }));
        else go("#/learn/" + encodeURIComponent(r.code));
      } catch (e) { out.replaceChildren(h("div", { class: "note warn", text: e.message })); }
    }
    function found(f, via) {
      const card = h("div", { class: "result" });
      function draw(x) {
        if (x) f = x;
        const first = f.open[0];
        const what = first ? "open roll at " + (first.percent === null ? "?" : first.percent + "%") : f.unopened + " unopened";
        card.replaceChildren(
          h("div", { class: "who" }, swatch(f.hex), h("div", { style: "flex:1;min-width:0" }, h("div", { style: "font-weight:600", text: f.name + " · " + f.material }),
            h("div", { class: "muted small", text: (via === "label" ? "Found from its QR label" : "Found from its barcode") + " · " + what }))),
          h("div", { class: "btns" },
            first ? h("button", { class: "btn", disabled: first.percent === null || first.percent === 0, onclick: () => change(f.id, "/roll/" + first.id, { delta: -10 }, draw) }, "−10%") : null,
            first ? h("button", { class: "btn", onclick: () => percentSheet("How much is left?", first.percent, v => change(f.id, "/roll/" + first.id, { percent: v }, draw)) }, "Type %") : null,
            h("button", { class: "btn primary", onclick: () => go("#/filament/" + f.id) }, "Open it")));
      }
      draw();
      return card;
    }
    camera.addEventListener("change", () => handle(camera.files[0]));
    gallery.addEventListener("change", () => handle(gallery.files[0]));
    typed.addEventListener("keydown", e => { if (e.key === "Enter" && typed.value.trim()) lookup(typed.value.trim()); });
    screen(header("Scan from a photo", "If the live camera doesn't work", { back: "#/scan" }),
      h("main", null, pad, out, camera, gallery,
        h("button", { class: "btn primary wide", onclick: () => camera.click() }, "Take a picture"),
        h("div", { class: "btns", style: "margin-top:10px" }, h("button", { class: "btn ghost", onclick: () => gallery.click() }, "Choose a picture"),
          h("button", { class: "btn ghost", onclick: () => { if (typed.value.trim()) lookup(typed.value.trim()); else typed.focus(); } }, "Look up number")),
        h("div", { style: "height:10px" }), typed,
        h("div", { class: "note small", style: "margin-top:14px", text: "The picture is read here on the phone and isn't saved or sent anywhere. Tip: the live camera (Scan) doesn't take a picture at all." })), tabs("scan"));
  }
  async function learnScreen(code) {
    const data = await loadFilament(true);
    let pick = null;
    const list = h("div", { class: "rows" });
    const addOne = h("input", { type: "checkbox", checked: !/^NFC:/.test(code) });
    const remember = h("button", { class: "btn primary wide", disabled: true, style: "position:sticky;bottom:72px;z-index:5;box-shadow:0 -8px 16px rgba(0,0,0,.45)" }, "Remember this barcode");
    let words = [];
    function draw() {
      const shown = data.filaments.filter(f => matches(f, words)).slice(0, 80);
      list.replaceChildren(...shown.map(f => {
        const radio = h("input", { type: "radio", name: "pick", checked: pick === f.id, "aria-label": f.name });
        const row = h("label", { class: "frow" + (pick === f.id ? " on" : "") }, radio, swatch(f.hex), h("span", { class: "mid" }, h("span", { class: "n", text: f.name }), h("span", { class: "s", text: rollsText(f) })));
        radio.addEventListener("change", () => { pick = f.id; remember.disabled = false; remember.textContent = (/^NFC:/.test(code) ? "Remember this tag: " : "Remember: ") + f.name; draw(); });
        return row;
      }));
      if (!shown.length) list.replaceChildren(h("div", { class: "muted", text: "No filament matches. Try fewer words, or add it as new." }));
    }
    remember.addEventListener("click", async () => {
      remember.disabled = true;
      try {
        const r = await api("/api/barcode", { code, filamentId: pick, addUnopened: addOne.checked });
        replaceFilament(r.filament);
        toast(/^NFC:/.test(code) ? "Tag remembered" : "Barcode remembered");
        history.replaceState(null, "", "#/filament/" + r.filament.id); render();
      } catch (e) { remember.disabled = false; if (e.status !== 401) toast(e.message, true); }
    });
    draw();
    const tag = /^NFC:/.test(code);
    if (tag) remember.textContent = "Remember this tag";
    screen(header(tag ? "New NFC tag" : "New barcode", (tag ? "Tag " + code.slice(4) : code) + " · not known yet", { back: tag ? "#/filament" : "#/scan" }),
      h("main", null,
        h("div", { class: "note blue", text: tag
          ? "Which roll is this tag on? Pick its filament once and MakerVault remembers the tag. Next time, tapping it opens the filament straight away."
          : "Which filament is this box? Pick it once and MakerVault remembers the barcode. Next time, scanning it finds the filament straight away." }),
        searchBox("Search: brand, material, colour…", "", v => { words = v.toLowerCase().split(/\s+/).filter(Boolean); draw(); }),
        list,
        h("button", { class: "btn dashed wide", style: "margin-top:8px", onclick: () => go("#/add/" + encodeURIComponent(code)) }, "+ It's a new filament"),
        h("label", { class: "check", style: "margin-top:8px" }, addOne, "Also add 1 unopened roll now"),
        remember), tabs("scan"));
  }

  // ------------------------------------------------------------------ NFC tags (Stage 11)
  // A tag holds a link to this laptop ending in  #/tag/f-<filament id>  (or #/tag/<random> for a blank tag that
  // asks which roll it's on the first time). Tags are written once with a free app such as "NFC Tools".
  function tagLink(code) { return location.origin + location.pathname + "#/tag/" + code; }
  async function copyText(text) {
    // The modern clipboard only works on secure (https) pages; the phone page is plain http on your Wi-Fi,
    // so fall back to the older copy command, which phones still allow after a tap.
    try { if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); toast("Link copied"); return; } } catch (e) { }
    const box = document.createElement("textarea");
    box.value = text;
    box.setAttribute("readonly", "");
    box.style.position = "fixed"; box.style.top = "0"; box.style.left = "0"; box.style.opacity = "0";
    document.body.appendChild(box);
    box.focus(); box.select(); box.setSelectionRange(0, text.length);
    let ok = false;
    try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
    box.remove();
    toast(ok ? "Link copied" : "Press and hold the link to copy it", !ok);
  }
  function tagSteps(link) {
    const linkBox = h("div", { class: "box mono", style: "word-break:break-all;user-select:all", text: link });
    const write = h("button", { class: "btn primary wide" }, "Write with this phone");
    write.addEventListener("click", () => writeTag(link, write));
    return [linkBox, "NDEFReader" in window ? write : null,
      h("div", { style: "height:8px" }),
      h("button", { class: "btn wide", onclick: () => copyText(link) }, "Copy the link"),
      h("div", { class: "box", style: "margin-top:12px" }, h("h2", { text: "Or write it with the NFC Tools app (once)" }),
        h("ol", { class: "steps" },
          h("li", { text: "Open the NFC Tools app (free on Google Play)." }),
          h("li", { text: "Write › Add a record › URL / URI." }),
          h("li", { text: "Paste the link exactly as copied (it starts with https://)." }),
          h("li", { text: "Tap Write and hold the tag to the back of the phone." }))),
      h("div", { class: "note small", text: "Tapping the tag with MakerVault Mobile closed: Android asks to open the link, and it opens MakerVault Mobile at this roll. With Tap a tag open, there's no prompt. NTAG213/215/216 tags all work." })];
  }
  async function nfcScreen(id) {
    const data = await api("/api/filament/" + id);
    const f = data.filament;
    screen(header("NFC tag", f.name, { back: "#/filament/" + id }), h("main", null,
      h("div", { class: "note blue", text: "Stick an NFC tag on this roll (or its spool) and write this link to it. Tapping the tag with the phone then opens this filament." }),
      ...tagSteps(tagLink("f-" + f.id))), tabs("filament"));
  }
  function blankTagScreen() {
    const bytes = new Uint8Array(6); crypto.getRandomValues(bytes);
    const code = Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
    screen(header("Blank NFC tags", "Write now, pick the roll later", { back: "#/nfc" }), h("main", null,
      h("div", { class: "note blue", text: "Each tag needs its own link. Write this one to a tag; the first time you tap it, MakerVault asks which roll it's on. For the next tag, tap “New link”." }),
      ...tagSteps(tagLink(code)),
      h("button", { class: "btn ghost wide", style: "margin-top:10px", onclick: () => blankTagScreen() }, "New link")), tabs("more"));
  }
  async function tagScreen(code) {
    const m = /^f-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.exec(code || "");
    const lookupCode = m ? "MVF1:" + m[1] : /^[0-9a-z-]{4,40}$/i.test(code || "") ? "NFC:" + code.toLowerCase() : null;
    if (!lookupCode) { errorScreen("NFC tag", new Error("This tag's link isn't one MakerVault made."), "#/filament"); return; }
    const r = await api("/api/lookup?code=" + encodeURIComponent(lookupCode));
    if (r.found) { history.replaceState(null, "", "#/filament/" + r.filament.id); render(); return; }
    if (r.label) { errorScreen("NFC tag", new Error(r.message), "#/filament"); return; }
    history.replaceState(null, "", "#/learn/" + encodeURIComponent(r.code)); render();
  }

  // ------------------------------------------------------------------ supplies (Stage 11)
  async function suppliesScreen(drawerId) {
    const data = await api("/api/supplies");
    const drawer = drawerId ? data.drawers.find(d => d.id === drawerId) : null;
    if (drawerId && !drawer && drawerId !== "unsorted") { errorScreen("Supplies", new Error("That drawer is not in your supplies any more."), "#/supplies"); return; }
    const body = h("main");
    let words = [];
    function itemRow(x) {
      const n = h("span", { class: "num", text: String(x.quantity) });
      async function step(delta) {
        try {
          const r = await api("/api/supply/" + x.id + "/quantity", { delta });
          Object.assign(x, r.supply); draw();
        } catch (e) { if (e.status !== 401) toast(e.message, true); }
      }
      return h("div", { class: "box stepper" + (x.out ? " out" : x.low ? " low" : "") },
        h("span", { class: "l" }, h("span", { class: "n", text: x.name }), h("span", { class: "s", text: [x.size, x.category, x.out ? "Out" : x.low ? "Low" : ""].filter(Boolean).join(" · ") })),
        h("button", { class: "sq", "aria-label": "One less " + x.name, disabled: x.quantity === 0, onclick: () => step(-1) }, "−"), n,
        h("button", { class: "sq", "aria-label": "One more " + x.name, onclick: () => step(1) }, "+"));
    }
    const inDrawer = x => drawerId === "unsorted" ? !x.drawer : x.drawer === drawerId;
    const list = h("div", { class: "rows" });
    function drawList() {
      const items = data.items.filter(x => inDrawer(x) && words.every(w => (x.name + " " + x.size + " " + x.category + " " + x.notes).toLowerCase().includes(w)));
      list.replaceChildren(...(items.length ? items.map(itemRow) : [h("div", { class: "muted", text: words.length ? "Nothing matches." : "This drawer is empty." })]));
    }
    function draw() {
      if (drawerId) {
        if (!body.firstChild) body.replaceChildren(searchBox("Search this drawer…", "", v => { words = v.toLowerCase().split(/\s+/).filter(Boolean); drawList(); }), list);
        drawList();
        return;
      }
      const drawers = data.drawers.map(d => h("button", { class: "frow", onclick: () => go("#/drawer/" + d.id) },
        h("span", { class: "mid" }, h("span", { class: "n", text: d.name }), h("span", { class: "s", text: plural(d.count, "item") + (d.note ? " · " + d.note : "") }))));
      const unsorted = data.items.filter(x => !x.drawer).length;
      if (unsorted) drawers.push(h("button", { class: "frow", onclick: () => go("#/drawer/unsorted") }, h("span", { class: "mid" }, h("span", { class: "n", text: "Unsorted" }), h("span", { class: "s", text: plural(unsorted, "item") }))));
      body.replaceChildren(
        data.low ? h("button", { class: "note warn wide", style: "text-align:left", onclick: () => go("#/shopping") }, plural(data.low, "item") + " low or out › Shopping list") : "",
        drawers.length ? h("div", { class: "rows" }, drawers) : h("div", { class: "muted", text: "No supplies yet. Add drawers and items on the laptop (Workshop › Supplies)." }));
    }
    draw();
    const title = drawer ? drawer.name : drawerId === "unsorted" ? "Unsorted" : "Supplies";
    const sub = drawer ? (drawer.note || plural(drawer.count, "item")) : drawerId ? "Items not in a drawer" : plural(data.items.length, "item") + " in " + plural(data.drawers.length, "drawer");
    screen(header(title, sub, { back: drawerId ? "#/supplies" : "#/home" }), body, tabs("supplies"));
  }

  // ------------------------------------------------------------------ to print
  async function toPrintScreen() {
    const data = await api("/api/toprint");
    const rows = data.items.map(x => h("div", { class: "box" },
      h("div", { style: "display:flex;gap:10px;align-items:flex-start" },
        h("span", { class: "mid", style: "flex:1;min-width:0" },
          h("span", { class: "n", style: "display:block;font-weight:600", text: x.title + (x.copies > 1 ? "  ×" + x.copies : "") + (x.reprint ? "  · Reprint" : "") }),
          h("span", { class: "s", style: "display:block", text: [x.file, x.plates ? "plate " + x.plates : "", x.machine || "any machine", x.grams ? Math.round(x.grams) + " g" : ""].filter(Boolean).join(" · ") }),
          x.note ? h("span", { class: "s", style: "display:block", text: x.note }) : null),
        h("span", { class: "sws" }, ...x.colours.slice(0, 4).map(c => swatch(c)))),
      h("button", { class: "btn wide", style: "margin-top:10px", onclick: () => go("#/log/" + x.id) }, "Printed it…")));
    const needs = data.needed.map(n => h("div", { class: "s" }, swatch(n.hex), " " + n.name + " · " + Math.round(n.grams) + " g " + (n.enough ? "✓ have" : n.have == null ? "" : "· only ~" + Math.round(n.have) + " g left")));
    screen(header("To print", plural(data.items.length, "thing") + " waiting", { back: "#/home" }),
      h("main", null,
        rows.length ? h("div", null, rows) : h("div", { class: "muted", text: "Nothing on the list. Add things on the laptop (Print log › To print)." }),
        needs.length ? h("div", { class: "box", style: "margin-top:14px" }, h("h2", { text: "Filament needed" }), ...needs) : null), tabs("home"));
  }

  // ------------------------------------------------------------------ the phone's own copy (IndexedDB) and sync
  const DB_NAME = "makervault-mobile";
  function idb() {
    return new Promise((resolve, reject) => {
      const r = indexedDB.open(DB_NAME, 1);
      r.onupgradeneeded = () => r.result.createObjectStore("kv");
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  }
  async function loadStore() {
    try {
      const db = await idb();
      return await new Promise(resolve => {
        const q = db.transaction("kv").objectStore("kv").get("store");
        q.onsuccess = () => resolve(q.result ? JSON.parse(q.result) : null);
        q.onerror = () => resolve(null);
      });
    } catch (e) { return null; }
  }
  async function saveNow() {
    const db = await idb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction("kv", "readwrite");
      tx.objectStore("kv").put(JSON.stringify(store), "store");
      tx.oncomplete = resolve; tx.onerror = () => reject(tx.error);
    });
  }
  let saveTimer = 0, syncTimer = 0;
  function changedLocally() {
    state.filament = null; state.projects = null;
    clearTimeout(saveTimer); saveTimer = setTimeout(() => saveNow().catch(() => toast("Couldn't save on this phone. Is its storage full?", true)), 300);
    clearTimeout(syncTimer); syncTimer = setTimeout(() => runSync(false), 4000);
  }
  function waiting() { try { return E.diff(JSON.parse(JSON.stringify(store)), true).length + store.outbox.length; } catch (e) { return store.outbox.length; } }
  function folderName() { return store.state.test ? "MakerVault Sync (test library)" : (CONFIG.syncFolder || "MakerVault Sync"); }
  function setSync(phase, message) { sync.phase = phase; sync.message = message || ""; updatePills(); }
  async function runSync(interactive) {
    if (!store.state.deviceId || store.state.removed || sync.busy) return;
    if (!navigator.onLine) { setSync("offline"); return; }
    sync.busy = true;
    try {
      const ok = await Drive.ready(interactive);
      if (!ok) { setSync("signin"); return; }
      setSync("syncing");
      const r = await E.sync(store, Drive.cloud, store.state.folderId, saveNow);
      setSync("synced");
      if (r.received > 0) {
        state.filament = null; state.projects = null;
        const h = location.hash;
        if (/^#\/(home|filament|supplies|drawer|toprint|shopping|projects)?$/.test(h) || h === "" || h === "#/") render();
      }
      if (r.notes.length) console.log("Sync notes", r.notes);
    } catch (e) {
      if (e && e.signIn) setSync("signin", e.message);
      else if (!navigator.onLine) setSync("offline");
      else setSync("error", e.message || String(e));
      if (store.state.removed) render();
    } finally { sync.busy = false; }
  }

  // ------------------------------------------------------------------ setup: Google sign-in, then "Use this library"
  async function setupScreen(message) {
    const status = h("div", { class: message ? "note warn" : "hidden", text: message || "" });
    const steps = h("div");
    const configured = !!CONFIG.googleClientId;
    const testBox = h("input", { type: "checkbox", checked: !!store.state.test });
    async function draw() {
      const signed = Drive.signedIn();
      const step = (n, done, on, titleText, detail, extra) => h("div", { class: "box", style: on ? "border-color:var(--blue)" : "" },
        h("div", { style: "display:flex;gap:12px" },
          h("span", { class: "stepdot" + (done ? " done" : on ? " on" : "") }, done ? "✓" : String(n)),
          h("div", { style: "flex:1" }, h("div", { style: "font-weight:600", text: titleText }), h("div", { class: "muted small", style: "margin-top:2px", text: detail }), extra || null)));
      const signButton = h("button", { class: "btn primary wide", style: "margin-top:10px", disabled: !configured, onclick: async () => {
        signButton.disabled = true;
        try { await Drive.ready(true); draw(); } catch (e) { status.className = "note warn"; status.textContent = e.message; signButton.disabled = false; }
      } }, "Sign in with Google");
      let joinPart = null;
      if (signed) {
        joinPart = h("div", { class: "muted small", style: "margin-top:6px", text: "Looking in your Google Drive…" });
        (async () => {
          try {
            const folder = await Drive.findFolder(folderName());
            if (!folder) { joinPart.textContent = "No “" + folderName() + "” folder in your Google Drive yet. Start sync on the laptop first (MakerVault › Sync), then come back."; return; }
            const files = await Drive.cloud.list(folder);
            const devices = [];
            for (const f of files) { const p = E.parseName(f.name); if (p && p.kind === "dev") { try { devices.push(JSON.parse(await Drive.cloud.read(f.id))); } catch (e) { } } }
            const starter = devices.find(d => d.started);
            const name = h("input", { class: "text", value: localStorage.getItem("mv.phoneName") || guessPhoneName(), maxlength: "60", "aria-label": "Name this phone" });
            const use = h("button", { class: "btn primary wide", style: "margin-top:10px" }, "Use this library");
            use.addEventListener("click", async () => {
              use.disabled = true; use.textContent = "Getting your library…";
              try {
                localStorage.setItem("mv.phoneName", name.value.trim() || "Phone");
                const test = !!store.state.test;
                await E.join(store, Drive.cloud, folder, name.value.trim() || "Phone", saveNow);
                store.state.test = test; await saveNow();
                setSync("synced");
                toast("Ready");
                history.replaceState(null, "", location.pathname + location.search + "#/home"); render();
              } catch (e) { status.className = "note warn"; status.textContent = e.message; use.disabled = false; use.textContent = "Use this library"; }
            });
            joinPart.replaceChildren(
              h("div", { text: "Found: started by " + (starter ? starter.name : "your laptop") + " · " + plural(devices.length, "device") }),
              h("label", { class: "field", style: "margin-top:10px" }, h("span", { text: "Name this phone" }), name), use);
          } catch (e) {
            if (!e.signIn) { joinPart.textContent = e.message; return; }
            const again = h("button", { class: "btn primary wide", style: "margin-top:10px", onclick: async () => {
              again.disabled = true;
              try { localStorage.removeItem("mv.consent"); await Drive.ready(true); draw(); } catch (x) { status.className = "note warn"; status.textContent = x.message; again.disabled = false; }
            } }, "Sign in with Google");
            joinPart.replaceChildren(h("div", { text: e.message }), again);
          }
        })();
      }
      steps.replaceChildren(
        step(1, signed, !signed, "Sign in with Google", signed ? "Signed in" + (Drive.email ? " as " + Drive.email : "") : "Your password goes only to Google.",
          signed ? null : configured ? signButton : h("div", { class: "note warn", style: "margin:8px 0 0", text: "MakerVault Mobile isn't connected to Google yet. This is done once, during the Google setup on the laptop." })),
        step(2, false, signed, "Open your MakerVault Sync", signed ? "" : "After signing in", joinPart),
        step(3, false, false, "Install on your home screen", "Opens full screen like an app, with its own icon. Chrome: ⋮ › Add to Home screen (or Install app). iPhone Safari: Share › Add to Home Screen."));
    }
    testBox.addEventListener("change", () => { store.state.test = testBox.checked; draw(); });
    screen(h("div", { class: "hero" }, h("img", { src: "icon-192.png", alt: "", width: "64", height: "64" }),
        h("div", { class: "brand" }, "Maker", h("span", { text: "Vault" }), " Mobile"), h("div", { class: "muted", text: "Your workshop on your phone, at home or away." })),
      h("main", null, status, steps,
        h("label", { class: "check", style: "margin-top:4px" }, testBox, "Use the test library (“MakerVault Sync (test library)”)"),
        h("div", { class: "muted small", style: "margin-top:16px;text-align:center", text: "The address starts with https://, so the live camera and NFC can work." })));
    draw();
  }
  function guessPhoneName() {
    const ua = navigator.userAgent || "";
    const m = /;\s*(Pixel[^;)]*|SM-[^;)]*)[;)]/.exec(ua);
    return m ? m[1].trim().replace(/ Build.*/, "") : /iPhone/.test(ua) ? "iPhone" : "Phone";
  }

  // ------------------------------------------------------------------ home ("Workshop today")
  async function homeScreen() {
    const [fil, sup, tp] = await Promise.all([api("/api/filament"), api("/api/supplies"), api("/api/toprint")]);
    const low = fil.filaments.filter(f => f.low).map(f => ({ hex: f.hex, name: f.name + " " + f.material, sub: "last open roll · " + (f.open.find(o => o.percent !== null && o.percent <= 10) || { percent: "?" }).percent + "%", tag: "Low", go: "#/filament/" + f.id }))
      .concat(sup.items.filter(x => x.out || x.low).map(x => ({ hex: null, name: x.name, sub: [(sup.drawers.find(d => d.id === x.drawer) || {}).name || "Unsorted", x.quantity + " left"].join(" · "), tag: x.out ? "Out" : "Low", go: x.drawer ? "#/drawer/" + x.drawer : "#/drawer/unsorted" })));
    const tile = (icon2, label, go2) => h("button", { class: "htile", onclick: () => go(go2) }, icon(icon2, "#8CC4FF"), h("span", { text: label }));
    const next = tp.items[0];
    const nextNeed = next ? next.lines.reduce((s, l) => s + l.grams, 0) : 0;
    const nextHave = next && next.lines[0] && next.lines[0].filament ? (tp.needed.find(n => n.name.startsWith((fil.filaments.find(f => f.id === next.lines[0].filament) || {}).name || "\u0000")) || {}).have : null;
    const d = new Date();
    screen(header("Workshop", d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }), { right: conn() }),
      h("main", null,
        store.state.removed ? h("div", { class: "note warn", text: "This phone was removed from sync on another device. More › Set up again." }) : null,
        h("div", { class: "htiles" }, tile("tag", "Tap a tag", "#/nfc"), tile("log", "Log a print", "#/log"), tile("projects", "To print · " + tp.items.length, "#/toprint"), tile("supplies", "Shopping list", "#/shopping")),
        h("div", { class: "box" }, h("div", { style: "display:flex;align-items:center" }, h("div", { style: "flex:1;font-weight:600", text: "Low or out" }), h("a", { href: "#/shopping", class: "small", text: "See all" })),
          low.length ? h("div", { class: "rows", style: "margin-top:4px" }, low.slice(0, 6).map(x => h("button", { class: "lrow", onclick: () => go(x.go) }, x.hex ? swatch(x.hex) : h("span", { class: "sw grey" }),
            h("span", { class: "mid" }, h("span", { class: "n", text: x.name }), h("span", { class: "s", text: x.sub })), h("span", { class: "pill low", text: x.tag })))) : h("div", { class: "muted", style: "margin-top:6px", text: "Nothing is low. 👍" })),
        next ? h("button", { class: "box nextbox", onclick: () => go("#/toprint") }, h("div", { style: "font-weight:600;margin-bottom:4px", text: "Next on To print" }),
          h("div", { style: "color:var(--soft)", text: [next.title + (next.copies > 1 ? " ×" + next.copies : ""), next.machine].filter(Boolean).join(" · ") }),
          nextNeed ? h("div", { class: "muted small", style: "margin-top:2px", text: "needs " + Math.round(nextNeed) + " g" + (nextHave != null ? " · you have " + Math.round(nextHave) + " g" : "") }) : null) : null),
      tabs("home"));
  }

  // ------------------------------------------------------------------ live camera (no photos saved)
  let liveStream = null, liveLoop = 0;
  function stopCamera() { cancelAnimationFrame(liveLoop); liveLoop = 0; if (liveStream) { liveStream.getTracks().forEach(t => t.stop()); liveStream = null; } }
  async function liveScanScreen() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { location.hash = "#/scan-photo"; return; }
    let mode = "each";
    const counted = new Map();
    const video = h("video", { playsinline: true, muted: true, autoplay: true, "aria-label": "Camera" });
    video.setAttribute("playsinline", ""); video.muted = true;
    const box = h("div", { class: "livebox" });
    const status = h("div", { class: "livehint", text: "Starting the camera…" });
    const sheet = h("div", { class: "livesheet hidden" });
    const modes = h("div", { class: "livemodes" });
    const light = h("button", { class: "round", "aria-label": "Light", onclick: async () => {
      try { const track = liveStream && liveStream.getVideoTracks()[0]; const on = !light.classList.contains("on"); await track.applyConstraints({ advanced: [{ torch: on }] }); light.classList.toggle("on", on); }
      catch (e) { toast("This phone's browser can't turn the light on here.", true); }
    } }, icon("light", "#E8ECF1"));
    function drawModes() {
      modes.replaceChildren(
        h("button", { class: mode === "each" ? "on" : "", onclick: () => { mode = "each"; drawModes(); } }, "Open each one"),
        h("button", { class: mode === "count" ? "on" : "", onclick: () => { mode = "count"; drawModes(); drawCount(); } }, "Count many"));
    }
    function drawCount() {
      if (mode !== "count") return;
      sheet.className = "livesheet";
      sheet.replaceChildren(h("div", { style: "font-weight:600;margin-bottom:6px", text: counted.size ? "Counted" : "Point at codes one after another" }),
        ...[...counted.values()].map(x => h("button", { class: "lrow", onclick: () => { stopCamera(); go(x.go); } }, x.hex ? swatch(x.hex) : h("span", { class: "sw grey" }), h("span", { class: "mid" }, h("span", { class: "n", text: x.name })), h("span", { class: "pill", text: "×" + x.n }))));
    }
    let last = "", lastAt = 0, busy = false;
    async function found(text) {
      const nowMs = Date.now();
      if (busy || (text === last && nowMs - lastAt < 2500)) return;
      last = text; lastAt = nowMs; busy = true;
      try {
        if (navigator.vibrate) navigator.vibrate(30);
        const r = await api("/api/lookup?code=" + encodeURIComponent(text));
        const drawer = r.drawer ? (await api("/api/supplies")).drawers.find(d => d.id === r.drawer) : null;
        const label = r.found ? { name: r.filament.name + " " + r.filament.material, hex: r.filament.hex, go: "#/filament/" + r.filament.id, sub: (r.via === "label" ? "QR label" : "Barcode") + " · " + rollsText(r.filament) }
          : drawer ? { name: drawer.name, hex: null, go: "#/drawer/" + drawer.id, sub: plural(drawer.count, "item") + (drawer.note ? " · " + drawer.note : "") }
          : r.label ? { name: r.message, hex: null, go: null, sub: "" } : { name: "New code " + r.code, hex: null, go: "#/learn/" + encodeURIComponent(r.code), sub: "Not known yet · tap to teach it" };
        if (mode === "count") { const k = label.go || text; const c = counted.get(k) || Object.assign({ n: 0 }, label); c.n++; counted.set(k, c); drawCount(); return; }
        sheet.className = "livesheet";
        sheet.replaceChildren(
          h("div", { style: "display:flex;align-items:center;gap:10px" }, label.hex ? swatch(label.hex) : icon(drawer ? "supplies" : "scan", "#8CC4FF"),
            h("div", { style: "flex:1;min-width:0" }, h("div", { style: "font-size:17px;font-weight:600", text: label.name }), label.sub ? h("div", { class: "muted small", text: label.sub }) : null),
            h("span", { class: "pill ok", text: r.found || drawer ? "Found" : "New" })),
          h("div", { class: "btns", style: "margin-top:12px" },
            label.go ? h("button", { class: "btn primary", onclick: () => { stopCamera(); go(label.go); } }, drawer ? "Open drawer" : r.found ? "Open it" : "Teach it") : null,
            h("button", { class: "btn", onclick: () => { sheet.className = "livesheet hidden"; last = ""; } }, "Scan next")));
      } catch (e) { toast(e.message, true); }
      finally { busy = false; }
    }
    screen(h("div", { class: "live" }, box,
      h("div", { class: "livetop" }, h("button", { class: "round", "aria-label": "Close", onclick: () => { stopCamera(); go("#/home"); } }, "×"), h("div", { class: "livetitle", text: "Live camera" }), light),
      h("div", { class: "liveframe" }), status, modes, sheet,
      h("div", { class: "livelinks" }, h("button", { class: "linkish", onclick: () => { stopCamera(); go("#/scan-photo"); } }, "Use a photo instead"))));
    drawModes();
    box.append(video);
    try {
      liveStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      video.srcObject = liveStream;
      await video.play();
    } catch (e) {
      status.textContent = e && e.name === "NotAllowedError" ? "MakerVault Mobile needs the camera. Allow it in the address bar (🔒 › Permissions), or use a photo instead." : "The camera couldn't start: " + (e.message || e);
      return;
    }
    status.textContent = "Reads as soon as it's in the frame. No photo needed.";
    let detector = null;
    if ("BarcodeDetector" in window) {
      try { detector = new window.BarcodeDetector({ formats: ["qr_code", "ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "data_matrix", "itf"] }); } catch (e) { detector = null; }
    }
    const canvas = document.createElement("canvas");
    let tick = 0;
    const step = async () => {
      if (!liveStream) return;
      tick++;
      if (!busy && video.readyState >= 2 && tick % (detector ? 4 : 10) === 0) {
        try {
          if (detector) {
            const codes = await detector.detect(video);
            if (codes.length) await found(codes[0].rawValue);
          } else if (window.ZXing) {
            const w = Math.min(960, video.videoWidth), hh = Math.round(video.videoHeight * w / video.videoWidth);
            canvas.width = w; canvas.height = hh;
            canvas.getContext("2d", { willReadFrequently: true }).drawImage(video, 0, 0, w, hh);
            const Z = window.ZXing;
            try { const bmp = new Z.BinaryBitmap(new Z.HybridBinarizer(new Z.HTMLCanvasElementLuminanceSource(canvas))); const text = reader().decode(bmp).getText(); if (text) await found(text); }
            catch (e) { } finally { reader().reset(); }
          }
        } catch (e) { }
      }
      if (liveStream) liveLoop = requestAnimationFrame(step);
    };
    liveLoop = requestAnimationFrame(step);
  }

  // ------------------------------------------------------------------ NFC inside the app (Android Chrome)
  let nfcReader = null, nfcAbort = null;
  function stopNfc() { if (nfcAbort) { nfcAbort.abort(); nfcAbort = null; } nfcReader = null; }
  function tagCodeFrom(text) {
    const m = /#\/tag\/([0-9a-z-]{4,60})/i.exec(text || "");
    return m ? m[1] : /^[0-9a-z-]{4,40}$/i.test(text || "") ? text : null;
  }
  async function nfcReadScreen() {
    const supported = "NDEFReader" in window;
    const keep = h("input", { type: "checkbox", checked: localStorage.getItem("mv.keepListening") !== "0" });
    keep.addEventListener("change", () => localStorage.setItem("mv.keepListening", keep.checked ? "1" : "0"));
    const ring = h("div", { class: "nfcring" + (supported ? " on" : "") }, h("div", null, icon("tag", "#8CC4FF", "2")));
    const words = h("div", { class: "nfcwords", text: supported ? "Tap Start, then hold the back of the phone to a spool." : "This browser can't read NFC tags. Android + Chrome can; iPhone can't from a web page." });
    const sub = h("div", { class: "muted small", style: "text-align:center", text: supported ? "No “Open link” prompt while this screen is open." : "Tags still work: tapping one opens MakerVault Mobile." });
    const card = h("div");
    const start = h("button", { class: "btn primary wide", disabled: !supported }, "Start listening");
    async function shown(code) {
      const lookupCode = /^f-([0-9a-f-]{36})$/i.test(code) ? "MVF1:" + code.slice(2) : "NFC:" + code.toLowerCase();
      try {
        const r = await api("/api/lookup?code=" + encodeURIComponent(lookupCode));
        if (navigator.vibrate) navigator.vibrate(40);
        if (!r.found) {
          if (r.label) { card.replaceChildren(h("div", { class: "note warn", text: r.message })); return; }
          card.replaceChildren(h("div", { class: "box", style: "border-color:var(--blue)" }, h("div", { style: "font-weight:600", text: "New tag " + code }), h("div", { class: "muted small", text: "Not on a roll yet." }),
            h("button", { class: "btn primary wide", style: "margin-top:10px", onclick: () => { stopNfc(); go("#/learn/" + encodeURIComponent(r.code)); } }, "Which roll is it on?")));
          return;
        }
        const f = r.filament, first = f.open[0];
        card.replaceChildren(h("div", { class: "box", style: "border-color:var(--blue)" },
          h("div", { style: "display:flex;align-items:center;gap:12px" }, swatch(f.hex, "big"),
            h("div", { style: "flex:1;min-width:0" }, h("div", { style: "font-weight:600;font-size:15px", text: f.name + " " + f.material }),
              h("div", { class: "muted small", text: (first ? "open roll · " + (first.percent === null ? "?" : first.percent + "%") + " left" : f.unopened + " unopened") + " · tag " + code })),
            h("span", { class: "pill ok", text: "Just read" })),
          h("div", { class: "btns", style: "margin-top:12px" },
            h("button", { class: "btn primary", onclick: () => { stopNfc(); go("#/filament/" + f.id); } }, "Open roll"),
            first ? h("button", { class: "btn", onclick: () => percentSheet("How much is left?", first.percent, v => change(f.id, "/roll/" + first.id, { percent: v }, () => shown(code))) }, "Set % left") : null)));
        if (!keep.checked) stopNfc();
      } catch (e) { toast(e.message, true); }
    }
    start.addEventListener("click", async () => {
      try {
        stopNfc();
        nfcAbort = new AbortController();
        nfcReader = new window.NDEFReader();
        await nfcReader.scan({ signal: nfcAbort.signal });
        words.textContent = "Ready. Hold the back of the phone to a spool.";
        start.textContent = "Listening…"; start.disabled = true;
        nfcReader.onreadingerror = () => toast("That tag couldn't be read. Try again.", true);
        nfcReader.onreading = ev => {
          let code = null;
          for (const rec of ev.message.records) {
            try {
              if (rec.recordType === "url" || rec.recordType === "text" || rec.recordType === "absolute-url") code = code || tagCodeFrom(new TextDecoder().decode(rec.data));
            } catch (e) { }
          }
          if (!code && ev.serialNumber) code = ev.serialNumber.replace(/:/g, "").toLowerCase();
          if (code) shown(code);
        };
      } catch (e) {
        start.disabled = false;
        toast(e.name === "NotAllowedError" ? "Allow NFC for MakerVault Mobile, and turn NFC on in the phone's settings." : "NFC couldn't start: " + (e.message || e), true);
      }
    });
    screen(header("Tap a tag", "Reading inside MakerVault Mobile"), h("main", null, ring, words, sub, card,
      h("div", { style: "height:8px" }), start,
      h("label", { class: "check", style: "margin-top:10px" }, keep, "Keep listening (tap spool after spool)"),
      h("button", { class: "btn dashed wide", style: "margin-top:10px", onclick: () => { stopNfc(); go("#/nfc-write"); } }, "Write a tag for a roll…")), tabs("home"));
    if (supported && localStorage.getItem("mv.nfcOk") === "1") start.click();
  }
  async function nfcWritePick() {
    const data = await loadFilament(true);
    let words = [];
    const list = h("div", { class: "rows" });
    function draw() {
      const shown = data.filaments.filter(f => matches(f, words)).slice(0, 80);
      list.replaceChildren(...shown.map(f => h("button", { class: "frow", onclick: () => go("#/filament/" + f.id + "/nfc") }, swatch(f.hex), h("span", { class: "mid" }, h("span", { class: "n", text: f.name }), h("span", { class: "s", text: rollsText(f) })))));
    }
    draw();
    screen(header("Write a tag", "Pick the roll's filament", { back: "#/nfc" }), h("main", null,
      searchBox("Search: brand, material, colour…", "", v => { words = v.toLowerCase().split(/\s+/).filter(Boolean); draw(); }), list), tabs("home"));
  }
  async function writeTag(link, button) {
    if (!("NDEFReader" in window)) { toast("Writing tags from a web page needs Android + Chrome. Use the NFC Tools app instead.", true); return; }
    try {
      button.disabled = true; button.textContent = "Hold the tag to the back of the phone…";
      await new window.NDEFReader().write({ records: [{ recordType: "url", data: link }] });
      localStorage.setItem("mv.nfcOk", "1");
      toast("Tag written");
      button.textContent = "Written ✓";
    } catch (e) { button.disabled = false; button.textContent = "Write with this phone"; toast(e.name === "NotAllowedError" ? "Allow NFC first." : "Couldn't write the tag: " + (e.message || e), true); }
  }

  // ------------------------------------------------------------------ log a print (filament comes off the rolls)
  async function logScreen(fromId) {
    const [fil, mach, tp] = await Promise.all([api("/api/filament"), api("/api/machines"), api("/api/toprint")]);
    const from = fromId ? tp.items.find(i => i.id === fromId) : null;
    const name = h("input", { class: "text", value: from ? from.title : "", maxlength: "200", "aria-label": "What did you print?", placeholder: "What did you print?" });
    const copies = h("input", { class: "text", value: String(from ? from.copies : 1), inputmode: "numeric", style: "width:80px;text-align:center", "aria-label": "Copies" });
    const machine = h("select", { class: "text", "aria-label": "Machine" }, h("option", { value: "", text: "Any machine" }), ...mach.machines.map(m => h("option", { value: m.id, text: m.name })));
    if (from) { const m = mach.machines.find(x => x.name === from.machine); if (m) machine.value = m.id; }
    const outcome = h("select", { class: "text", "aria-label": "How did it go?" }, h("option", { value: "done", text: "Finished" }), h("option", { value: "failed", text: "Failed" }), h("option", { value: "cancelled", text: "Cancelled" }));
    const percent = h("input", { class: "text", value: "50", inputmode: "numeric", style: "width:80px;text-align:center", "aria-label": "How far it got (%)" });
    const percentRow = h("label", { class: "field hidden" }, h("span", { text: "How far it got (%)" }), percent);
    outcome.addEventListener("change", () => percentRow.classList.toggle("hidden", outcome.value === "done"));
    const lines = h("div");
    const addLine = (filamentId, grams) => {
      const sel = h("select", { class: "text", "aria-label": "Filament" }, h("option", { value: "", text: "Pick a filament…" }), ...fil.filaments.map(f => h("option", { value: f.id, text: f.name + " " + f.material })));
      if (filamentId) sel.value = filamentId;
      const g = h("input", { class: "text", value: grams ? String(Math.round(grams)) : "", inputmode: "decimal", style: "width:90px;text-align:right", "aria-label": "Grams", placeholder: "grams" });
      const row = h("div", { class: "logline" }, sel, g, h("span", { class: "muted", text: "g" }), h("button", { class: "sq", "aria-label": "Remove this filament", onclick: () => row.remove() }, "×"));
      lines.append(row);
    };
    if (from && from.lines.length) from.lines.forEach(l => addLine(l.filament, l.grams)); else addLine();
    const save = h("button", { class: "btn primary wide", style: "margin-top:14px" }, "Log print");
    save.addEventListener("click", async () => {
      const body = { title: name.value, copies: parseInt(copies.value, 10) || 1, machine: machine.value || null, outcome: outcome.value, percent: parseInt(percent.value, 10) || 0, fromToPrint: from ? from.id : null,
        lines: [...lines.children].map(r => ({ filament: r.querySelector("select").value || null, grams: parseFloat(r.querySelector("input").value.replace(",", ".")) || 0 })) };
      if (!body.title.trim()) { toast("Give the print a name.", true); return; }
      save.disabled = true;
      try {
        const r = await api("/api/log", body);
        toast(r.notes.length ? r.notes[0] : "Print logged");
        go("#/home");
      } catch (e) { save.disabled = false; toast(e.message, true); }
    });
    screen(header("Log a print", from ? "From your To print list" : "Filament comes off the rolls", { back: "#/home" }), h("main", null,
      h("label", { class: "field" }, h("span", { text: "What did you print?" }), name),
      h("div", { style: "display:flex;gap:10px" }, h("label", { class: "field" }, h("span", { text: "Copies" }), copies), h("label", { class: "field", style: "flex:1" }, h("span", { text: "Machine" }), machine)),
      h("label", { class: "field" }, h("span", { text: "How did it go?" }), outcome), percentRow,
      h("div", { class: "muted small", style: "margin:6px 0", text: "Filament used (grams for all copies, from the slicer)" }), lines,
      h("button", { class: "btn dashed wide", style: "margin-top:6px", onclick: () => addLine() }, "+ Another filament"),
      save,
      h("div", { class: "note small", style: "margin-top:14px", text: "It takes the grams off the open roll with the least left, like on the laptop. Logging from a sliced 3MF file (plates, colours) stays on the laptop." })), tabs("home"));
  }

  // ------------------------------------------------------------------ shopping list
  async function shoppingScreen() {
    const [fil, sup] = await Promise.all([api("/api/filament"), api("/api/supplies")]);
    const items = sup.items.filter(x => x.out || x.low);
    const lowFil = fil.filaments.filter(f => f.low && f.unopened === 0);
    screen(header("Shopping list", plural(items.length + lowFil.length, "thing"), { back: "#/home" }), h("main", null,
      items.length ? h("div", { class: "box" }, h("h2", { text: "Supplies" }), ...items.map(x => h("div", { class: "lrow" }, h("span", { class: "mid" }, h("span", { class: "n", text: x.name }),
        h("span", { class: "s", text: [x.size, (sup.drawers.find(d => d.id === x.drawer) || {}).name || "Unsorted", x.quantity + " left" + (x.warnBelow ? " (warn below " + x.warnBelow + ")" : "")].filter(Boolean).join(" · ") })),
        x.buyUrl && /^https?:\/\//i.test(x.buyUrl) ? h("a", { class: "pill", href: x.buyUrl, target: "_blank", rel: "noopener noreferrer", text: "Shop" }) : h("span", { class: "pill low", text: x.out ? "Out" : "Low" })))) : null,
      lowFil.length ? h("div", { class: "box" }, h("h2", { text: "Filament (last roll running low)" }), ...lowFil.map(f => h("button", { class: "lrow", onclick: () => go("#/filament/" + f.id) }, swatch(f.hex), h("span", { class: "mid" }, h("span", { class: "n", text: f.name + " " + f.material }), h("span", { class: "s", text: amountText(f) }))))) : null,
      !items.length && !lowFil.length ? h("div", { class: "muted", text: "Nothing to buy right now." }) : null), tabs("supplies"));
  }

  // ------------------------------------------------------------------ more
  async function moreScreen() {
    const conflicts = Object.values(store.conflicts || {}).filter(c => !c.resolved).length;
    const last = store.state.lastSyncUtc ? new Date(store.state.lastSyncUtc).toLocaleString() : "not yet";
    const recent = (store.recent || []).slice(0, 8);
    screen(header("More", store.state.deviceName || ""),
      h("main", null,
        h("div", { class: "box" }, h("h2", { text: "Sync" }),
          h("div", { text: "Last synced " + last + (Drive.email ? " · " + Drive.email : "") }),
          h("div", { class: "muted small", style: "margin-top:4px", text: "“" + folderName() + "” in your Google Drive. Changes made here wait on the phone when it's offline and go out when it's back." }),
          sync.message ? h("div", { class: "note warn", style: "margin:10px 0 0", text: sync.message }) : null,
          conflicts ? h("div", { class: "note warn", style: "margin:10px 0 0", text: plural(conflicts, "thing") + " to check: open MakerVault on the laptop › Sync › Check changes." }) : null,
          h("button", { class: "btn primary wide", style: "margin-top:12px", onclick: async () => { await runSync(true); render(); } }, "Sync now")),
        recent.length ? h("div", { class: "box" }, h("h2", { text: "Recent changes from other devices" }), ...recent.map(r => h("div", { class: "s", style: "padding:4px 0" }, h("span", { style: "color:var(--blue-text)", text: r.device + "  " }), r.text))) : null,
        h("div", { class: "rows" },
          h("button", { class: "frow", onclick: () => go("#/projects") }, icon("projects"), h("span", { class: "mid" }, h("span", { class: "n", text: "Projects" }), h("span", { class: "s", text: "Read only · open files on the computers" }))),
          h("button", { class: "frow", onclick: () => go("#/toprint") }, icon("projects"), h("span", { class: "mid" }, h("span", { class: "n", text: "To print list" }))),
          h("button", { class: "frow", onclick: () => go("#/scan-photo") }, icon("scan"), h("span", { class: "mid" }, h("span", { class: "n", text: "Scan from a photo" }), h("span", { class: "s", text: "If the live camera doesn't work" }))),
          h("button", { class: "frow", onclick: () => go("#/nfc-blank") }, icon("tag"), h("span", { class: "mid" }, h("span", { class: "n", text: "Set up blank NFC tags" })))),
        h("div", { class: "box", style: "margin-top:14px" }, h("h2", { text: "Install" }),
          h("div", { class: "muted", text: "Android (Chrome): ⋮ › Add to Home screen or Install app. iPhone (Safari): Share › Add to Home Screen. It opens full screen with its own icon." })),
        h("button", { class: "btn ghost wide", onclick: async () => {
          if (!confirm("Sign out of Google on this phone? Its copy of the library stays until you set it up again.")) return;
          await Drive.signOut(); setSync("signin"); render();
        } }, "Sign out of Google"),
        h("div", { style: "height:10px" }),
        h("button", { class: "btn ghost danger wide", onclick: async () => {
          if (!confirm("Set up MakerVault Mobile again? Changes not yet sent are lost; everything already synced stays in your Google Drive.")) return;
          store = E.emptyStore(); await saveNow(); location.hash = "#/setup"; render();
        } }, "Set up again"),
        h("div", { class: "muted small", style: "margin-top:18px", text: "MakerVault Mobile (Stage 12). Barcode reading uses ZXing (Apache 2.0). The home Wi-Fi phone page from the laptop (Phone in the sidebar) still works too." })), tabs("more"));
  }

  // ------------------------------------------------------------------ routing
  async function refresh() { state.projects = null; state.filament = null; state.choices = null; await runSync(true); render(); }
  let renderId = 0;
  async function render() {
    const id = ++renderId;
    const raw = location.hash.replace(/^#\/?/, "");
    const parts = raw.split("/").map(decodeURIComponent);
    const [a, b, c] = parts;
    if (a !== "scan") stopCamera();
    if (a !== "nfc") stopNfc();
    try {
      if (!store.state.deviceId || a === "setup") { await setupScreen(); return; }
      if (a === "project" && b) await projectScreen(b);
      else if (a === "projects") await projectsScreen();
      else if (a === "filament" && b && c === "label") await labelScreen(b);
      else if (a === "filament" && b && c === "barcodes") await barcodesScreen(b);
      else if (a === "filament" && b && c === "nfc") await nfcScreen(b);
      else if (a === "tag" && b) await tagScreen(b);
      else if (a === "supplies") await suppliesScreen(null);
      else if (a === "toprint") await toPrintScreen();
      else if (a === "shopping") await shoppingScreen();
      else if (a === "drawer" && b) await suppliesScreen(b);
      else if (a === "nfc-blank") blankTagScreen();
      else if (a === "nfc-write") await nfcWritePick();
      else if (a === "nfc") await nfcReadScreen();
      else if (a === "log") await logScreen(b || null);
      else if (a === "filament" && b) await filamentDetail(b);
      else if (a === "filament") await filamentScreen();
      else if (a === "add") await addScreen(b || "");
      else if (a === "scan") await liveScanScreen();
      else if (a === "scan-photo") await scanScreen();
      else if (a === "learn" && b) await learnScreen(b);
      else if (a === "more") await moreScreen();
      else await homeScreen();
    } catch (e) {
      if (id === renderId) errorScreen("MakerVault", e, "#/home");
    }
    void id;
  }
  async function start() {
    const saved = await loadStore();
    if (saved && saved.version === 1) store = saved;
    localApi = window.MVStore.createApi(() => store, changedLocally, () => ({ paired: true, library: "MakerVault", phone: store.state.deviceName, version: "Mobile" }));
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => { });
    window.addEventListener("hashchange", render);
    window.addEventListener("online", () => runSync(false));
    window.addEventListener("offline", () => setSync("offline"));
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") runSync(false); else { stopCamera(); stopNfc(); } });
    setInterval(() => { if (document.visibilityState === "visible") runSync(false); }, 60000);
    // Opening the app after a while: Google gives a fresh key without asking (a quick trip there and back).
    if (store.state.deviceId && navigator.onLine && Drive.renewOnOpen()) return;
    if (Drive.answer && Drive.answer.error) setSync("signin", "Google wants you to sign in again: tap “Tap to sync”.");
    else if (store.state.deviceId) { setSync(navigator.onLine ? "idle" : "offline"); runSync(false); }
    render();
  }
  start();
})();
