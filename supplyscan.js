// Stage 14: barcodes for supplies (hotends, magnets, nozzles…) — the phone screens.
// Shared by MakerVault Mobile (mobile/supplyscan.js) and the home Wi-Fi phone page (src/MakerVault.Phone/Web/supplyscan.js).
// The two copies must stay identical (the Stage 14 tests check). Each app passes in its own small helpers (ui).
// Text from the library is always set with textContent (never as HTML).
"use strict";
(function (root) {
  root.MVSupplyScreens = function (ui) {
    const { h, api, go, screen, header, tabs, toast, searchBox, plural, render } = ui;
    const enc = encodeURIComponent;
    const BOX = "M3 7l9-4 9 4v10l-9 4-9-4z M3 7l9 4 9-4 M12 11v10", ROLL = "M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18 M12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6";
    function draw(path, color) {
      const ns = "http://www.w3.org/2000/svg";
      const svg = document.createElementNS(ns, "svg");
      svg.setAttribute("viewBox", "0 0 24 24"); svg.setAttribute("fill", "none"); svg.setAttribute("stroke", color || "#8CC4FF");
      svg.setAttribute("stroke-width", "1.8"); svg.setAttribute("stroke-linecap", "round"); svg.setAttribute("stroke-linejoin", "round"); svg.setAttribute("aria-hidden", "true");
      const p = document.createElementNS(ns, "path"); p.setAttribute("d", path); svg.append(p);
      return h("span", { class: "ic" }, svg);
    }
    const stockText = x => x.out ? "out" : x.quantity + " in stock" + (x.low ? " · low" : "");
    const subText = x => [x.drawerName || "Unsorted", stockText(x)].join(" · ");
    const fullName = (maker, model, name) => [maker, model].map(p => (p || "").trim()).filter(p => p && !(name || "").trim().toLowerCase().startsWith(p.toLowerCase())).concat([(name || "").trim()]).filter(Boolean).join(" ");
    async function step(x, delta) {
      const r = await api("/api/supply/" + x.id + "/quantity", { delta });
      Object.assign(x, r.supply);
      return x;
    }

    // ------------------------------------------------------------------ 2: a scan found a supply
    // Returns the result card: +1 to stock / Used 1 / Open it / Scan next.
    function foundCard(x, opts) {
      opts = opts || {};
      const card = h("div", { class: opts.sheet ? "" : "result" });
      const sub = h("div", { class: "muted small" });
      const used = h("button", { class: "btn" }, "Used 1");
      function redraw() { sub.textContent = "Supply · " + (x.drawerName ? "drawer “" + x.drawerName + "”" : "Unsorted") + " · " + stockText(x); used.disabled = x.quantity === 0; }
      async function change(delta, word) {
        try { await step(x, delta); redraw(); toast(word + " · " + x.quantity + " left"); if (opts.changed) opts.changed(x); }
        catch (e) { if (e.status !== 401) toast(e.message, true); }
      }
      used.addEventListener("click", () => change(-1, "Used 1"));
      card.append(
        h("div", { style: "display:flex;align-items:center;gap:10px" }, draw(BOX),
          h("div", { style: "flex:1;min-width:0" }, h("div", { style: "font-size:17px;font-weight:600", text: x.name }), sub),
          h("span", { class: "pill ok", text: "Found" })),
        h("div", { class: "btns", style: "margin-top:12px" }, h("button", { class: "btn primary", onclick: () => change(1, "+1 to stock") }, "+1 to stock"), used),
        h("div", { class: "btns", style: "margin-top:10px" },
          h("button", { class: "btn", onclick: () => { if (opts.leave) opts.leave(); go("#/supply/" + x.id); } }, "Open it"),
          opts.next ? h("button", { class: "btn", onclick: opts.next }, "Scan next") : null));
      redraw();
      return card;
    }

    // "Count many": scanning 6 bags of magnets counts 6; this adds them to stock in one go.
    async function addCounted(x, n) {
      const r = await api("/api/supply/" + x.id + "/quantity", { delta: n });
      Object.assign(x, r.supply);
      toast("+" + n + " to stock · " + x.name + " · " + x.quantity + " now");
      return x;
    }

    // ------------------------------------------------------------------ 3: a new barcode — filament or a supply?
    function chooseScreen(code) {
      const row = (path, name, sub, hash) => h("button", { class: "frow kind", onclick: () => go(hash) }, draw(path),
        h("span", { class: "mid" }, h("span", { class: "n", text: name }), h("span", { class: "s", text: sub })), h("span", { class: "chev", text: "›" }));
      screen(header("New barcode", code + " · not known yet", { back: "#/scan" }),
        h("main", null,
          h("div", { class: "note blue", text: "What is this? Pick once, and MakerVault remembers the barcode. Next time, scanning it finds it straight away." }),
          h("div", { class: "rows" },
            row(ROLL, "Filament", "A roll or a box of rolls", "#/learn/" + enc(code) + "/filament"),
            row(BOX, "A supply", "Hotends, magnets, nozzles, glue, screws…", "#/learn/" + enc(code) + "/supply")),
          h("div", { class: "muted small", style: "margin-top:14px", text: "Tip: a code that's already known goes straight to its filament or supply. This question only appears the first time." })),
        tabs("scan"));
    }

    // ------------------------------------------------------------------ 4: which supply is it?
    async function pickScreen(code) {
      const data = await api("/api/supplies");
      let pick = null, words = [];
      const list = h("div", { class: "rows" });
      const addOne = h("input", { type: "checkbox", checked: true });
      const remember = h("button", { class: "btn primary wide", disabled: true, style: "position:sticky;bottom:72px;z-index:5;box-shadow:0 -8px 16px rgba(0,0,0,.45)" }, "Remember this barcode");
      function drawList() {
        const shown = data.items.filter(x => words.every(w => (x.name + " " + x.size + " " + x.category + " " + (x.drawerName || "") + " " + x.notes).toLowerCase().includes(w))).slice(0, 120);
        list.replaceChildren(...shown.map(x => {
          const radio = h("input", { type: "radio", name: "pick", checked: pick === x.id, "aria-label": x.name });
          radio.addEventListener("change", () => { pick = x.id; remember.disabled = false; remember.textContent = "Remember: " + x.name; drawList(); });
          return h("label", { class: "frow" + (pick === x.id ? " on" : "") }, radio,
            h("span", { class: "mid" }, h("span", { class: "n", text: x.name }), h("span", { class: "s", text: [x.size, subText(x)].filter(Boolean).join(" · ") })));
        }));
        if (!shown.length) list.replaceChildren(h("div", { class: "muted", text: data.items.length ? "No supply matches. Try fewer words, or add it as new." : "No supplies yet. Add it as a new supply." }));
      }
      remember.addEventListener("click", async () => {
        remember.disabled = true;
        try {
          const r = await api("/api/supply-barcode", { code, supplyId: pick, addOne: addOne.checked });
          toast("Barcode remembered" + (addOne.checked ? " · +1 to stock" : ""));
          history.replaceState(null, "", "#/supply/" + r.supply.id); render();
        } catch (e) { remember.disabled = false; if (e.status !== 401) toast(e.message, true); }
      });
      drawList();
      screen(header("Which supply?", "Barcode " + code, { back: "#/learn/" + enc(code) }),
        h("main", null,
          searchBox("Search: name, maker, size, drawer…", "", v => { words = v.toLowerCase().split(/\s+/).filter(Boolean); drawList(); }),
          list,
          h("button", { class: "btn dashed wide", style: "margin-top:8px", onclick: () => go("#/add-supply/" + enc(code)) }, "+ It's a new supply"),
          h("label", { class: "check", style: "margin-top:8px" }, addOne, "Also add 1 to stock now"),
          remember), tabs("scan"));
    }

    // ------------------------------------------------------------------ 5: a new supply (from a barcode) / edit a supply
    async function formScreen(code, id) {
      const [ch, cur] = await Promise.all([api("/api/supply-choices"), id ? api("/api/supply/" + id) : Promise.resolve(null)]);
      const x = cur ? cur.supply : null;
      const dl = (lid, items) => h("datalist", { id: lid }, items.map(v => h("option", { value: v })));
      const text = (label, value, extra) => h("input", Object.assign({ class: "text", value: value || "", autocomplete: "off", "aria-label": label }, extra || {}));
      const maker = text("Maker", x ? x.maker : "", { list: "mv-makers", placeholder: "e.g. Bambu Lab", maxlength: "60" });
      const model = text("Model", x ? x.model : "", { list: "mv-models", placeholder: "e.g. H2C", maxlength: "60" });
      const name = text("Name", x ? x.baseName : "", { placeholder: "e.g. Hotend 0.4 mm", maxlength: "100" });
      const shows = h("div", { class: "muted small", style: "margin:-6px 0 12px" });
      const drawShows = () => { const n = fullName(maker.value, model.value, name.value); shows.textContent = n ? "Shows as: " + n : "Shows as: maker + model + name"; };
      [maker, model, name].forEach(i => i.addEventListener("input", drawShows));
      const drawer = h("select", { class: "text", "aria-label": "Drawer" }, h("option", { value: "", text: "Unsorted" }), ch.drawers.map(d => h("option", { value: d.id, text: d.name })));
      drawer.value = x ? (x.drawer || "") : "";
      const cats = x && x.category && !ch.categories.includes(x.category) ? ch.categories.concat([x.category]) : ch.categories;
      const category = h("select", { class: "text", "aria-label": "Category" }, cats.map(c => h("option", { value: c, text: c })));
      category.value = x ? x.category : "Other";
      const qty = text("How many now", x ? String(x.quantity) : "1", { type: "number", inputmode: "numeric", min: "0", max: "1000000" });
      const warn = text("Warn below", x ? String(x.warnBelow) : "0", { type: "number", inputmode: "numeric", min: "0", max: "1000000" });
      const size = text("Size or note", x ? x.size : "", { placeholder: "e.g. 6 × 3 mm, N52", maxlength: "60" });
      const buy = text("Where to buy", x ? x.buyUrl : "", { type: "url", inputmode: "url", placeholder: "Shop link (optional)" });
      const save = h("button", { class: "btn primary wide", style: "margin-top:6px" }, x ? "Save" : code ? "Add supply and remember barcode" : "Add supply");
      save.addEventListener("click", async () => {
        if (!name.value.trim()) { toast("Give the item a name.", true); name.focus(); return; }
        const q = parseInt(qty.value, 10), w = parseInt(warn.value || "0", 10);
        if (!x && (isNaN(q) || q < 0)) { toast("How many: a whole number, 0 or more.", true); return; }
        if (isNaN(w) || w < 0) { toast("Warn below: a whole number, 0 or more.", true); return; }
        const body = { maker: maker.value.trim(), model: model.value.trim(), name: name.value.trim(), drawer: drawer.value || null, category: category.value, quantity: x ? undefined : q, warnBelow: w, size: size.value.trim(), buyUrl: buy.value.trim(), barcode: x ? null : (code || null) };
        save.disabled = true;
        try {
          const r = await api(x ? "/api/supply/" + x.id : "/api/supply", body);
          toast(x ? "Saved" : "Added " + r.supply.name);
          history.replaceState(null, "", "#/supply/" + r.supply.id); render();
        } catch (e) { save.disabled = false; if (e.status !== 401) toast(e.message, true); }
      });
      const field = (label, el) => h("label", { class: "field" }, h("span", { text: label }), el);
      drawShows();
      screen(header(x ? "Edit supply" : "New supply", x ? x.name : code ? "Barcode " + code : "Add something you keep", { back: x ? "#/supply/" + x.id : code ? "#/learn/" + enc(code) + "/supply" : "#/supplies" }),
        h("main", null, dl("mv-makers", ch.makers), dl("mv-models", ch.models),
          h("div", { class: "pair" }, field("Maker", maker), field("Model", model)),
          field("Name", name), shows,
          field("Drawer", drawer), field("Category", category),
          h("div", { class: "pair" }, x ? null : field("How many now", qty), field("Warn below (0 = never)", warn)),
          field("Size or note (optional)", size), field("Where to buy (optional)", buy),
          save,
          code && !x ? h("div", { class: "muted small", style: "margin-top:8px", text: "Next scan of this barcode opens it, with +1 / Used 1." }) : null), tabs(code ? "scan" : "supplies"));
    }

    // ------------------------------------------------------------------ one supply: count, details, barcodes
    async function detailScreen(id) {
      const data = await api("/api/supply/" + id);
      const x = data.supply;
      const n = h("span", { class: "num", text: String(x.quantity) });
      const minus = h("button", { class: "sq", "aria-label": "Used 1", disabled: x.quantity === 0 }, "−");
      const state = h("span", { class: "s" });
      const redraw = () => { n.textContent = String(x.quantity); minus.disabled = x.quantity === 0; state.textContent = x.out ? "Out" : x.low ? "Low · warn below " + x.warnBelow : x.warnBelow ? "Warn below " + x.warnBelow : ""; };
      async function change(delta) { try { await step(x, delta); redraw(); } catch (e) { if (e.status !== 401) toast(e.message, true); } }
      minus.addEventListener("click", () => change(-1));
      const codes = h("div", { class: "rows" });
      function drawCodes() {
        codes.replaceChildren(...(data.barcodes.length ? data.barcodes.map(b => h("div", { class: "coderow" },
          h("span", { class: "mid" }, h("span", { class: "mono", text: b.code }), h("span", { class: "s", text: [b.addedBy ? "added from " + b.addedBy : "", b.added ? new Date(b.added).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : ""].filter(Boolean).join(" · ") })),
          h("button", { class: "btn ghost small", onclick: async () => {
            if (!confirm("Forget barcode " + b.code + "? Scanning it will ask again what it is.")) return;
            try { await api("/api/supply-barcode/forget", { code: b.code }); data.barcodes = data.barcodes.filter(c => c.code !== b.code); drawCodes(); toast("Barcode forgotten"); }
            catch (e) { if (e.status !== 401) toast(e.message, true); }
          } }, "Forget"))) : [h("div", { class: "muted small", text: "No barcode yet. Scan the code on its box or bag: MakerVault asks what it is and remembers it." })]));
      }
      drawCodes(); redraw();
      const info = [x.size && ["Size", x.size], ["Category", x.category], x.notes && ["Notes", x.notes]].filter(Boolean);
      screen(header(x.name, [x.drawerName || "Unsorted", x.category].filter(Boolean).join(" · "), { back: "#/drawer/" + (x.drawer || "unsorted") }),
        h("main", null,
          h("div", { class: "box stepper" + (x.out ? " out" : x.low ? " low" : "") }, h("span", { class: "l" }, h("span", { class: "n", text: "In stock" }), state),
            minus, n, h("button", { class: "sq", "aria-label": "One more", onclick: () => change(1) }, "+")),
          h("div", { class: "box" }, h("div", { style: "font-weight:600;margin-bottom:6px", text: x.name }), info.map(([k, v]) => h("div", { class: "kv" }, h("span", { class: "muted", text: k }), h("span", { text: v }))),
            x.buyUrl ? h("a", { class: "small", href: x.buyUrl, target: "_blank", rel: "noopener noreferrer", text: "Open shop link" }) : null),
          h("div", { class: "box" }, h("div", { style: "display:flex;align-items:center;margin-bottom:6px" }, h("div", { style: "flex:1;font-weight:600", text: "Barcodes" }),
            h("span", { class: "muted small", text: plural(data.barcodes.length, "code") })), codes,
            h("button", { class: "btn ghost wide", style: "margin-top:10px", onclick: () => go("#/scan") }, "Scan a barcode")),
          h("div", { class: "btns" }, h("button", { class: "btn", onclick: () => go("#/supply/" + x.id + "/edit") }, "Edit"),
            h("button", { class: "btn", onclick: () => go("#/drawer/" + (x.drawer || "unsorted")) }, "Open drawer")),
          h("button", { class: "btn ghost danger wide", style: "margin-top:18px", onclick: async () => {
            if (!confirm("Delete " + x.name + "? Its count and barcodes go too, and projects that use it stop listing it. Your other supplies aren't touched.")) return;
            try { const r = await api("/api/supply/" + x.id + "/delete", {}); toast("Deleted " + x.name); history.replaceState(null, "", "#/drawer/" + (r.drawer || "unsorted")); render(); }
            catch (e) { if (e.status !== 401) toast(e.message, true); }
          } }, "Delete item")), tabs("supplies"));
    }

    return { foundCard, addCounted, chooseScreen, pickScreen, formScreen, detailScreen, subText };
  };
})(typeof self !== "undefined" ? self : globalThis);
