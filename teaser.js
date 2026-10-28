// Route teaser prompts, built from the planner's own route options (S.opts).
// Sends modes, durations, frequency and features. Fares, sailing times and berth windows are never sent.
function teaserModeWord(e){
  if(e.berth)return e.kind==="cargo"?"cargo ship":"cruise ship";
  return({tube:"metro",bus:"bus",coach:"coach",rail:"train",hsr:"fast train",ferry:"ferry",shared:"shared minibus",air:"flight"})[e.m]||"transport";
}
// How often a leg runs, in words the model can use
function teaserFrequency(e){
  if(e.berth)return "a one-off sailing, infrequent";
  if(e.m==="ferry"&&e.hw>0){
    var days=e.hw/24;
    if(days>=6)return "about once a week";
    if(days>=3)return "about twice a week";
    return "daily";
  }
  if(e.m==="ferry")return "a scheduled sailing";
  return "regular service";
}
// Features a leg adds: sea, border, long wait, or none. No place names.
function teaserFeatures(e,from,to){
  var f=[];
  if(e.m==="ferry"||e.berth)f.push("sea crossing");
  if(e.m==="air")f.push("flight");
  if(from&&to&&N[from]&&N[to]&&N[from].c!==N[to].c&&!e.berth)f.push("border");
  return f;
}
function teaserName(id){return N[id]?N[id].n:id}
// One option, in the planner's own terms. Stop names are included as route names, as the planner holds them.
function teaserOption(o){
  var lines=["Route: "+o.label.toLowerCase()+" ("+Math.round(o.h)+" hours"+(o.nights?", "+o.nights+(o.nights===1?" night":" nights")+" on the way":"")+")"];
  o.steps.forEach(function(s,i){
    // The mode comes from the option itself. Edge indices can go stale when regions load, so the edge is only used if it still matches.
    var mode=(o.modes||[])[i],e=E[s.j];
    if(!e||e.m!==mode)e=null;
    var from=teaserName(o.names[i]),to=teaserName(o.names[i+1]);
    var word=e?teaserModeWord(e):({hsr:"fast train",rail:"train",bus:"bus",coach:"coach",ferry:"ferry",air:"flight",shared:"shared minibus",tube:"metro"})[mode]||"transport";
    var freq=e?teaserFrequency(e):(mode==="ferry"?"a scheduled sailing":"regular service");
    var feats=e?teaserFeatures(e,e.a,e.b):(mode==="ferry"?["sea crossing"]:[]);
    lines.push("- "+word+" "+from+" to "+to+", "+freq+(feats.length?" ("+feats.join(", ")+")":""));
  });
  return lines.join("\n");
}
function buildTeaserPrompt(from,to,options){
  return "Write a route teaser for a travel game using the route options below.\n"+
   "The route is from "+from+" to "+to+".\n\n"+
   "Give players a feel for the journey options without giving away the whole itinerary. Use your knowledge of the surrounding countryside and geographical features to add descriptive flavour. Keep the response to 30 words.\n\n"+
   (options||[]).map(teaserOption).join("\n\n");
}
