// Timeline activity: ten events about a city, placed in order one card at a time.
// timelineActivity(container, city, onClose) draws the whole activity inside container.
// Used by the game (rest and wait screens) and by the standalone prototype page.

var TL_PROXY = "https://groq-proxy.chrisjones59.workers.dev/chat/completions";
var TL_MODEL = "openai/gpt-oss-120b";
var TL_POINTS = 10;   // a card placed correctly first time
var TL_PENALTY = 1;   // each wrong guess on that card
var TL_MIN = 1;       // a card never scores less than this
var TL_CACHE = {};    // events by city, kept for the session so reopening does not call the model again

function tlPrompt(city) {
  return "I'm putting together a historical timeline quiz for the city of " + city + ". Give me 10 events and years covering a varied and interesting range of subjects including power and conflict, civic development, commerce and industry, popular culture. Do not invent events or years to complete the response. Provide your response as a JSON array of 10 objects, with the keys \"year\" (a whole number), \"event_text\" (a short description of around 10 to 15 words) and \"source_url\". Do not include any years, dates, centuries or BC/AD references in event_text: the year goes only in the \"year\" key. Return only the JSON array.";
}

async function tlAskModel(city) {
  var r = await fetch(TL_PROXY, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: TL_MODEL, messages: [{ role: "user", content: tlPrompt(city) }], max_tokens: 4000 })
  });
  if (!r.ok) throw new Error("The request failed (" + r.status + ").");
  var j = await r.json();
  var choice = j.choices && j.choices[0];
  var text = choice && choice.message && choice.message.content;
  if (!text || !text.trim()) throw new Error("No text came back (" + (choice && choice.finish_reason) + ").");
  return text;
}

// Removes any year that slips into the description. The year is shown separately on the card.
function tlClean(text) {
  return text
    .replace(/\b\d{1,4}\s*(?:BC|BCE|AD|CE)\b\.?/gi, "")
    .replace(/\b\d{1,2}(?:st|nd|rd|th)[\s-]+centur(?:y|ies)\b/gi, "")
    .replace(/\b(?:1\d{3}|20\d{2})s?\b/g, "")
    .replace(/\b(?:early|mid|late)[\s-]+(?=\d)/gi, "")
    // prepositions left dangling once their date is gone
    .replace(/\b(?:in|during|since|from|by|around|circa|until|of)\s+(?:the\s+)?(?=(?:after|before|when|following|since|until|and|from|,|\.|;|:|$))/gi, "")
    .replace(/\b(?:in|during|since|from|by|around|until)\s*(?=[.,;:]|$)/gi, "")
    .replace(/\s+([,.;:])/g, "$1")
    .replace(/([,;:])\s*([,;:.])/g, "$2")
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s,;:]+|[\s,;:]+$/g, "")
    .trim();
}

// Pulls the array out of the reply, even if it is in a code fence or has a sentence around it.
function tlParse(text) {
  var fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  var body = fenced ? fenced[1] : text.slice(text.indexOf("["), text.lastIndexOf("]") + 1);
  var arr = JSON.parse(body.trim());
  if (!Array.isArray(arr)) throw new Error("The reply was not a list.");
  var ok = arr.filter(function (e) { return Number.isInteger(e.year) && typeof e.event_text === "string" && e.event_text.trim(); });
  if (ok.length < 10) throw new Error("Only " + ok.length + " usable events came back.");
  return ok.slice(0, 10).map(function (e) {
    return { year: e.year, text: tlClean(e.event_text.trim()), url: typeof e.source_url === "string" ? e.source_url : "" };
  });
}

function timelineActivity(container, city, onClose, onFinish) {
  var events = [], deck = [], placed = [], pos = 1, wrong = {}, tried = {}, finished = false;
  var $ = function (sel) { return container.querySelector(sel); };
  var el = function (tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };

  container.replaceChildren();
  container.classList.add("tl-activity");
  var head = el("div", "tl-head");
  head.append(el("h2", "tl-title", "City Timeline"));
  if (onClose) { var x = el("button", "tl-close alt", "Close"); x.onclick = onClose; head.append(x); }
  container.append(head, el("p", "tl-sub", "Ten events about " + city + ". The first is given. Tap a gap to place each card where it belongs."));
  var status = el("div", "tl-status"); status.setAttribute("role", "status"); container.append(status);
  var board = el("div", "tl-board"); board.hidden = true;
  var bar = el("div", "tl-scorebar");
  var points = el("span", "tl-points"), progress = el("span", "tl-progress");
  bar.append(points, progress);
  var message = el("div", "tl-message"); message.setAttribute("aria-live", "polite");
  var track = el("div", "tl-track"); track.setAttribute("aria-label", "Timeline, earliest on the left");
  var hand = el("div", "tl-hand"); hand.setAttribute("aria-live", "polite");
  var hint = el("p", "tl-hint");
  var result = el("div", "tl-result"); result.hidden = true;
  var final = el("p", "tl-final"), finalNote = el("p", "tl-note"), breakdown = el("ol", "tl-breakdown");
  result.append(final, finalNote, breakdown);
  board.append(bar, message, track, hand, hint, result);
  container.append(board);

  function setStatus(msg, busy) {
    status.replaceChildren();
    if (busy) status.append(el("span", "tl-spin"));
    status.append(msg || "");
  }
  function say(text, kind) { message.className = "tl-message" + (kind ? " " + kind : ""); message.textContent = text; }

  var cardIdx = function () { return pos < deck.length ? deck[pos] : null; };
  var scoreOf = function (idx) { return Math.max(TL_MIN, TL_POINTS - TL_PENALTY * (wrong[idx] || 0)); };
  var maxPoints = function () { return (events.length - 1) * TL_POINTS; };
  // The given first card is not scored. A wrong guess on the card in hand comes off straight away.
  var totalPoints = function () {
    var placedScore = placed.filter(function (i) { return i !== deck[0]; }).reduce(function (s, i) { return s + scoreOf(i); }, 0);
    var h = cardIdx();
    return placedScore - (h !== null && !finished ? TL_PENALTY * (wrong[h] || 0) : 0);
  };
  // Is the card in hand correct in gap g? Only its two neighbours matter.
  var fits = function (idx, g) {
    var y = events[idx].year;
    var left = g > 0 ? events[placed[g - 1]].year : -Infinity;
    var right = g < placed.length ? events[placed[g]].year : Infinity;
    return y >= left && y <= right;
  };

  function startRound() {
    deck = events.map(function (_, i) { return i; });
    for (var i = deck.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = deck[i]; deck[i] = deck[j]; deck[j] = t; }
    placed = [deck[0]]; pos = 1; wrong = {}; tried = {}; finished = false;
    result.hidden = true; board.hidden = false;
    say("", "");
    render(true);
  }

  function tryPlace(g) {
    if (finished || cardIdx() === null || tried[g]) return;
    var idx = cardIdx();
    if (fits(idx, g)) {
      placed.splice(g, 0, idx);
      pos++;
      tried = {};   // the next card has its own gaps to try
      say("Correct, " + events[idx].year + ". +" + scoreOf(idx) + " points.", "good");
      if (pos >= deck.length) finish();
      render(true, idx);
    } else {
      wrong[idx] = (wrong[idx] || 0) + 1;
      tried[g] = true;
      say("Not there. −" + TL_PENALTY + " point. The red × marks a gap that's already wrong.", "bad");
      render(false);
    }
  }

  function render(scroll, newIdx) {
    points.textContent = String(totalPoints()) + " / " + maxPoints() + " points";
    progress.textContent = "Card " + Math.min(pos + 1, events.length) + " of " + events.length;
    drawHand();
    track.replaceChildren();
    var anchorEl = null, newEl = null;
    for (var i = 0; i <= placed.length; i++) {
      var slot = el("div", "tl-slot");
      if (!finished && cardIdx() !== null) {
        if (tried[i]) {
          var bad = el("button", "tl-gap bad", "×");
          bad.disabled = true; bad.setAttribute("aria-label", "Already tried here, wrong");
          slot.append(bad);
        } else {
          var g = el("button", "tl-gap", "+");
          g.setAttribute("aria-label", "Place the card in hand here, position " + (i + 1));
          (function (gap) { g.onclick = function () { tryPlace(gap); }; })(i);
          slot.append(g);
        }
      }
      if (i < placed.length) {
        var c = card(placed[i]);
        if (placed[i] === deck[0]) anchorEl = c;
        if (placed[i] === newIdx) newEl = c;
        slot.append(c);
      }
      track.append(slot);
    }
    var target = newEl || anchorEl;
    if (scroll && target && target.scrollIntoView) target.scrollIntoView({ inline: "center", block: "nearest" });
  }

  function drawHand() {
    var h = cardIdx();
    hand.replaceChildren();
    if (h === null || finished) { hand.hidden = true; hint.textContent = ""; return; }
    hand.hidden = false;
    hand.append(el("p", "tl-label", "Card in hand"), el("p", "tl-text", events[h].text));
    var n = wrong[h] || 0;
    hint.textContent = n ? "Tried " + n + (n === 1 ? " gap" : " gaps") + " so far. Keep going." : "Tap the gap where it belongs.";
  }

  function card(idx) {
    var e = events[idx];
    var c = el("div", "tl-card");
    if (idx === deck[0]) c.classList.add("anchor");
    if (finished) c.classList.add(wrong[idx] ? "final-wrong" : "final-right");
    c.append(el("div", "tl-year", String(e.year)), el("div", "tl-text", e.text));
    if (finished && e.url) {
      var a = el("a", "tl-src", "Source"); a.href = e.url; a.target = "_blank"; a.rel = "noopener";
      c.append(a);
    }
    return c;
  }

  function finish() {
    finished = true;
    var total = totalPoints();
    final.textContent = "Round over: " + total + " of " + maxPoints() + " points.";
    var perfect = placed.filter(function (i) { return i !== deck[0] && !wrong[i]; }).length;
    var payout = onFinish ? onFinish(total, maxPoints()) : "";
  finalNote.textContent = perfect + " of " + (events.length - 1) + " cards placed correctly first time." + (payout ? " " + payout : "");
    breakdown.replaceChildren();
    placed.forEach(function (idx) {
      var li = el("li"), n = wrong[idx] || 0;
      li.textContent = events[idx].year + ": " + events[idx].text + (idx === deck[0] ? " (given)" : n ? " (" + n + " wrong " + (n === 1 ? "guess" : "guesses") + ")" : " (first time)");
      breakdown.append(li);
    });
    result.hidden = false;
    hand.hidden = true; hint.textContent = "";
    say("Round over.", "good");
  }

  function begin(list) {
    events = list;
    setStatus("");
    startRound();
  }

  if (TL_CACHE[city]) {
    begin(TL_CACHE[city]);
  } else {
    setStatus("Finding events for " + city + "…", true);
    tlAskModel(city).then(function (text) {
      var list = tlParse(text);
      TL_CACHE[city] = list;
      begin(list);
    }).catch(function (err) {
      setStatus("Could not load events: " + err.message);
    });
  }
}
