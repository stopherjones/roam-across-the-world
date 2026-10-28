// Route teaser: a guiding brief built from the planner's route options (S.opts), sent to the model for a live teaser.
// Fares, sailing times and berth windows are never sent.
// Iteration 2: a guiding brief. Each option gives its opening leg, one constraint the player must plan around,
// and one piece of geography. The full itinerary is never sent. Labels such as fast or thrifty are not used.
function teaserNameOf(id){return N[id]?N[id].n:id}
function teaserConstraint(steps,modes,names){
  // The single most important constraint on the route, in plain words
  for(var i=0;i<steps.length;i++){
    var e=E[steps[i].j],mode=modes[i];
    if(!e||e.m!==mode)continue;
    if(e.berth)return "a one-off sailing, so timing matters";
    if(e.m==="ferry"&&e.hw>0){var d=e.hw/24;return d>=6?"the sailing runs about once a week":d>=3?"the sailing runs about twice a week":"the sailing runs daily"}
  }
  return null;
}
function teaserFeature(steps,modes){
  for(var i=0;i<steps.length;i++){
    var e=E[steps[i].j];
    if(e&&e.m==="ferry")return "a sea crossing";
    if(e&&N[e.a]&&N[e.b]&&N[e.a].c!==N[e.b].c)return "a border";
  }
  return null;
}
function buildTeaserBrief(from,to,options){
  // Distinct opening moves only, so the options differ
  var seen={},picks=[];
  (options||[]).forEach(function(o){
    var key=(o.names||[]).slice(0,3).join(">")+"|"+(o.modes||[]).slice(0,2).join(">");
    if(seen[key]||picks.length>=3)return; seen[key]=1; picks.push(o);
  });
  var lines=picks.map(function(o,i){
    var mode=(o.modes||[])[0],first=teaserNameOf((o.names||[])[1]);
    var word=({hsr:"fast train",rail:"train",bus:"bus",coach:"coach",ferry:"ferry",air:"flight",shared:"shared minibus",tube:"metro"})[mode]||"transport";
    var parts=["Option "+(i+1)+": "+word+" to "+first];
    // The next leg is hinted at by mode only, so the route stays a guide
    if((o.steps||[]).length>1){var w2=({hsr:"fast train",rail:"train",bus:"bus",coach:"coach",ferry:"ferry",air:"flight",shared:"shared minibus",tube:"metro"})[(o.modes||[])[1]]||"transport";parts.push("then a "+w2+" onward")}
    var c=teaserConstraint(o.steps,o.modes||[],o.names||[]);
    if(o.nights>0)parts.push("an overnight leg");
    if(c)parts.push(c);
    var f=teaserFeature(o.steps,o.modes||[]);
    if(f)parts.push("passes "+f);
    return "- "+parts.join("; ");
  });
  return "Write a route teaser for a travel game in which players have to make their way from a start point to the destination, without access to timetable information up front.\n\n"+
   "The route is from "+from+" to "+to+".\n\n"+
   "Guide players on the options available without giving away the full details. Use your knowledge of the surrounding countryside and geographical features, but keep it light and descriptive rather than flowery. Keep the response to 30 words.\n\n"+
   "Route options:\n"+lines.join("\n");
}

// ---- Live teaser: the brief goes to the same worker and model as the destination introduction.
// Results are cached per route and option set. Any failure leaves the fallback sentence in place.
var TEASER_CACHE={};
function teaserFetch(brief){
  return fetch(FLAVOUR_URL,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:FLAVOUR_MODEL,messages:[{role:"user",content:brief}]})})
    .then(function(r){if(!r.ok)throw new Error("status "+r.status);return r.json()})
    .then(function(j){
      var t=((j.choices&&j.choices[0]&&j.choices[0].message&&j.choices[0].message.content)||"").replace(/\*\*/g,"").trim();
      if(!t)throw new Error("empty reply");
      return t;
    });
}
// Returns a promise for the teaser text. The same brief is only requested once.
function routeTeaserFor(from,to,options){
  var brief=buildTeaserBrief(from,to,options||[]);
  if(!TEASER_CACHE[brief]){
    TEASER_CACHE[brief]=teaserFetch(brief).catch(function(e){delete TEASER_CACHE[brief];throw e});
  }
  return TEASER_CACHE[brief];
}
