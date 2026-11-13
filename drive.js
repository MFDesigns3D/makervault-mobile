// MakerVault Mobile — Google sign-in and Google Drive (Stage 12).
// Sign-in uses Google's page (the password goes only to Google) and asks for two things only: the email address, and
// Google Drive's narrow "files this app made" permission (drive.file). The short-lived access key is kept for this
// browser tab only. When it runs out, Google gives a new one without asking again (a quick trip to Google and back).
"use strict";
(function (root) {
  const CONFIG = root.MV_CONFIG || {};
  const SCOPE = "openid email https://www.googleapis.com/auth/drive.file";
  const API = "https://www.googleapis.com/drive/v3", UPLOAD = "https://www.googleapis.com/upload/drive/v3";
  const FOLDER = "application/vnd.google-apps.folder";
  const KEY = "mv.token", EMAIL = "mv.email", CONSENT = "mv.consent", RETURN = "mv.return", STATE = "mv.state";

  function redirectUri() { return location.origin + location.pathname; }
  function saved() { try { const t = JSON.parse(sessionStorage.getItem(KEY) || "null"); return t && t.expires > Date.now() + 60000 ? t : null; } catch (e) { return null; } }

  // Coming back from Google: #access_token=…&expires_in=…&state=…  (or #error=…)
  function takeAnswer() {
    const hash = location.hash.replace(/^#/, "");
    if (!/(^|&)(access_token|error)=/.test(hash)) return null;
    const p = new URLSearchParams(hash);
    const back = sessionStorage.getItem(RETURN) || "#/home";
    const ok = p.get("state") && p.get("state") === sessionStorage.getItem(STATE);
    sessionStorage.removeItem(STATE);
    history.replaceState(null, "", location.pathname + location.search + back);
    if (!ok) return { error: "Sign-in answer didn't match. Try again." };
    if (p.get("error")) return { error: p.get("error") };
    const expires = Date.now() + (parseInt(p.get("expires_in"), 10) || 3600) * 1000;
    sessionStorage.setItem(KEY, JSON.stringify({ token: p.get("access_token"), expires }));
    localStorage.setItem(CONSENT, "1");
    return { ok: true };
  }
  const answer = typeof location !== "undefined" ? takeAnswer() : null;

  function goToGoogle(silent) {
    const state = Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, "0")).join("");
    sessionStorage.setItem(STATE, state);
    sessionStorage.setItem(RETURN, location.hash && !/access_token|error=/.test(location.hash) ? location.hash : "#/home");
    const q = new URLSearchParams({ client_id: CONFIG.googleClientId, redirect_uri: redirectUri(), response_type: "token", scope: SCOPE, include_granted_scopes: "true", state });
    const email = localStorage.getItem(EMAIL);
    if (email) q.set("login_hint", email);
    q.set("prompt", silent ? "none" : localStorage.getItem(CONSENT) === "1" ? "select_account" : "consent select_account");
    location.assign("https://accounts.google.com/o/oauth2/v2/auth?" + q.toString());
    return new Promise(() => { }); // the page is leaving
  }

  class DriveError extends Error { constructor(message, signIn) { super(message); this.signIn = !!signIn; } }

  async function call(method, url, body, headers, raw) {
    const t = saved();
    if (!t) throw new DriveError("Tap to sign in to Google again.", true);
    let res;
    try { res = await fetch(url, { method, headers: Object.assign({ Authorization: "Bearer " + t.token }, headers || {}), body, cache: "no-store" }); }
    catch (e) { throw new DriveError("Can't reach Google Drive right now. Changes wait on this phone."); }
    if (res.status === 401) { sessionStorage.removeItem(KEY); throw new DriveError("Tap to sign in to Google again.", true); }
    if (res.status === 403) {
      const text = await res.text();
      if (/insufficient|scope/i.test(text)) { sessionStorage.removeItem(KEY); localStorage.removeItem(CONSENT); throw new DriveError("MakerVault Mobile needs the Google Drive permission. Sign in again and tick Google Drive.", true); }
      throw new DriveError("Google Drive said no (403). Try again in a minute.");
    }
    if (!res.ok) throw new DriveError("Google Drive answered " + res.status + ". Trying again later.");
    return raw ? res.text() : res.json();
  }
  const quote = s => "'" + s.replace(/\\/g, "\\\\").replace(/'/g, "\\'") + "'";

  async function query(q) {
    const out = [];
    let page = null;
    do {
      const url = API + "/files?q=" + encodeURIComponent(q) + "&spaces=drive&pageSize=1000&fields=" + encodeURIComponent("nextPageToken,files(id,name,size,modifiedTime)") + (page ? "&pageToken=" + encodeURIComponent(page) : "");
      const j = await call("GET", url);
      for (const f of j.files || []) out.push({ id: f.id, name: f.name, size: parseInt(f.size || "0", 10), modified: f.modifiedTime });
      page = j.nextPageToken;
    } while (page && out.length < 200000);
    return out;
  }

  const googleCloud = {
    list: folder => query(quote(folder) + " in parents and trashed = false and mimeType != '" + FOLDER + "'"),
    read: id => call("GET", API + "/files/" + encodeURIComponent(id) + "?alt=media", undefined, undefined, true),
    async create(folder, name, text, mime) {
      const boundary = "mv" + Math.random().toString(16).slice(2);
      const body = "--" + boundary + "\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n" + JSON.stringify({ name, parents: [folder], mimeType: mime }) +
        "\r\n--" + boundary + "\r\nContent-Type: " + mime + "\r\n\r\n" + text + "\r\n--" + boundary + "--";
      const j = await call("POST", UPLOAD + "/files?uploadType=multipart&fields=id,name,size,modifiedTime", new Blob([body]), { "Content-Type": "multipart/related; boundary=" + boundary });
      return { id: j.id, name: j.name, size: parseInt(j.size || "0", 10), modified: j.modifiedTime };
    },
    update: (id, text, mime) => call("PATCH", UPLOAD + "/files/" + encodeURIComponent(id) + "?uploadType=media&fields=id", new Blob([text]), { "Content-Type": mime }),
    async findFolder(name) {
      const hits = await query("name = " + quote(name) + " and mimeType = '" + FOLDER + "' and 'root' in parents and trashed = false");
      return hits.length ? hits[0].id : null;
    },
  };

  async function learnEmail() {
    try {
      const j = await call("GET", "https://openidconnect.googleapis.com/v1/userinfo");
      if (j.email) { localStorage.setItem(EMAIL, j.email); Drive.email = j.email; }
    } catch (e) { }
  }

  const Drive = {
    email: typeof localStorage !== "undefined" ? localStorage.getItem(EMAIL) : null,
    answer,
    get cloud() { return root.MV_TEST_CLOUD || googleCloud; },
    signedIn() { return !!root.MV_TEST_CLOUD || !!saved() || localStorage.getItem(CONSENT) === "1"; },
    /// True when Drive can be used now. Otherwise, with interactive (a tap), goes to Google and comes back.
    async ready(interactive) {
      if (root.MV_TEST_CLOUD) return true;
      if (saved()) { if (!Drive.email) learnEmail(); return true; }
      if (!CONFIG.googleClientId) throw new DriveError("MakerVault Mobile isn't connected to Google yet (one-time setup).");
      if (!interactive) return false;
      return goToGoogle(localStorage.getItem(CONSENT) === "1" && !(answer && answer.error));
    },
    /// When the app opens after a while: get a fresh key without asking (only if Google has said yes before).
    renewOnOpen() {
      if (root.MV_TEST_CLOUD || saved() || !CONFIG.googleClientId || localStorage.getItem(CONSENT) !== "1") return false;
      if (answer && answer.error) return false; // don't loop if Google wants the person to choose
      goToGoogle(true);
      return true;
    },
    findFolder: name => (root.MV_TEST_CLOUD || googleCloud).findFolder(name),
    async signOut() {
      const t = saved();
      sessionStorage.removeItem(KEY);
      localStorage.removeItem(CONSENT);
      if (t) { try { await fetch("https://oauth2.googleapis.com/revoke?token=" + encodeURIComponent(t.token), { method: "POST" }); } catch (e) { } }
    },
  };
  root.Drive = Drive;
})(typeof self !== "undefined" ? self : globalThis);
