// Cloud save: keeps a copy of the game in the Cloudflare save endpoint, alongside the local save.
// The local save (localStorage) is always written first, so the game works offline.
// Loaded after game.js. It wraps save(), so every existing save point also sends a cloud copy.
(function () {
  var ENDPOINT = "https://save-worker.chrisjones59.workers.dev/save/";
  var ID_KEY = "roam-save-id";
  var MAX_BYTES = 512 * 1024;
  var DEBOUNCE_MS = 4000;          // wait this long after the last save point before sending
  var status = { state: "idle", at: null, detail: "" };  // idle | saving | saved | offline | failed | toolarge
  var timer = null, pending = null;

  // The player's cloud ID: random, made once, kept in this browser only.
  function saveId() {
    try {
      var id = localStorage.getItem(ID_KEY);
      if (!id) { id = crypto.randomUUID(); localStorage.setItem(ID_KEY, id); }
      return id;
    } catch (e) { return null; }
  }
  // Can the cloud copy be used at all? (no storage, no crypto, or the player has cleared it)
  function available() { return !!saveId(); }

  // The payload is the same shape as an exported save file, so it can be imported the same way.
  function payload() {
    return JSON.stringify({ rtwSave: SAVE_VERSION, saved: new Date().toISOString(), settings: PREFS, state: S });
  }

  function setStatus(state, detail) {
    status = { state: state, at: new Date(), detail: detail || "" };
    if (typeof render === "function" && typeof S !== "undefined" && S && S.phase === "journal") { try { render(); } catch (e) {} }
  }

  // Sends the latest save. A failure keeps the local copy and marks the status; the next save point tries again.
  function send() {
    timer = null;
    if (!S || !available()) return;
    var body = payload();
    if (new TextEncoder().encode(body).length > MAX_BYTES) { setStatus("toolarge", "The save is too large for the cloud. Your local copy is kept."); return; }
    setStatus("saving");
    fetch(ENDPOINT + saveId(), { method: "PUT", headers: { "Content-Type": "application/json" }, body: body })
      .then(function (r) {
        if (r.ok) { pending = null; setStatus("saved"); return; }
        setStatus("failed", "Cloud save failed (" + r.status + "). Your local copy is kept.");
      })
      .catch(function () {
        pending = body;   // try again at the next save point
        setStatus("offline", "No connection. Your local copy is kept and the cloud copy will update later.");
      });
  }

  // Debounced: several save points in quick succession send one copy.
  function queue() {
    if (!available()) return;
    clearTimeout(timer);
    timer = setTimeout(send, DEBOUNCE_MS);
  }

  // Wrap the game's save(): the local write happens first, then the cloud copy is queued.
  var localSave = save;
  save = function () { localSave(); queue(); };

  // Retry an unsent copy when the browser comes back online.
  window.addEventListener("online", function () { if (pending) queue(); });

  // Start-up: if this browser has no game but the cloud has one, offer to load it.
  function offerRestore() {
    if (!available() || (typeof S !== "undefined" && S)) return;
    fetch(ENDPOINT + saveId()).then(function (r) {
      if (!r.ok) return null;                       // 404 = nothing saved yet
      return r.json();
    }).then(function (d) {
      if (!d) return;
      var o = d && d.rtwSave ? d.state : d;
      if (!saveIsValid(o)) return;
      if (!confirm("A saved game was found in the cloud. Load it?")) return;
      if (d.settings) { PREFS = prefsMerge(d.settings); prefsSave(); }
      busyStart("Loading your save\u2026");
      journeyReady(o.start, o.goal).then(function () {
        busyEnd(); S = o; save(); render(); setStatus("saved");
      }, function (err) {
        busyEnd(); alert("Could not load the map for the cloud save: " + (err && err.message || err));
      });
    }).catch(function () { /* offline at start-up: nothing to do, the local game still loads */ });
  }
  window.addEventListener("load", function () { setTimeout(offerRestore, 0); });

  // Text for the Journal page: what the cloud copy is doing right now.
  window.cloudStatusHtml = function () {
    if (!available()) return "";
    var t = { idle: "Cloud save: not used yet", saving: "Cloud save: saving\u2026", saved: "Cloud save: up to date",
              offline: "Cloud save: waiting for a connection", failed: "Cloud save: not updated", toolarge: "Cloud save: too large" }[status.state] || "";
    var when = status.at ? " (" + status.at.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + ")" : "";
    var detail = status.detail ? "<div class='mute fine'>" + esc(status.detail) + "</div>" : "";
    return "<div class='panel'><div>" + esc(t) + when + "</div>" + detail + "</div>";
  };

  // Forget the cloud copy in this browser. The Worker does not yet have a delete route, so the saved copy
  // expires after the Worker's expiry time (60 days) instead. Add a DELETE route if you want immediate removal.
  window.cloudForget = function () {
    try { localStorage.removeItem(ID_KEY); } catch (e) {}
    setStatus("idle", "The cloud copy will expire on its own, after 60 days.");
  };
})();
