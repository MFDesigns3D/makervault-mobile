// MakerVault Mobile — the phone's own answers to the screens (Stage 12). The Stage 10/11 phone pages asked the laptop
// (/api/...); MakerVault Mobile answers the same questions from its synced copy of the library, so it works anywhere,
// even offline. Every change is a plain edit of the copy; the sync engine turns it into change notes.
"use strict";
(function (root) {
  const E = root.MVEngine;

  // ------------------------------------------------------------------ rules ported from MakerVault.Core
  const COMMON_MATERIALS = ["PLA", "PLA Basic", "PLA Matte", "PLA Silk", "PLA Silk Dual", "PLA+", "PLA-CF", "PLA Sparkle", "PLA Marble", "PLA Wood", "PLA Gradient", "Support for PLA",
    "PETG", "PETG-HF", "PETG-CF", "PETG Translucent", "TPU 95A", "TPU 90A", "TPU 85A", "TPU for AMS", "ABS", "ABS-GF", "ASA", "PC", "PA-CF", "PVA"];
  const COMMON_BRANDS = ["Bambu Lab", "Elegoo", "eSun", "Polymaker", "Sunlu", "Overture", "Prusament", "Hatchbox", "Jayo", "Kingroon", "Creality", "Anycubic", "Snapmaker", "E3D", "Eryone", "Geeetech", "Giantarm"];
  const LOW_PERCENT = 10, MAX_UNOPENED = 9999, MAX_OPEN = 999, MAX_NOTES = 2000, DEFAULT_ROLL_GRAMS = 1000;
  const KNOWN = [["pine green", "#0B5C4E"], ["sea green", "#2E8B6F"], ["forest green", "#1F5A2E"], ["hunter green", "#2B5B3A"], ["olive green", "#6B7A2E"], ["mint", "#8FD9B6"],
    ["lime", "#8FD13A"], ["sky blue", "#6CC4F0"], ["light blue", "#8CC8F2"], ["dark blue", "#1B2F7A"], ["navy", "#1B2A5C"], ["marine blue", "#1D3F8F"],
    ["cobalt blue", "#2547B8"], ["royal blue", "#2A4FCC"], ["azure", "#3FA9F5"], ["cyan", "#0EA5D8"], ["turquoise", "#1FB5AE"], ["teal", "#14857F"],
    ["sky grey", "#A9B4BF"], ["sky gray", "#A9B4BF"], ["dark grey", "#45494F"], ["dark gray", "#45494F"], ["light grey", "#C3C8CE"], ["light gray", "#C3C8CE"],
    ["charcoal", "#33363B"], ["silver", "#BFC4CA"], ["ash", "#9DA2A8"], ["gold", "#C9A23A"], ["bronze", "#A0703C"], ["copper", "#B8693B"],
    ["sunflower yellow", "#F2B705"], ["lemon yellow", "#F2EA3A"], ["yellow", "#F5D90A"], ["orange", "#F07A1E"], ["red", "#D3262E"], ["fire engine red", "#CE1F26"],
    ["magenta", "#D6278A"], ["light pink", "#F2B6C6"], ["pink", "#EE7FAF"], ["purple", "#7A3FB5"], ["violet", "#8A4FD6"], ["lavender", "#B9A4E0"],
    ["cocoa brown", "#6B4330"], ["latte brown", "#A87C5B"], ["red brown", "#7B3B2A"], ["brown", "#7A5032"], ["beige", "#D9C7A5"], ["tan", "#C8A97E"],
    ["skin", "#E5B99A"], ["wood", "#B08A5E"], ["ivory", "#F4EEDC"], ["white", "#F2F2F2"], ["black", "#1B1B1B"], ["grey", "#8A8F96"], ["gray", "#8A8F96"],
    ["green", "#2E9E44"], ["blue", "#1F5FD1"], ["gilded rose", "#D79A8A"], ["galaxy purple", "#4B2A6E"], ["marble", "#D8D6D2"], ["macaron", "#E9B8C9"],
    ["hot pink", "#E8338A"], ["dark green", "#1E5E32"], ["royal purple", "#5B2C9E"], ["dark turquoise", "#12807A"], ["desert tan", "#C9A878"],
    ["midnight blaze", "#3A2A6E"], ["blue hawaii", "#1E9BD7"], ["arctic whisper", "#CFE6F2"], ["translucent", "#D7E4EE"], ["support", "#E6E2D3"], ["nebula", "#3B2D5C"]];
  const title = s => s.replace(/\b\w/g, c => c.toUpperCase());
  const COLOUR_NAMES = [...new Set(KNOWN.map(k => title(k[0])).filter(n => !["Translucent", "Support", "Gray", "Sky Gray", "Dark Gray", "Light Gray"].includes(n)))].sort();
  function guessColour(name) {
    const words = (name || "").toLowerCase().split(/[ \/\-_,()?&+]+/).filter(Boolean);
    const before = words.length;
    const kept = words.filter(w => !["translucent", "transparent", "clear"].includes(w));
    const translucent = kept.length !== before;
    const text = " " + kept.join(" ") + " ";
    let best = null;
    for (const [n, hex] of KNOWN) {
      const at = text.indexOf(" " + n + " ");
      if (at < 0) continue;
      if (!best || at < best.at || (at === best.at && n.length > best.n.length)) best = { at, n, hex };
    }
    if (!best) return translucent ? "#D7E4EE" : "#8A8F96";
    if (!translucent) return best.hex;
    const c = i => parseInt(best.hex.substr(i, 2), 16), p = i => Math.round(c(i) * 0.65 + 255 * 0.35).toString(16).toUpperCase().padStart(2, "0");
    return "#" + p(1) + p(3) + p(5);
  }
  function materialGroup(m) {
    m = (m || "").toUpperCase();
    for (const g of ["PETG", "TPU", "ASA", "ABS", "PLA", "PC"]) if (m.includes(g)) return g;
    return "Other";
  }
  const clean = s => (s || "").split(/\s+/).filter(Boolean).join(" ");
  const diameterText = d => (Math.round(Number(d) * 100) / 100).toFixed(2);
  const nameKey = (m, b, c, d) => [clean(m).toUpperCase(), clean(b).toUpperCase(), clean(c).toUpperCase(), diameterText(d)].join("\u001F");
  const isHex = h => /^#[0-9A-Fa-f]{6}$/.test(h || "");
  const int = s => { const n = parseInt(s, 10); return isNaN(n) ? 0 : n; };
  const now = () => new Date().toISOString();
  const cleanCode = code => { const c = (code || "").replace(/[\u0000-\u001f\u007f]/g, "").trim(); return c.length === 0 || c.length > 200 ? null : c; };
  const GUID = "([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})";
  const parseLabel = (code, prefix) => { const m = new RegExp("^" + prefix + GUID + "$", "i").exec((code || "").trim()); return m ? m[1].toLowerCase() : null; };

  class ApiError extends Error { constructor(status, message, data) { super(message); this.status = status; this.data = data; } }
  const fail = (status, message, data) => { throw new ApiError(status, message, data); };

  function createApi(getStore, changed, info) {
    const T = name => getStore().tables[name];
    const rollGrams = id => { const r = T("filament_roll_grams")[id]; return r ? int(r.grams) : DEFAULT_ROLL_GRAMS; };

    function filament(row) {
      const rolls = Object.values(T("filament_open_rolls")).filter(r => r.filament_id === row.id).sort((a, b) => int(a.position) - int(b.position));
      const open = rolls.map(r => ({ id: r.id, percent: int(r.percent_left) < 0 ? null : int(r.percent_left) }));
      const unopened = int(row.unopened);
      return {
        id: row.id, name: row.brand ? row.brand + " " + row.colour : row.colour, material: row.material, brand: row.brand, colour: row.colour, hex: row.color_hex,
        diameter: row.diameter_mm, notes: row.notes || "", unopened, open, total: unopened + open.length, group: materialGroup(row.material),
        low: open.some(o => o.percent !== null && o.percent <= LOW_PERCENT), confirm: open.some(o => o.percent === null) || /confirm/i.test(row.notes || ""),
      };
    }
    const filaments = () => Object.values(T("filaments")).sort((a, b) => (a.name_key < b.name_key ? -1 : 1)).map(filament);
    const supply = x => {
      const q = int(x.quantity), w = int(x.warn_below);
      return { id: x.id, drawer: x.drawer_id, name: x.name, category: x.category, size: x.size || "", quantity: q, warnBelow: w, low: w > 0 && q < w, out: q === 0, notes: x.notes || "", buyUrl: x.buy_url || "" };
    };
    const supplies = () => Object.values(T("supplies")).sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" })).map(supply);
    const drawers = () => Object.values(T("supply_drawers")).sort((a, b) => int(a.position) - int(b.position) || a.name.localeCompare(b.name));

    function have(f) {
      if (f.unopened === 0 && f.open.length > 0 && f.open.every(o => o.percent === null)) return null;
      const rg = rollGrams(f.id);
      return f.open.reduce((s, o) => s + (o.percent || 0) * rg / 100, 0) + f.unopened * rg;
    }
    function toPrint() {
      const items = Object.values(T("to_print")).sort((a, b) => int(a.position) - int(b.position));
      const lines = Object.values(T("to_print_filament"));
      const machines = T("machines");
      const byId = Object.fromEntries(filaments().map(f => [f.id, f]));
      const out = items.map(i => {
        const mine = lines.filter(l => l.item_id === i.id).sort((a, b) => int(a.line) - int(b.line));
        const copies = int(i.copies) || 1;
        return {
          id: i.id, title: i.title, file: i.file_name || "", plates: i.plates || "", copies, machine: (machines[i.machine_id] || {}).name || "", reprint: i.reprint === "1",
          note: i.reprint === "1" && i.reprint_note ? i.reprint_note : i.note || "", colours: mine.map(l => l.color_hex), grams: mine.reduce((s, l) => s + Number(l.grams || 0) * copies, 0),
          lines: mine.map(l => ({ material: l.material, hex: l.color_hex, grams: Number(l.grams || 0) * copies, filament: l.filament_id })),
        };
      });
      const need = {};
      for (const i of out) for (const l of i.lines) {
        const f = l.filament && byId[l.filament];
        const k = f ? f.id : l.material + l.hex;
        need[k] = need[k] || { name: f ? f.name + " " + f.material : (l.material || "Filament") + " " + l.hex + " (no roll picked)", hex: l.hex, grams: 0, have: f ? have(f) : null };
        need[k].grams += l.grams;
      }
      const needed = Object.values(need).filter(n => n.grams > 0).map(n => Object.assign(n, { grams: Math.round(n.grams * 10) / 10, enough: n.have != null && n.have >= n.grams }));
      return { items: out, needed };
    }

    function changeFilament(id, change) {
      const row = T("filaments")[id];
      if (!row) fail(404, "That filament is not in your list any more.");
      const result = change(row);
      if (result !== false) { row.updated_utc = now(); changed("filament"); }
      return { filament: filament(row) };
    }

    function takeGrams(f, grams, rollId) {
      // FilamentUse.Take: least-left open roll first, then the next; opens an unopened roll only when nothing is left.
      const rg = rollGrams(f.id);
      let left = grams <= 0 ? 0 : Math.ceil(Math.round(grams / Math.max(1, rg) * 100 * 1000) / 1000);
      const percent = left;
      const rolls = Object.values(T("filament_open_rolls")).filter(r => r.filament_id === f.id).sort((a, b) => int(a.position) - int(b.position));
      const row = T("filaments")[f.id];
      const takes = [];
      const from = r => {
        const before = Math.max(0, int(r.percent_left));
        const taken = Math.min(left, before);
        r.percent_left = String(before - taken);
        left -= taken;
        if (taken > 0) takes.push({ roll: r.id, percent: taken, opened: !!r._opened });
      };
      const open = () => {
        row.unopened = String(int(row.unopened) - 1);
        const id = E.newId();
        const pos = rolls.reduce((m, r) => Math.max(m, int(r.position)), -1) + 1;
        const r = { id, filament_id: f.id, position: String(pos), percent_left: "100", _opened: true };
        T("filament_open_rolls")[id] = r; rolls.push(r);
        return r;
      };
      if (left > 0 && rollId === "new" && int(row.unopened) > 0) from(open());
      else if (left > 0 && rollId) { const r = rolls.find(x => x.id === rollId && int(x.percent_left) > 0); if (r) from(r); }
      let guard = 0;
      while (left > 0 && guard++ < 2000) {
        const r = rolls.filter(x => int(x.percent_left) > 0).sort((a, b) => int(a.percent_left) - int(b.percent_left))[0];
        if (r) { from(r); continue; }
        if (int(row.unopened) > 0 && rolls.length < MAX_OPEN) { open(); continue; }
        break;
      }
      for (const r of rolls) delete r._opened;
      row.updated_utc = now();
      return { percent, short: left, takes };
    }

    function lookup(code) {
      const c = cleanCode(code);
      if (!c) fail(400, "Nothing was scanned.");
      const drawer = parseLabel(c, "MVD1:");
      if (drawer) return T("supply_drawers")[drawer] ? { found: false, drawer, code: c } : { found: false, label: true, code: c, message: "This drawer label is for a drawer that's no longer in your supplies." };
      const labelled = parseLabel(c, "MVF1:");
      if (labelled) {
        const row = T("filaments")[labelled];
        return row ? { found: true, via: "label", code: c, filament: filament(row) } : { found: false, label: true, code: c, message: "This MakerVault label is for a filament that's no longer in your list." };
      }
      if (/^MVF1:/i.test(c)) return { found: false, label: true, code: c, message: "This MakerVault label can't be read. Print a new one on the laptop." };
      const known = T("filament_barcodes")[c];
      const row = known && T("filaments")[known.filament_id];
      return row ? { found: true, via: "barcode", code: c, filament: filament(row) } : { found: false, label: false, code: c };
    }

    function setBarcode(code, filamentId) {
      const c = cleanCode(code);
      if (!c) fail(400, "A barcode must be 1 to 200 characters.");
      if (/^MVF1:/i.test(c)) fail(400, "That is a MakerVault label; it already points at its filament.");
      if (!T("filaments")[filamentId]) fail(404, "That filament is not in your list any more.");
      const old = T("filament_barcodes")[c];
      if (old && old.filament_id === filamentId) return;
      T("filament_barcodes")[c] = { code: c, filament_id: filamentId, added_utc: now() };
      changed("filament");
    }

    function logPrint(body) {
      const store = getStore();
      const titleText = clean(body.title).slice(0, 200);
      if (!titleText) fail(400, "Give the print a name.");
      const copies = Math.max(1, Math.min(1000, int(body.copies) || 1));
      const outcome = ["done", "failed", "cancelled"].includes(body.outcome) ? body.outcome : "done";
      const percent = outcome === "done" ? 100 : Math.max(0, Math.min(100, int(body.percent)));
      const lines = (body.lines || []).filter(l => Number(l.grams) > 0).slice(0, 32);
      const id = E.newId();
      const machine = body.machine && T("machines")[body.machine] ? body.machine : null;
      const project = body.project && T("projects")[body.project] ? body.project : null;
      const total = lines.reduce((s, l) => s + Number(l.grams), 0);
      const nowText = now();
      T("print_jobs")[id] = { id, project_id: project, machine_id: machine, title: titleText, file_name: "", plates: "", copies: String(copies), outcome, percent: String(percent), reason: clean(body.reason || "").slice(0, 200),
        minutes: "0", grams: String(Math.round(total * 100) / 100), source: "manual", source_key: "", needs_check: "0", printed_utc: nowText, created_utc: nowText };
      T("print_job_extra")[id] = { job_id: id, file_path: "", notes: clean(body.notes || "").slice(0, 2000), took: body.take === false ? "0" : "1", slicer_ids: lines.map(() => "0").join(",") };
      const notes = [];
      lines.forEach((l, i) => {
        const f = l.filament && T("filaments")[l.filament] ? filament(T("filaments")[l.filament]) : null;
        const line = i + 1;
        T("print_job_filament")[id + "\u001f" + line] = { job_id: id, line: String(line), material: f ? f.material : clean(l.material || "PLA"), color_hex: f && isHex(f.hex) ? f.hex.toUpperCase() : "#808080", grams: String(Math.round(Number(l.grams) * 100) / 100), filament_id: f ? f.id : null };
        if (!f || body.take === false) return;
        const took = takeGrams(f, Number(l.grams), l.roll || null);
        took.takes.forEach((t, s) => { T("print_job_takes")[id + "\u001f" + line + "\u001f" + (s + 1)] = { job_id: id, line: String(line), seq: String(s + 1), filament_id: f.id, roll_id: t.roll, percent: String(t.percent), opened: t.opened ? "1" : "0" }; });
        notes.push(f.name + " " + f.material + ": took " + took.percent + "% of a roll" + (took.short ? " (" + took.short + "% more than your rolls had — check them)" : ""));
      });
      if (body.fromToPrint && T("to_print")[body.fromToPrint] && outcome === "done") {
        delete T("to_print")[body.fromToPrint];
        for (const k of Object.keys(T("to_print_filament"))) if (T("to_print_filament")[k].item_id === body.fromToPrint) delete T("to_print_filament")[k];
      }
      changed("print");
      void store;
      return { job: id, notes };
    }

    function projectList() {
      const members = Object.values(T("project_group_members"));
      const groups = Object.values(T("project_groups"));
      const tags = Object.values(T("tags")), ptags = Object.values(T("project_tags")), wf = Object.values(T("workflows")), pwf = Object.values(T("project_workflows"));
      const tagNames = Object.fromEntries(tags.map(t => [t.id, t.name])), wfNames = Object.fromEntries(wf.map(w => [w.id, w.name]));
      const label = s => ({ "Not Produced": "Not made yet", "In Progress": "In progress", Completed: "Done", "Needs Attention": "Needs attention" })[s] || s;
      const list = Object.values(T("projects")).sort((a, b) => (b.favorite === "1") - (a.favorite === "1") || (Date.parse(b.updated_utc) || 0) - (Date.parse(a.updated_utc) || 0));
      return {
        projects: list.map(p => ({
          id: p.id, name: p.name, kind: (pwf.filter(x => x.project_id === p.id).sort((a, b) => int(a.position) - int(b.position)).map(x => wfNames[x.workflow_id])[0]) || "",
          status: label(p.status), notMade: p.status === "Not Produced", favorite: p.favorite === "1", demo: p.is_demo === "1",
          tags: ptags.filter(x => x.project_id === p.id).sort((a, b) => int(a.position) - int(b.position)).map(x => tagNames[x.tag_id]).filter(Boolean).slice(0, 8),
          groups: members.filter(m => m.project_id === p.id).map(m => m.group_id), files: 0, cover: null, words: "",
          notes: p.notes, designer: p.designer, source: p.source, statusRaw: p.status,
        })),
        groups: groups.map(g => ({ id: g.id, name: g.name, color: g.color, count: members.filter(m => m.group_id === g.id).length })),
      };
    }

    // ------------------------------------------------------------------ the routes (same as the laptop's /api)
    return async function api(path, body) {
      const [route, query] = path.split("?");
      const q = Object.fromEntries(new URLSearchParams(query || ""));
      const s = route.replace(/^\/api\/?/, "").split("/").filter(Boolean);
      const post = body !== undefined;
      const a = s[0] || "";
      if (a === "hello") return info();
      if (a === "projects" && !post) {
        const all = projectList();
        if (s.length === 1) return all;
        const p = all.projects.find(x => x.id === s[1]);
        if (!p) fail(404, "That project is not in the library any more.");
        return { id: p.id, name: p.name, kinds: p.kind ? [p.kind] : [], status: p.status, favorite: p.favorite, tags: p.tags, notes: p.notes || "", designer: p.designer || "", source: p.source || "",
          groups: all.groups.filter(g => p.groups.includes(g.id)).map(g => g.name), cover: null, files: [], phoneNoFiles: true };
      }
      if (a === "choices") {
        const all = filaments();
        const merge = (mine, common) => { const seen = new Set(); const out = []; for (const x of mine.filter(Boolean).concat(common)) { const k = x.trim().toLowerCase(); if (!seen.has(k)) { seen.add(k); out.push(x.trim()); } } return out; };
        const sortCI = arr => [...new Set(arr)].sort((x, y) => x.localeCompare(y, undefined, { sensitivity: "base" }));
        return {
          materials: merge(sortCI(all.map(f => f.material)), COMMON_MATERIALS), brands: merge(sortCI(all.map(f => f.brand)), COMMON_BRANDS),
          colours: merge(sortCI(all.map(f => f.colour)), COLOUR_NAMES).map(name => ({ name, hex: (all.find(f => f.colour.toLowerCase() === name.toLowerCase()) || {}).hex || guessColour(name) })),
          diameters: ["1.75", "2.85"],
        };
      }
      if (a === "lookup") return lookup(q.code || "");
      if (a === "barcode" && post && s.length === 1) {
        setBarcode(body.code, body.filamentId);
        const row = T("filaments")[body.filamentId];
        if (body.addUnopened && int(row.unopened) < MAX_UNOPENED) { row.unopened = String(int(row.unopened) + 1); row.updated_utc = now(); changed("filament"); }
        return { filament: filament(row) };
      }
      if (a === "barcode" && s[1] === "forget" && post) { const c = cleanCode(body.code); if (c && T("filament_barcodes")[c]) { delete T("filament_barcodes")[c]; changed("filament"); } return { done: true }; }
      if (a === "supplies" && !post) { const items = supplies(); return { drawers: drawers().map(d => ({ id: d.id, name: d.name, note: d.note || "", count: items.filter(i => i.drawer === d.id).length })), items, low: items.filter(i => i.low || i.out).length }; }
      if (a === "toprint" && !post) return toPrint();
      if (a === "machines" && !post) return { machines: Object.values(T("machines")).sort((x, y) => int(x.position) - int(y.position)).map(m => ({ id: m.id, name: m.name, kind: m.kind })) };
      if (a === "supply" && s[2] === "quantity" && post) {
        const delta = int(body.delta);
        if (delta === 0 || delta < -1000 || delta > 1000) fail(400, "Change a few at a time.");
        const x = T("supplies")[s[1]];
        if (!x) fail(404, "That item is not in your supplies any more.");
        x.quantity = String(Math.max(0, Math.min(1000000, int(x.quantity) + delta)));
        x.updated_utc = now();
        changed("supplies");
        return { supply: supply(x) };
      }
      if (a === "log" && post) return logPrint(body);
      if (a === "filament") {
        if (s.length === 1 && !post) {
          const all = filaments();
          return { filaments: all, counts: { rolls: all.reduce((n, f) => n + f.total, 0), unopened: all.reduce((n, f) => n + f.unopened, 0), open: all.reduce((n, f) => n + f.open.length, 0), low: all.filter(f => f.low).length, confirm: all.filter(f => f.confirm).length } };
        }
        if (s.length === 1 && post) {
          const material = clean(body.material), brand = clean(body.brand), colour = clean(body.colour), d = body.diameter === "2.85" ? "2.85" : "1.75";
          if (!material || !colour) fail(400, "Pick a material and a colour.");
          const unopened = body.unopened == null ? 1 : int(body.unopened);
          if (unopened < 0 || unopened > MAX_UNOPENED) fail(400, "Check the number of rolls.");
          const key = nameKey(material, brand, colour, d);
          const existing = Object.values(T("filaments")).find(f => f.name_key === key);
          if (existing) fail(409, "You already have this filament.", { error: "You already have this filament.", existing: filament(existing) });
          const id = E.newId(), t = now();
          T("filaments")[id] = { id, material, brand, colour, color_hex: isHex(body.hex) ? body.hex.toUpperCase() : guessColour(colour), diameter_mm: d, notes: "", unopened: String(unopened), name_key: key, created_utc: t, updated_utc: t };
          if (body.openPercent != null) { const rid = E.newId(); T("filament_open_rolls")[rid] = { id: rid, filament_id: id, position: "0", percent_left: String(Math.max(0, Math.min(100, int(body.openPercent)))) }; }
          if (body.barcode) setBarcode(body.barcode, id);
          changed("filament");
          return { filament: filament(T("filaments")[id]) };
        }
        const id = s[1];
        if (s.length === 2 && !post) {
          const row = T("filaments")[id];
          if (!row) fail(404, "That filament is not in your list any more.");
          return { filament: filament(row), barcodes: Object.values(T("filament_barcodes")).filter(b => b.filament_id === id).map(b => b.code) };
        }
        if (s[2] === "label") fail(400, "Print QR labels on the computer (Filament › Labels). The phone reads them.");
        if (post && s[2] === "unopened") {
          const delta = int(body.delta);
          if (delta < -100 || delta > 100) fail(400, "Change one roll at a time.");
          return changeFilament(id, row => { const next = Math.max(0, Math.min(MAX_UNOPENED, int(row.unopened) + delta)); if (next === int(row.unopened)) return false; row.unopened = String(next); });
        }
        if (post && s[2] === "open-new") {
          return changeFilament(id, row => {
            const rolls = Object.values(T("filament_open_rolls")).filter(r => r.filament_id === id);
            if (rolls.length >= MAX_OPEN) fail(400, "Up to 999 open rolls per filament.");
            row.unopened = String(Math.max(0, int(row.unopened) - 1));
            const rid = E.newId();
            T("filament_open_rolls")[rid] = { id: rid, filament_id: id, position: String(rolls.reduce((m, r) => Math.max(m, int(r.position)), -1) + 1), percent_left: "100" };
          });
        }
        if (post && s[2] === "notes") {
          const notes = body.notes || "";
          if (notes.length > MAX_NOTES) fail(400, "Notes can be up to 2000 characters.");
          return changeFilament(id, row => { if (row.notes === notes) return false; row.notes = notes; });
        }
        if (post && s[2] === "roll" && s[3]) {
          const r = T("filament_open_rolls")[s[3]];
          if (s[4] === "used-up") return changeFilament(id, () => { if (!r || r.filament_id !== id) return false; delete T("filament_open_rolls")[s[3]]; });
          return changeFilament(id, () => {
            if (!r || r.filament_id !== id) return false;
            let value = body.percent;
            if (value != null && (value < 0 || value > 100)) fail(400, "Type a number from 0 to 100.");
            if (value == null) {
              if (body.delta == null) fail(400, "Nothing to change.");
              if (int(r.percent_left) < 0) fail(400, "Type how much is left first.");
              value = Math.max(0, Math.min(100, int(r.percent_left) + int(body.delta)));
            }
            if (int(r.percent_left) === value) return false;
            r.percent_left = String(Math.round(value));
          });
        }
      }
      fail(404, "Not found.");
    };
  }

  root.MVStore = { createApi, ApiError, guessColour, nameKey };
})(typeof self !== "undefined" ? self : globalThis);
