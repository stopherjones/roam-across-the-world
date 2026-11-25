// Cloud save with a four-word save code.
// The code is four words from EFF_WORDS (data/eff-words.js). The save is stored under the SHA-256 hash of the code,
// so the words themselves are not sent to the server. The local save (localStorage) is always written first.
// Loaded after game.js: it wraps save(), so each existing save point also sends a cloud copy.
(function () {
  var ENDPOINT = "https://save-worker.chrisjones59.workers.dev/save/";
  var CODE_KEY = "roam-save-code";
  var MAX_BYTES = 512 * 1024;
  var DEBOUNCE_MS = 4000;
  var status = { state: "idle", at: null, detail: "" };   // idle | saving | saved | offline | failed | toolarge | deleted
  var timer = null, pendingSend = false;

  function wordList() { return typeof EFF_WORDS !== "undefined" ? EFF_WORDS : null; }

  // Four words, picked uniformly with rejection sampling so no word is favoured.
  function makeCode() {
    var list = wordList(), n = list.length, limit = Math.floor(4294967296 / n) * n, out = [];
    while (out.length < 4) {
      var a = new Uint32Array(1);
      crypto.getRandomValues(a);
      if (a[0] < limit) out.push(list[a[0] % n]);
    }
    return out.join("-");
  }

  // Tidies what someone types or pastes: any case, spaces or punctuation between words.
  function normalise(text) {
    return String(text || "").toLowerCase().split(/[^a-z]+/).filter(Boolean).join("-");
  }
  function isValidCode(code) {
    var list = wordList();
    if (!list || typeof code !== "string") return false;
    var parts = code.split("-");
    return parts.length === 4 && parts.every(function (w) { return list.indexOf(w) >= 0; });
  }

  function getCode() { try { return localStorage.getItem(CODE_KEY); } catch (e) { return null; } }
  function setCode(code) { try { localStorage.setItem(CODE_KEY, code); } catch (e) {} }
  // The code is made the first time it's needed (first save, or opening Settings).
  function ensureCode() {
    var c = getCode();
    if (!c || !isValidCode(c)) { c = makeCode(); setCode(c); }
    return c;
  }

  // SHA-256 hex of the code: the key the server stores the save under.
  function keyFor(code) {
    return crypto.subtle.digest("SHA-256", new TextEncoder().encode(code)).then(function (h) {
      return Array.prototype.map.call(new Uint8Array(h), function (b) { return ("0" + b.toString(16)).slice(-2); }).join("");
    });
  }

  // Same shape as an exported save file, so an import and a cloud load treat it the same way.
  function payload() {
    return JSON.stringify({ rtwSave: SAVE_VERSION, saved: new Date().toISOString(), settings: PREFS, state: S });
  }

  function setStatus(state, detail) {
    status = { state: state, at: new Date(), detail: detail || "" };
    refreshSettings();
  }

  function send() {
    timer = null;
    if (!S) return;
    var code = ensureCode(), body = payload();
    if (new TextEncoder().encode(body).length > MAX_BYTES) { setStatus("toolarge", "The save is too large for the cloud. Your local copy is kept."); return; }
    setStatus("saving");
    keyFor(code).then(function (key) {
      return fetch(ENDPOINT + key, { method: "PUT", headers: { "Content-Type": "application/json" }, body: body });
    }).then(function (r) {
      if (r.ok) { pendingSend = false; setStatus("saved"); return; }
      setStatus("failed", "Cloud save failed (" + r.status + "). Your local copy is kept.");
    }).catch(function () {
      pendingSend = true;
      setStatus("offline", "No connection. Your local copy is kept, and the cloud copy will update later.");
    });
  }

  function queue() {
    if (!S) return;
    clearTimeout(timer);
    timer = setTimeout(send, DEBOUNCE_MS);
  }

  // The local save happens first; the cloud copy is queued behind it.
  var localSave = save;
  save = function () { localSave(); queue(); };
  window.addEventListener("online", function () { if (pendingSend) queue(); });

  // Fetches the cloud save for a code and loads it, after confirmation.
  function loadFromCode(code, confirmText) {
    return keyFor(code).then(function (key) {
      return fetch(ENDPOINT + key);
    }).then(function (r) {
      if (r.status === 404) { alert("No save was found for that code."); return; }
      if (!r.ok) { alert("Could not reach the save server (" + r.status + ")."); return; }
      return r.json().then(function (d) {
        var o = d && d.rtwSave ? d.state : d;
        if (!saveIsValid(o)) { alert("That save could not be read."); return; }
        if (!confirm(confirmText)) return;
        if (d.settings) { PREFS = prefsMerge(d.settings); prefsSave(); }
        busyStart("Loading your save\u2026");
        return journeyReady(o.start, o.goal).then(function () {
          busyEnd(); S = o; localSave(); render(); setStatus("saved");
        }, function (err) {
          busyEnd(); alert("Could not load the map for this save: " + (err && err.message || err));
        });
      });
    }).catch(function () { alert("Could not reach the save server. Check your connection and try again."); });
  }

  // A link of the form ...?restore=word-word-word-word: stores the code, then offers to load it.
  // The parameter is removed from the address bar straight away so it doesn't stay in history.
  function checkRestoreLink() {
    var params = new URLSearchParams(location.search);
    if (!params.has("restore")) return false;
    var code = normalise(params.get("restore"));
    history.replaceState(null, "", location.pathname);
    if (!isValidCode(code)) { alert("That link doesn't contain a valid save code."); return true; }
    // loadFromCode asks for confirmation before anything on this device is replaced.
    setCode(code);
    loadFromCode(code, "Load the save for this link? It replaces the game on this device.");
    return true;
  }

  // Start-up with no link: if this device already has a code but no local game, offer to load the cloud save.
  function offerRestore() {
    if (S || !getCode()) return;
    loadFromCode(getCode(), "A saved game was found in the cloud for this device. Load it?");
  }
  window.addEventListener("load", function () {
    setTimeout(function () { if (!checkRestoreLink()) offerRestore(); }, 0);
  });

  // ---- Settings ----
  function refreshSettings() {
    var el = document.getElementById("rtw-settings-status");
    if (el) el.textContent = statusText();
  }
  function statusText() {
    var t = { idle: "Not saved to the cloud yet", saving: "Saving\u2026", saved: "Cloud save is up to date",
      offline: "Waiting for a connection", failed: "Cloud save not updated", toolarge: "Save too large for the cloud",
      deleted: "Cloud save deleted" }[status.state] || "";
    var when = status.at ? " (" + status.at.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + ")" : "";
    return t + when + (status.detail ? ". " + status.detail : "");
  }

  function linkFor(code) { return location.origin + location.pathname + "?restore=" + code; }

  function copyText(text, msgEl) {
    var done = function () { msgEl.textContent = "Copied."; };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { msgEl.textContent = "Copy didn't work here. Select the text and copy it by hand."; });
    } else { msgEl.textContent = "Copy isn't available here. Select the text and copy it by hand."; }
  }

  function shareLink(code, msgEl) {
    var data = { title: "Roam Across the World save", text: "My Roam Across the World save code: " + code, url: linkFor(code) };
    if (navigator.share) {
      navigator.share(data).catch(function (e) { if (e && e.name !== "AbortError") msgEl.textContent = "Sharing didn't work here. Use Copy link instead."; });
    } else { msgEl.textContent = "Sharing isn't available here. Use Copy link instead."; }
  }

  function deleteCloudSave(code, msgEl) {
    if (!confirm("Delete the cloud save for this code? This device will keep its game, but the cloud copy will be removed and this code will stop working.")) return;
    keyFor(code).then(function (key) {
      return fetch(ENDPOINT + key, { method: "DELETE" });
    }).then(function (r) {
      if (r.ok || r.status === 404) {
        try { localStorage.removeItem(CODE_KEY); } catch (e) {}
        status = { state: "deleted", at: new Date(), detail: "A new code will be made the next time you save." };
        msgEl.textContent = "Deleted.";
        refreshSettings();
      } else { msgEl.textContent = "Could not delete (" + r.status + "). Try again."; }
    }).catch(function () { msgEl.textContent = "No connection. The cloud save was not deleted."; });
  }

  var CSS = ".rtw-cog{position:fixed;top:6px;right:6px;z-index:900;background:transparent;border:0;font-size:20px;cursor:pointer;padding:4px 6px;color:inherit}" +
    ".rtw-modal{position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:1000;display:flex;align-items:center;justify-content:center;padding:12px;box-sizing:border-box}" +
    ".rtw-box{background:var(--card,#1b2630);color:var(--ink,#e8eef2);border-radius:10px;max-width:520px;width:100%;max-height:90vh;overflow:auto;padding:16px;box-sizing:border-box}" +
    ".rtw-code{font:600 1.3rem Georgia,serif;letter-spacing:.02em;word-break:break-word;margin:6px 0 10px}" +
    ".rtw-box .rtw-row{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0}" +
    ".rtw-box button{font:inherit;padding:8px 12px;border-radius:8px;border:0;background:var(--acc,#7bbfae);color:var(--accfg,#0d1419);cursor:pointer}" +
    ".rtw-box .rtw-danger{background:#8a2b2b;color:#fff}" +
    ".rtw-box .mute{opacity:.8;font-size:.85rem;line-height:1.4}";

  function ensureCss() {
    if (document.getElementById("rtw-settings-css")) return;
    var st = document.createElement("style"); st.id = "rtw-settings-css"; st.textContent = CSS;
    document.head.appendChild(st);
  }

  window.openSettings = function () {
    ensureCss();
    var old = document.getElementById("rtw-settings"); if (old) old.remove();
    var code = ensureCode();
    var campaignActions = typeof S !== "undefined" && S
      ? "<h3>Campaign</h3><p class='mute'>End the local campaign. To also remove its cloud copy, use Delete cloud save.</p><div class='rtw-row'><button type='button' class='rtw-danger' id='rtw-end-campaign'>End campaign</button></div>"
      : "";
    var wrap = document.createElement("div");
    wrap.id = "rtw-settings"; wrap.className = "rtw-modal";
    wrap.innerHTML =
      "<div class='rtw-box' role='dialog' aria-label='Settings'>" +
        "<button type='button' onclick='closeSettings()' style='float:right'>Close</button>" +
        "<h2>Settings</h2>" +
        "<h3>Your save code</h3>" +
        "<div class='rtw-code'>" + code.split("-").join(" \u00b7 ") + "</div>" +
        "<div class='rtw-row'>" +
          "<button type='button' id='rtw-copy-code'>Copy code</button>" +
          "<button type='button' id='rtw-copy-link'>Copy link</button>" +
          (navigator.share ? "<button type='button' id='rtw-share'>Share\u2026</button>" : "") +
          "<button type='button' id='rtw-download'>Download save file</button>" +
        "</div>" +
        "<div class='mute' id='rtw-msg'></div>" +
        "<h3>Cloud save</h3>" +
        "<div class='mute' id='rtw-settings-status'>" + statusText() + "</div>" +
        "<div class='rtw-row'><button type='button' class='rtw-danger' id='rtw-delete'>Delete cloud save</button></div>" +
        campaignActions +
        "<h3>Privacy</h3>" +
        "<p class='mute'>The game holds no personal data: no name, email address, password or account. " +
        "Your only identifier is the four-word code above. It's stored on this device, and the save server keeps your save under a hash of that code, " +
        "not the words themselves. The save expires after 60 days. Cloudflare keeps standard request logs for the save server. " +
        "Anyone with your code can read or overwrite your save, so treat it like a password and share it only with your own devices.</p>" +
        "<p class='mute'>Word list: EFF Diceware (CC BY 3.0 US), eff.org/dice.</p>" +
      "</div>";
    document.body.appendChild(wrap);
    wrap.addEventListener("click", function (e) { if (e.target === wrap) closeSettings(); });
    var msg = document.getElementById("rtw-msg");
    document.getElementById("rtw-copy-code").onclick = function () { copyText(code, msg); };
    document.getElementById("rtw-copy-link").onclick = function () { copyText(linkFor(code), msg); };
    var sh = document.getElementById("rtw-share"); if (sh) sh.onclick = function () { shareLink(code, msg); };
    document.getElementById("rtw-download").onclick = function () { if (S) exportSave(); else msg.textContent = "There's no game to save yet."; };
    document.getElementById("rtw-delete").onclick = function () { deleteCloudSave(code, msg); };
    var endCampaign = document.getElementById("rtw-end-campaign");
    if (endCampaign) endCampaign.onclick = function () {
      if (confirm("End the campaign on this device? Its local save will be cleared; any cloud copy remains.")) {
        closeSettings();
        reset();
      }
    };
  };
  window.closeSettings = function () { var m = document.getElementById("rtw-settings"); if (m) m.remove(); };

  // The cog, top right. It may overlap a badge in the header; move it into the header markup if so.
  window.addEventListener("load", function () {
    ensureCss();
    if (document.getElementById("rtw-cog")) return;
    var b = document.createElement("button");
    b.id = "rtw-cog"; b.className = "rtw-cog"; b.type = "button"; b.title = "Settings"; b.setAttribute("aria-label", "Settings");
    b.textContent = "\u2699";
    b.onclick = function () { window.openSettings(); };
    document.body.appendChild(b);
  });
})();
