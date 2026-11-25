// Cloud save with a four-word save code.
// The code is four words from EFF_WORDS (data/eff-words.js). The save is stored under the SHA-256 hash of the code,
// so the words themselves are not sent to the server. The local save (localStorage) is always written first.
// Loaded after game.js: it wraps save(), so existing save points also queue a cloud copy when enabled.
(function () {
  var ENDPOINT = "https://save-worker.chrisjones59.workers.dev/save/";
  var CODE_KEY = "roam-save-code";
  var CLOUD_ENABLED_KEY = "roam-cloud-save-enabled";
  var MAX_BYTES = 512 * 1024;
  var DEBOUNCE_MS = 4000;
  var status = { state: "idle", at: null, detail: "" };   // idle | saving | saved | offline | failed | toolarge | deleted | disabled
  var timer = null, pendingSend = false, activeSend = null, cloudTransition = false, cloudOptOutSession = false;

  function wordList() { return typeof EFF_WORDS !== "undefined" ? EFF_WORDS : null; }
  function cloudEnabled() {
    if (cloudOptOutSession) return false;
    try { return localStorage.getItem(CLOUD_ENABLED_KEY) !== "0"; } catch (e) { return true; }
  }
  function setCloudEnabled(enabled) {
    try {
      if (enabled) localStorage.removeItem(CLOUD_ENABLED_KEY);
      else localStorage.setItem(CLOUD_ENABLED_KEY, "0");
      return true;
    } catch (e) { return false; }
  }
  function forgetCode() { try { localStorage.removeItem(CODE_KEY); return true; } catch (e) { return false; } }
  if (!cloudEnabled()) status.state = "disabled";

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
    if (!S || !cloudEnabled() || cloudTransition) return Promise.resolve();
    var code = ensureCode(), body = payload();
    if (new TextEncoder().encode(body).length > MAX_BYTES) { setStatus("toolarge", "The save is too large for the cloud. Your local copy is kept."); return Promise.resolve(); }
    setStatus("saving");
    var request = keyFor(code).then(function (key) {
      return fetch(ENDPOINT + key, { method: "PUT", headers: { "Content-Type": "application/json" }, body: body });
    }).then(function (r) {
      if (r.ok) { pendingSend = false; setStatus("saved"); return; }
      setStatus("failed", "Cloud save failed (" + r.status + "). Your local copy is kept.");
    }).catch(function () {
      pendingSend = true;
      setStatus("offline", "No connection. Your local copy is kept, and the cloud copy will update later.");
    });
    activeSend = request;
    request.then(function () { if (activeSend === request) activeSend = null; });
    return request;
  }

  function queue() {
    if (!S || !cloudEnabled() || cloudTransition) return;
    clearTimeout(timer);
    timer = setTimeout(send, DEBOUNCE_MS);
  }

  // The local save happens first; the cloud copy is queued behind it.
  var localSave = save;
  save = function () { localSave(); queue(); };
  window.addEventListener("online", function () { if (pendingSend) queue(); });

  // Fetches the cloud save for a code and loads it, after confirmation.
  function loadFromCode(code, confirmText, onConfirm) {
    if (!cloudEnabled()) { alert("Cloud saving is turned off. Import a save file to load a campaign."); return Promise.resolve(); }
    return keyFor(code).then(function (key) {
      return fetch(ENDPOINT + key);
    }).then(function (r) {
      if (r.status === 404) { alert("No save was found for that code."); return; }
      if (!r.ok) { alert("Could not reach the save server (" + r.status + ")."); return; }
      return r.json().then(function (d) {
        var o = d && d.rtwSave ? d.state : d;
        if (!saveIsValid(o)) { alert("That save could not be read."); return; }
        if (!confirm(confirmText)) return;
        if (onConfirm) onConfirm();
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
    if (!cloudEnabled()) { alert("Cloud saving is turned off. Import a save file to load a campaign."); return true; }
    if (!isValidCode(code)) { alert("That link doesn't contain a valid save code."); return true; }
    // loadFromCode asks for confirmation before anything on this device is replaced.
    setCode(code);
    loadFromCode(code, "Load the save for this link? It replaces the game on this device.");
    return true;
  }

  // Start-up with no link: if this device already has a code but no local game, offer to load the cloud save.
  function offerRestore() {
    if (!cloudEnabled() || S || !getCode()) return;
    loadFromCode(getCode(), "A saved game was found in the cloud for this device. Load it?");
  }
  window.addEventListener("load", function () {
    setTimeout(function () {
      if (!checkRestoreLink()) {
        offerRestore();
        if (S) queue();
      }
    }, 0);
  });

  // ---- Settings ----
  function refreshSettings() {
    var el = document.getElementById("rtw-settings-status");
    if (el) el.textContent = statusText();
  }
  function statusText() {
    var t = { idle: "Not saved to the cloud yet", saving: "Saving\u2026", saved: "Cloud save is up to date",
      offline: "Waiting for a connection", failed: "Cloud save not updated", toolarge: "Save too large for the cloud",
      deleted: "Cloud save deleted", disabled: "Cloud saving is off" }[status.state] || "";
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
    ".rtw-box .mute{opacity:.8;font-size:.85rem;line-height:1.4}" +
    ".rtw-box .rtw-input{display:block;width:100%;font:inherit;padding:10px;border-radius:8px;border:1px solid var(--line,#50616b);background:var(--bg,#0e1a21);color:var(--ink,#e8eef2);margin:4px 0 8px}" +
    ".rtw-box .rtw-divider{border:0;border-top:1px solid var(--line,#50616b);margin:16px 0}";

  function ensureCss() {
    if (document.getElementById("rtw-settings-css")) return;
    var st = document.createElement("style"); st.id = "rtw-settings-css"; st.textContent = CSS;
    document.head.appendChild(st);
  }

  function codeInputHtml(inputId, buttonId, messageId) {
    var code = getCode();
    if (!isValidCode(code)) code = "";
    else code = code.split("-").join(" ");
    return "<label for='" + inputId + "'>Four-word save code</label>" +
      "<input class='rtw-input' id='" + inputId + "' type='text' value='" + esc(code) +
      "' placeholder='Enter or paste your four words' autocomplete='off' autocapitalize='none' spellcheck='false'>" +
      "<div class='rtw-row'><button type='button' id='" + buttonId + "'>Load cloud save</button></div>" +
      "<div class='mute' id='" + messageId + "' aria-live='polite'></div>";
  }

  function bindCodeInput(inputId, buttonId, messageId, closeModal) {
    var input = document.getElementById(inputId);
    var message = document.getElementById(messageId);
    function submit() {
      var code = normalise(input.value);
      if (!isValidCode(code)) {
        message.textContent = "Enter all four words from your save code.";
        input.focus();
        return;
      }
      input.value = code.split("-").join(" ");
      message.textContent = "";
      setCode(code);
      loadFromCode(code, "Load this save? It replaces the game on this device.", closeModal);
    }
    document.getElementById(buttonId).onclick = submit;
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); submit(); }
    });
  }

  function closeLoadModal() {
    var modal = document.getElementById("rtw-load-modal");
    if (modal) modal.remove();
  }

  function turnOffCloudSaving(message) {
    if (!confirm("Turn off cloud saving on this browser? This deletes the cloud copy for your save code and removes the code from this device. Your local campaign stays here; other devices still using that code can create a new cloud copy.")) return;
    if (cloudTransition) return;
    var code = getCode();
    if (!isValidCode(code)) code = null;
    clearTimeout(timer);
    timer = null;
    pendingSend = false;
    cloudTransition = true;
    message.textContent = code ? "Deleting the cloud copy..." : "Turning off cloud saving...";
    Promise.resolve(activeSend).then(function () {
      if (!code) return { ok: true, status: 204 };
      return keyFor(code).then(function (key) {
        return fetch(ENDPOINT + key, { method: "DELETE" });
      });
    }).then(function (r) {
      if (!r.ok && r.status !== 404) throw new Error("Cloud delete failed (" + r.status + ")");
      var settingSaved = setCloudEnabled(false);
      cloudOptOutSession = !settingSaved;
      var codeRemoved = forgetCode();
      cloudTransition = false;
      pendingSend = false;
      status = {
        state: "disabled",
        at: new Date(),
        detail: settingSaved
          ? (codeRemoved ? "Your cloud copy and save code were removed." : "Your cloud copy was deleted, but the code could not be cleared from this browser.")
          : "Your cloud copy was deleted, but this browser could not save the opt-out setting."
      };
      openSettings();
    }).catch(function () {
      cloudTransition = false;
      setStatus("failed", "The cloud copy could not be deleted, so cloud saving remains on.");
      message.textContent = "Could not delete the cloud copy. Cloud saving remains on; please try again.";
      if (S) queue();
    });
  }

  function turnOnCloudSaving() {
    if (!setCloudEnabled(true)) {
      var message = document.getElementById("rtw-msg");
      if (message) message.textContent = "Could not save this setting in browser storage.";
      return;
    }
    cloudOptOutSession = false;
    status = { state: "idle", at: null, detail: "" };
    ensureCode();
    openSettings();
    if (S) queue();
  }

  window.openSaveLoadModal = function () {
    ensureCss();
    closeLoadModal();
    var cloudLoad = cloudEnabled()
      ? "<hr class='rtw-divider'><h3>Load with a save code</h3>" +
        codeInputHtml("rtw-load-code", "rtw-load-code-button", "rtw-load-code-message")
      : "<hr class='rtw-divider'><p class='mute'>Cloud saving is off. To load a campaign, import a downloaded save file.</p>";
    var wrap = document.createElement("div");
    wrap.id = "rtw-load-modal";
    wrap.className = "rtw-modal";
    wrap.innerHTML =
      "<div class='rtw-box' role='dialog' aria-modal='true' aria-labelledby='rtw-load-title'>" +
        "<button type='button' onclick='closeSaveLoadModal()' style='float:right'>Close</button>" +
        "<h2 id='rtw-load-title'>Load a save</h2>" +
        "<h3>Import a save file</h3>" +
        "<p class='mute'>Choose a previously downloaded save file from this device.</p>" +
        "<div class='rtw-row'><button type='button' id='rtw-load-file-button'>Choose save file</button></div>" +
        "<input class='sr-only' type='file' id='rtw-load-file' accept='.json,application/json' aria-label='Choose a save file'>" +
        cloudLoad +
      "</div>";
    document.body.appendChild(wrap);
    wrap.addEventListener("click", function (e) { if (e.target === wrap) closeLoadModal(); });
    document.getElementById("rtw-load-file-button").onclick = function () {
      document.getElementById("rtw-load-file").click();
    };
    document.getElementById("rtw-load-file").onchange = function () {
      var file = this.files && this.files[0];
      if (!file) return;
      closeLoadModal();
      importSave(file);
    };
    if (cloudEnabled()) bindCodeInput("rtw-load-code", "rtw-load-code-button", "rtw-load-code-message", closeLoadModal);
  };
  window.closeSaveLoadModal = closeLoadModal;

  window.openSettings = function () {
    ensureCss();
    var old = document.getElementById("rtw-settings"); if (old) old.remove();
    var cloudOn = cloudEnabled();
    var code = cloudOn ? ensureCode() : null;
    var campaignActions = typeof S !== "undefined" && S
      ? "<h3>Campaign</h3><p class='mute'>End the local campaign." + (cloudOn ? " To also remove its cloud copy, use Delete cloud save." : " Any downloaded save files are unaffected.") + "</p><div class='rtw-row'><button type='button' class='rtw-danger' id='rtw-end-campaign'>End campaign</button></div>"
      : "";
    var saveControls = cloudOn
      ? "<h3>Your save code</h3>" +
        "<div class='rtw-code'>" + code.split("-").join(" \u00b7 ") + "</div>" +
        "<p class='mute'>The 'Copy' button below copies the above four-word code to your clipboard.</p>" +
        "<p class='mute'>'Copy link' and 'Share...' create a personal link to access your save and continue on another device. It isn't published or stored by the game; it's only visible on devices where you copy or save it, unless you choose to share it.</p>" +
        "<p class='mute'>'Download save file' downloads a data file to your device that you can use as a backup at this point in time, or import on another device.</p>" +
        "<div class='rtw-row'>" +
          "<button type='button' id='rtw-copy-code'>Copy code</button>" +
          "<button type='button' id='rtw-copy-link'>Copy link</button>" +
          (navigator.share ? "<button type='button' id='rtw-share'>Share\u2026</button>" : "") +
          "<button type='button' id='rtw-download'>Download save file</button>" +
        "</div>" +
        "<div class='mute' id='rtw-msg'></div>" +
        "<h3>Cloud save</h3>" +
        "<div class='mute' id='rtw-settings-status'>" + statusText() + "</div>" +
        "<h3>Load a save with a code</h3>" +
        codeInputHtml("rtw-settings-code", "rtw-settings-load-code", "rtw-settings-code-message") +
        "<div class='rtw-row'><button type='button' class='rtw-danger' id='rtw-delete'>Delete cloud save</button><button type='button' class='rtw-danger' id='rtw-disable-cloud'>Turn off cloud saving</button></div>"
      : "<h3>Cloud saving is off</h3>" +
        "<p class='mute'>Cloud saving is off in this browser. Your campaign stays here unless you download a save file. No save-code or personal-link controls are active on this device. Turn cloud saving off on your other devices too; one that remains enabled can create a new cloud copy.</p>" +
        "<div class='mute' id='rtw-settings-status'>" + statusText() + "</div>" +
        "<div class='rtw-row'><button type='button' id='rtw-download'>Download save file</button><button type='button' id='rtw-enable-cloud'>Turn on cloud saving</button></div>" +
        "<div class='mute' id='rtw-msg'></div>";
    var privacyText = cloudOn
      ? "The game holds no personal data: no name, email address, password or account. Your only identifier is the four-word code above. It's stored on this device, and the save server keeps your save under a hash of that code, not the words themselves. The save expires after 60 days. Cloudflare keeps standard request logs for the save server. Anyone with your code can read or overwrite your save, so treat it like a password and share it only with your own devices."
      : "Cloud saving is off in this browser. Your campaign is stored here and in any save files you download; no save-code or personal-link controls are active on this device.";
    var wrap = document.createElement("div");
    wrap.id = "rtw-settings"; wrap.className = "rtw-modal";
    wrap.innerHTML =
      "<div class='rtw-box' role='dialog' aria-label='Settings'>" +
        "<button type='button' onclick='closeSettings()' style='float:right'>Close</button>" +
        "<h2>Settings</h2>" +
        saveControls +
        campaignActions +
        "<h3>Privacy</h3>" +
        "<p class='mute'>" + privacyText + "</p>" +
        (cloudOn ? "<p class='mute'>Word list: EFF Diceware (CC BY 3.0 US), eff.org/dice.</p>" : "") +
      "</div>";
    document.body.appendChild(wrap);
    wrap.addEventListener("click", function (e) { if (e.target === wrap) closeSettings(); });
    var msg = document.getElementById("rtw-msg");
    if (cloudOn) {
      document.getElementById("rtw-copy-code").onclick = function () { copyText(code, msg); };
      document.getElementById("rtw-copy-link").onclick = function () { copyText(linkFor(code), msg); };
      var sh = document.getElementById("rtw-share"); if (sh) sh.onclick = function () { shareLink(code, msg); };
      bindCodeInput("rtw-settings-code", "rtw-settings-load-code", "rtw-settings-code-message", window.closeSettings);
      document.getElementById("rtw-delete").onclick = function () { deleteCloudSave(code, msg); };
      document.getElementById("rtw-disable-cloud").onclick = function () { turnOffCloudSaving(msg); };
    } else {
      document.getElementById("rtw-enable-cloud").onclick = turnOnCloudSaving;
    }
    document.getElementById("rtw-download").onclick = function () { if (S) exportSave(); else msg.textContent = "There's no game to save yet."; };
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
