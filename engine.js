// MakerVault Mobile — sync engine (Stage 12). The same rules as the computers' engine
// (src/MakerVault.Infrastructure/Sync/SyncEngine.cs): counts add up; different fields merge; the same field changed to
// different values on two devices keeps the newer one and is listed in "Check changes"; deleted on one device but
// changed on another is kept and listed. The phone keeps its own copy of the workshop tables (no maker files).
"use strict";
(function (root) {
  const TABLES = root.MV_TABLES;
  const BY_NAME = Object.fromEntries(TABLES.map(t => [t.name, t]));
  const ORDER = Object.fromEntries(TABLES.map((t, i) => [t.name, i]));
  const SEP = "\u001f";

  // ------------------------------------------------------------------ small helpers
  function nowIso() { return new Date().toISOString(); }
  function when(s) { const t = Date.parse(s || ""); return isNaN(t) ? -Infinity : t; }
  function rowKey(t, row) { return t.key.map(k => row[k] == null ? "" : row[k]).join(SEP); }
  function cols(t) { return t.columns.map(c => c.name); }
  function col(t, name) { return t.columns.find(c => c.name === name); }
  function num(s) { if (s === null || s === undefined || s === "") return NaN; const n = Number(s); return isFinite(n) ? n : NaN; }
  function numText(n) { return Number.isInteger(n) ? String(n) : String(n); }
  function copy(o) { return JSON.parse(JSON.stringify(o)); }
  function later(a, b) {
    if (a == null) return false;
    if (b == null) return true;
    const x = Date.parse(a), y = Date.parse(b);
    if (!isNaN(x) && !isNaN(y)) return x > y;
    return a > b;
  }
  function remoteNewer(remoteAt, remoteDevice, localAt, localDevice) {
    const r = when(remoteAt), l = when(localAt);
    if (r !== l) return r > l;
    return remoteDevice > localDevice;
  }

  // SHA-256 (for Check changes ids, the same on every device).
  function sha256Hex(text) {
    const bytes = new TextEncoder().encode(text);
    const K = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
      0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
      0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
      0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
    const H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    const l = bytes.length, withOne = l + 1, total = Math.ceil((withOne + 8) / 64) * 64;
    const m = new Uint8Array(total); m.set(bytes); m[l] = 0x80;
    const bits = l * 8; const dv = new DataView(m.buffer);
    dv.setUint32(total - 4, bits >>> 0); dv.setUint32(total - 8, Math.floor(bits / 0x100000000));
    const w = new Uint32Array(64);
    const r = (x, n) => (x >>> n) | (x << (32 - n));
    for (let off = 0; off < total; off += 64) {
      for (let i = 0; i < 16; i++) w[i] = dv.getUint32(off + i * 4);
      for (let i = 16; i < 64; i++) {
        const s0 = r(w[i - 15], 7) ^ r(w[i - 15], 18) ^ (w[i - 15] >>> 3), s1 = r(w[i - 2], 17) ^ r(w[i - 2], 19) ^ (w[i - 2] >>> 10);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
      }
      let [a, b, c, d, e, f, g, h] = H;
      for (let i = 0; i < 64; i++) {
        const S1 = r(e, 6) ^ r(e, 11) ^ r(e, 25), ch = (e & f) ^ (~e & g), t1 = (h + S1 + ch + K[i] + w[i]) >>> 0;
        const S0 = r(a, 2) ^ r(a, 13) ^ r(a, 22), maj = (a & b) ^ (a & c) ^ (b & c), t2 = (S0 + maj) >>> 0;
        h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
      }
      H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + b) >>> 0; H[2] = (H[2] + c) >>> 0; H[3] = (H[3] + d) >>> 0;
      H[4] = (H[4] + e) >>> 0; H[5] = (H[5] + f) >>> 0; H[6] = (H[6] + g) >>> 0; H[7] = (H[7] + h) >>> 0;
    }
    return H.map(x => x.toString(16).padStart(8, "0")).join("").toUpperCase();
  }
  function conflictId(table, key, column, a, b) {
    const values = [a == null ? "\0" : a, b == null ? "\0" : b].sort((x, y) => x < y ? -1 : x > y ? 1 : 0);
    return sha256Hex(table + "\n" + key + "\n" + column + "\n" + values.join("\n")).slice(0, 32).toLowerCase();
  }
  function newId() {
    const b = new Uint8Array(16); (root.crypto || require("crypto").webcrypto).getRandomValues(b);
    b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
    const h = Array.from(b, x => x.toString(16).padStart(2, "0")).join("");
    return h.slice(0, 8) + "-" + h.slice(8, 12) + "-" + h.slice(12, 16) + "-" + h.slice(16, 20) + "-" + h.slice(20);
  }
  function newDeviceId() { return newId().replace(/-/g, ""); }

  // ------------------------------------------------------------------ the phone's library
  // store = { tables: {name: {key: row}}, baseline: {name: {key: {row, times}}}, state: {...}, cursors: {device: seq},
  //           names: {device: name}, idMap: {"table|remote": local}, tombstones: {"table|key": utc},
  //           conflicts: {id: {...}}, recent: [...], outbox: [{seq, body}] }
  function emptyStore() {
    const tables = {}, baseline = {};
    for (const t of TABLES) { tables[t.name] = {}; baseline[t.name] = {}; }
    return { version: 1, tables, baseline, state: {}, cursors: {}, names: {}, idMap: {}, tombstones: {}, conflicts: {}, recent: [], outbox: [], pendingResolves: [] };
  }
  function table(store, name) { return store.tables[name] || (store.tables[name] = {}); }
  function base(store, name) { return store.baseline[name] || (store.baseline[name] = {}); }

  // ------------------------------------------------------------------ change notes from this phone
  function diff(store, emit) {
    if (emit === undefined) emit = true;
    const ops = [], now = nowIso();
    for (const t of TABLES) {
      const cur = table(store, t.name), bas = base(store, t.name);
      for (const key of Object.keys(cur)) {
        const row = pick(t, cur[key]);
        const b = bas[key];
        if (!b) {
          if (emit) ops.push({ t: t.name, op: "put", at: now, row });
          bas[key] = { row: copy(row), times: Object.fromEntries(cols(t).map(c => [c, now])) };
          continue;
        }
        let old = null;
        for (const c of cols(t)) {
          const was = c in b.row ? b.row[c] : null;
          if (was === row[c]) continue;
          (old = old || {})[c] = was;
          b.times[c] = now;
        }
        if (!old) continue;
        if (emit) ops.push({ t: t.name, op: "upd", at: now, row, old });
        b.row = copy(row);
      }
      for (const key of Object.keys(bas)) {
        if (key in cur) continue;
        if (emit) { ops.push({ t: t.name, op: "del", at: now, row: bas[key].row }); store.tombstones[t.name + "|" + key] = now; }
        delete bas[key];
      }
    }
    return ops;
  }
  function pick(t, row) { const r = {}; for (const c of cols(t)) r[c] = row[c] === undefined ? null : row[c]; return r; }

  // ------------------------------------------------------------------ merging other devices' notes
  function mapId(store, table, id) { if (id == null) return id; const m = store.idMap[table + "|" + id]; return m === undefined ? id : m; }
  function mapped(store, t, row) {
    const m = {};
    for (const c of t.columns) {
      let v = row[c.name] === undefined ? null : row[c.name];
      if (c.ref) v = mapId(store, c.ref, v);
      else if (c.name === "id" && t.key.length === 1) v = mapId(store, t.name, v);
      m[c.name] = v;
    }
    return m;
  }
  function findNatural(store, t, row) {
    if (!t.natural) return null;
    if (t.natural.some(n => row[n] == null)) return null;
    const want = t.natural.map(n => String(row[n]).toUpperCase());
    const rows = table(store, t.name);
    for (const key of Object.keys(rows)) {
      const r = rows[key];
      if (t.natural.every((n, i) => r[n] != null && String(r[n]).toUpperCase() === want[i])) return key;
    }
    return null;
  }
  function parentMissing(store, c, value) { return value != null && !c.soft && !(value in table(store, c.ref)); }
  function fixReferences(store, t, row) {
    for (const c of t.columns) {
      if (!c.ref || !parentMissing(store, c, row[c.name])) continue;
      if (c.nullable) row[c.name] = null; else return false;
    }
    return true;
  }
  function setBase(store, t, key, row, times) { base(store, t.name)[key] = { row: copy(pick(t, row)), times: Object.assign({}, times) }; }

  function display(store, t, row) {
    const V = c => row[c] == null ? "" : row[c];
    const fil = id => { const f = table(store, "filaments")[id]; return f ? [f.brand, f.colour, f.material].filter(Boolean).join(" ") : "A filament"; };
    switch (t.name) {
      case "filaments": return [V("brand"), V("colour"), V("material")].filter(Boolean).join(" ");
      case "filament_open_rolls": return fil(row.filament_id) + " · open roll";
      case "filament_barcodes": case "filament_roll_grams": return fil(row.filament_id);
      case "print_jobs": case "to_print": return V("title") || t.label;
      case "projects": return "Project “" + V("name") + "”";
      default: return V("name") || t.label;
    }
  }
  function conflictLabel(store, t, row, column, kind) {
    const what = display(store, t, row);
    if (kind === "deleted-here") return what + " · deleted on this phone, changed on another device";
    if (kind === "deleted-there") return what + " · deleted on another device, changed here";
    const words = ({ percent_left: "amount left", unopened: "unopened rolls", quantity: "count", warn_below: "warn below", color_hex: "colour", buy_url: "shop link" })[column] || column.replace(/_/g, " ");
    return what + " · " + words;
  }
  function describe(store, t, op, row) {
    const old = op.old || {}, N = s => parseInt(s, 10) || 0;
    if (t.name === "supplies" && op.op === "upd" && "quantity" in old) {
      const d = N(op.row.quantity) - N(old.quantity); const dr = table(store, "supply_drawers")[row.drawer_id];
      return (d < 0 ? "Used " + (-d) : "Added " + d) + " × " + row.name + (dr ? " · " + dr.name : "");
    }
    if (t.name === "filament_open_rolls" && op.op === "upd" && "percent_left" in old) return display(store, BY_NAME.filament_open_rolls, row).replace(" · open roll", "") + ": open roll set to " + (N(row.percent_left) < 0 ? "?" : row.percent_left + "%");
    if (t.name === "print_jobs" && op.op === "put") { const m = table(store, "machines")[row.machine_id]; return "Logged print: " + row.title + (N(row.copies) > 1 ? " ×" + row.copies : "") + (m ? " on " + m.name : ""); }
    if (t.name === "projects" && op.op === "upd" && "status" in old) return "Project “" + row.name + "” → " + ({ "Not Produced": "Not made yet", "In Progress": "In progress", Completed: "Done", "Needs Attention": "Needs attention" })[row.status];
    if (["filaments", "filament_open_rolls", "supplies", "supply_drawers", "machines", "projects", "to_print", "maintenance_tasks"].includes(t.name))
      return (({ put: "Added", del: "Removed" })[op.op] || "Changed") + " " + (t.name === "projects" ? display(store, t, row) : t.label.toLowerCase() + " “" + display(store, t, row) + "”");
    return null;
  }

  function conflict(store, t, key, column, kind, row, local, remote, localAt, remoteAt, remoteDevice, remoteChosen, result) {
    const id = conflictId(t.name, key, column, local, remote);
    store.conflicts[id] = { id, tbl: t.name, key, column, kind, label: conflictLabel(store, t, row, column, kind), local, remote, localAt: localAt || "", remoteAt, remoteDevice, chosen: remoteChosen ? "remote" : "local", resolved: false };
    result.conflicts++;
  }

  function applyFile(store, file, deviceId, result) {
    result = result || { applied: 0, conflicts: 0, notes: [] };
    const ok = o => BY_NAME[o.t];
    const ops = file.ops.filter(o => (o.op === "put" || o.op === "upd") && ok(o)).sort((a, b) => ORDER[a.t] - ORDER[b.t])
      .concat(file.ops.filter(o => o.op === "del" && ok(o)).sort((a, b) => ORDER[b.t] - ORDER[a.t]))
      .concat(file.ops.filter(o => o.op === "resolve"));
    for (const op of ops) {
      try { applyOne(store, op, file.device, file.deviceName || "Another device", deviceId, result); }
      catch (e) { result.notes.push("Skipped one change from " + file.deviceName + ": " + e.message); }
    }
    return result;
  }

  function applyOne(store, op, remoteDevice, remoteName, deviceId, result) {
    if (op.op === "resolve") { if (op.id && store.conflicts[op.id]) store.conflicts[op.id].resolved = true; return; }
    const t = BY_NAME[op.t];
    if (!op.row) return;
    const rows = table(store, t.name);
    let row = mapped(store, t, op.row);
    if (t.key.some(k => row[k] == null)) return;
    let key = rowKey(t, row);
    let local = rows[key] ? pick(t, rows[key]) : null;
    if (!local) {
      const natural = findNatural(store, t, row);
      if (natural !== null && natural !== key) {
        if (t.key.length === 1 && t.key[0] === "id") store.idMap[t.name + "|" + row.id] = natural;
        if (t.key.length === 1) row[t.key[0]] = natural;
        key = natural;
        local = pick(t, rows[key]);
      }
    }
    const b = base(store, t.name)[key];
    const recent = (r) => { const text = describe(store, t, op, r); if (text) store.recent.unshift({ device: remoteName, text, tbl: t.name, key, at: op.at }); };
    if (op.op === "put" || (op.op === "upd" && !local)) {
      if (!local) {
        if (!fixReferences(store, t, row)) { result.notes.push("Skipped a " + t.label.toLowerCase() + " from " + remoteName + ": what it belongs to isn't here."); return; }
        const deletedHere = op.op === "upd" && (t.name + "|" + key) in store.tombstones;
        rows[key] = copy(row);
        setBase(store, t, key, row, Object.fromEntries(cols(t).map(c => [c, op.at])));
        if (deletedHere) conflict(store, t, key, "*", "deleted-here", row, null, display(store, t, row), null, op.at, remoteName, true, result);
        result.applied++;
        recent(row);
        return;
      }
      const changed = [];
      for (const c of t.columns) {
        if (t.key.includes(c.name) || row[c.name] === local[c.name]) continue;
        const localAt = b ? b.times[c.name] : null;
        if (c.rule === "latest" ? later(row[c.name], local[c.name]) : remoteNewer(op.at, remoteDevice, localAt, deviceId)) changed.push(c.name);
      }
      if (!fixReferences(store, t, row)) return;
      const merged = Object.assign({}, local);
      const times = b ? Object.assign({}, b.times) : {};
      for (const c of changed) { merged[c] = row[c]; times[c] = op.at; }
      rows[key] = Object.assign(rows[key], merged);
      setBase(store, t, key, merged, times);
      if (changed.length) { result.applied++; recent(merged); }
      return;
    }
    if (op.op === "upd") {
      const write = Object.assign({}, local), times = b ? Object.assign({}, b.times) : {};
      let any = false;
      for (const colName of Object.keys(op.old || {})) {
        const c = col(t, colName);
        if (!c || t.key.includes(colName)) continue;
        const oldValue = op.old[colName], newValue = row[colName], mine = local[colName];
        const o = num(oldValue), n = num(newValue), m = num(mine);
        if (c.rule === "count" && !isNaN(o) && !isNaN(n) && !isNaN(m) && !(c.percent && (o < 0 || n < 0 || m < 0))) {
          let sum = m + (n - o);
          if (c.min != null) sum = Math.max(c.min, sum);
          if (c.max != null) sum = Math.min(c.max, sum);
          const text = numText(sum);
          if (text !== mine) { write[colName] = text; any = true; times[colName] = op.at; }
          continue;
        }
        if (c.rule === "latest") { if (later(newValue, mine)) { write[colName] = newValue; any = true; times[colName] = op.at; } continue; }
        if (mine === oldValue) { write[colName] = newValue; any = true; times[colName] = op.at; continue; }
        if (mine === newValue) continue;
        const localAt = b ? b.times[colName] : null;
        const remoteWins = remoteNewer(op.at, remoteDevice, localAt, deviceId);
        if (remoteWins) { write[colName] = newValue; any = true; times[colName] = op.at; }
        if (c.rule === "ask") conflict(store, t, key, colName, "field", write, mine, newValue, localAt, op.at, remoteName, remoteWins, result);
      }
      if (!any) { setBase(store, t, key, local, times); return; }
      if (!fixReferences(store, t, write)) { result.notes.push("Skipped a change to a " + t.label.toLowerCase() + " from " + remoteName + "."); return; }
      rows[key] = Object.assign(rows[key], write);
      setBase(store, t, key, write, times);
      result.applied++;
      recent(write);
      return;
    }
    if (op.op === "del") {
      if (!local) return;
      const same = t.columns.filter(c => (c.rule === "ask" || c.rule === "count") && !t.key.includes(c.name)).every(c => local[c.name] === (row[c.name] === undefined ? null : row[c.name]));
      if (!same) {
        const lt = b ? Object.values(b.times).sort().pop() : "";
        conflict(store, t, key, "*", "deleted-there", local, display(store, t, local), null, lt, op.at, remoteName, false, result);
        return;
      }
      recent(local);
      delete rows[key];
      delete base(store, t.name)[key];
      result.applied++;
    }
  }

  // ------------------------------------------------------------------ snapshots and change files
  function importSnapshot(store, snap) {
    for (const t of TABLES) {
      const rows = (snap.tables || {})[t.name] || [];
      const times = ((snap.times || {})[t.name]) || [];
      for (let i = 0; i < rows.length; i++) {
        const row = pick(t, rows[i]);
        const key = rowKey(t, row);
        table(store, t.name)[key] = copy(row);
        const tm = times[i] && Object.keys(times[i]).length ? times[i] : Object.fromEntries(cols(t).map(c => [c, snap.createdUtc]));
        setBase(store, t, key, row, tm);
      }
    }
    for (const [d, s] of Object.entries(snap.cursors || {})) store.cursors[d] = s;
  }

  /// This phone's changes as a change file (kept in the outbox until uploaded), or null when nothing changed.
  function makeChangeFile(store) {
    const ops = diff(store, true);
    if (store.pendingResolves && store.pendingResolves.length) { ops.push(...store.pendingResolves); store.pendingResolves = []; }
    if (!ops.length) return null;
    const seq = Math.max(1, store.state.nextSeq || 1);
    const file = { format: "makervault-sync", version: 1, device: store.state.deviceId, deviceName: store.state.deviceName, seq, createdUtc: nowIso(), ops };
    store.outbox.push({ seq, body: JSON.stringify(file) });
    store.state.nextSeq = seq + 1;
    return file;
  }

  function changeName(device, seq) { return "chg-" + device + "-" + String(seq).padStart(8, "0") + ".json"; }
  function parseName(name) {
    let m = /^chg-([0-9a-f]{32})-(\d+)\.json$/.exec(name);
    if (m) return { kind: "chg", device: m[1], seq: parseInt(m[2], 10) };
    m = /^snap-([0-9a-f]{32})-(\d+)-(main|files)\.json$/.exec(name);
    if (m) return { kind: "snap", device: m[1], seq: parseInt(m[2], 10), part: m[3] };
    m = /^dev-([0-9a-f]{32})\.json$/.exec(name);
    if (m) return { kind: "dev", device: m[1] };
    return null;
  }

  /// Oldest first across devices, each device's files in their own order.
  function mergeOrder(files) {
    const queues = {};
    for (const f of files) (queues[f.device] = queues[f.device] || []).push(f);
    for (const q of Object.values(queues)) q.sort((a, b) => a.seq - b.seq);
    const out = [];
    while (Object.values(queues).some(q => q.length)) {
      const q = Object.values(queues).filter(q => q.length).sort((a, b) => (when(a[0].createdUtc) - when(b[0].createdUtc)) || (a[0].device < b[0].device ? -1 : 1))[0];
      out.push(q.shift());
    }
    return out;
  }

  /// One full sync with a "cloud" (Google Drive in the app, a folder in tests). Returns {sent, received, conflicts, notes}.
  async function sync(store, cloud, folderId, save) {
    const result = { sent: 0, received: 0, conflicts: 0, notes: [], applied: 0 };
    const me = store.state.deviceId;
    const made = makeChangeFile(store);
    if (made) result.sent += made.ops.length;
    await save(store);
    let files = await cloud.list(folderId);
    const upload = async () => {
      const names = new Set(files.map(f => f.name));
      while (store.outbox.length) {
        const o = store.outbox[0];
        const name = changeName(me, o.seq);
        if (!names.has(name)) { const f = await cloud.create(folderId, name, o.body, "application/json"); files.push(f); names.add(name); }
        store.outbox.shift();
        await save(store);
      }
    };
    await upload();
    // Device notes: names, and devices removed from sync.
    const removed = new Set();
    for (const f of files) {
      const p = parseName(f.name);
      if (!p || p.kind !== "dev") continue;
      try {
        const d = JSON.parse(await cloud.read(f.id));
        if (d.id !== p.device) continue;
        store.names[d.id] = d.name;
        for (const r of d.removed || []) removed.add(r);
      } catch (e) { }
    }
    if (removed.has(me)) { store.state.removed = true; await save(store); throw new Error("This phone was removed from sync on another device. Set it up again to rejoin."); }
    // Change files after each device's cursor, in order, stopping at a gap.
    const byDevice = {};
    for (const f of files) {
      const p = parseName(f.name);
      if (!p || p.kind !== "chg" || p.device === me || removed.has(p.device)) continue;
      (byDevice[p.device] = byDevice[p.device] || []).push({ f, seq: p.seq });
    }
    const incoming = [];
    for (const [dev, list] of Object.entries(byDevice)) {
      list.sort((a, b) => a.seq - b.seq);
      let next = (store.cursors[dev] || 0) + 1;
      for (const x of list) {
        if (x.seq < next) continue;
        if (x.seq !== next) break;
        let file = null;
        try { file = JSON.parse(await cloud.read(x.f.id)); } catch (e) { file = null; }
        if (!file || file.device !== dev || file.seq !== x.seq || file.format !== "makervault-sync") file = { device: dev, seq: x.seq, deviceName: "?", ops: [] };
        if (file.version > 1) break;
        incoming.push(file);
        next++;
        if (incoming.length >= 400) break;
      }
    }
    // Merge (with one more look at this phone's own changes first).
    const again = makeChangeFile(store);
    if (again) result.sent += again.ops.length;
    for (const file of mergeOrder(incoming)) {
      file.deviceName = store.names[file.device] || file.deviceName;
      applyFile(store, file, me, result);
      store.cursors[file.device] = file.seq;
    }
    diff(store, false);
    result.received = result.applied;
    store.recent = store.recent.slice(0, 200);
    store.state.lastSyncUtc = nowIso();
    await save(store);
    await upload();
    // This phone's device note.
    const dev = { format: "makervault-device", id: me, name: store.state.deviceName, kind: "mobile", app: "mobile-1", createdUtc: store.state.joinedUtc || nowIso(), lastSyncUtc: store.state.lastSyncUtc, lastSeq: (store.state.nextSeq || 1) - 1, removed: [], started: false };
    const devName = "dev-" + me + ".json";
    const existing = files.find(f => f.name === devName);
    if (existing) await cloud.update(existing.id, JSON.stringify(dev), "application/json");
    else await cloud.create(folderId, devName, JSON.stringify(dev), "application/json");
    return result;
  }

  /// Joins the shared library: the newest full copy, then everything after it.
  async function join(store, cloud, folderId, deviceName, save) {
    const files = await cloud.list(folderId);
    const snaps = files.map(f => ({ f, p: parseName(f.name) })).filter(x => x.p && x.p.kind === "snap" && x.p.part === "main")
      .sort((a, b) => (when(b.f.modified) - when(a.f.modified)) || (b.p.seq - a.p.seq));
    if (!snaps.length) throw new Error("The shared library has no full copy yet. Open MakerVault on the laptop and let it sync once.");
    const snap = JSON.parse(await cloud.read(snaps[0].f.id));
    if (snap.format !== "makervault-snapshot" || snap.version !== 1) throw new Error("The shared library was made by a newer MakerVault. Update MakerVault Mobile (reload the page).");
    const fresh = emptyStore();
    Object.assign(store, fresh);
    importSnapshot(store, snap);
    store.state = { deviceId: newDeviceId(), deviceName, nextSeq: 1, joinedUtc: nowIso(), folderId, startedBy: snap.deviceName };
    await save(store);
    return sync(store, cloud, folderId, save);
  }

  root.MVEngine = { TABLES, BY_NAME, emptyStore, diff, applyFile, importSnapshot, makeChangeFile, sync, join, conflictId, sha256Hex, newId, newDeviceId, nowIso, rowKey, parseName, changeName };
})(typeof self !== "undefined" ? self : globalThis);
