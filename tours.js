// Guided tours: a cruise schedule followed stop to stop, from the welcome screen.
// Standalone: no budget, timers, checkpoints, rest-day clock or campaign achievements. It does not touch the campaign (S).
// Countries visited on a tour are kept here, under their own key, and shown on the countries page alongside campaign ticks.
var TOUR_KEY="ratw-tour-v1";
var TOUR=null;            // { lane, stops:[place ids], i, rt } while a tour is running
var TOUR_PICK=false;      // the list of tours is open
var TOUR_COUNTRIES=[];    // countries ticked by tours
function tourLoad(){try{var r=localStorage.getItem(TOUR_KEY);if(r){var o=JSON.parse(r);TOUR_COUNTRIES=o.countries||[];TOUR=o.tour||null}}catch(e){}}
function tourSave(){try{localStorage.setItem(TOUR_KEY,JSON.stringify({countries:TOUR_COUNTRIES,tour:TOUR}))}catch(e){}}
// Tours that can be followed: cruise lanes whose every stop is on the map
// Regions holding any cruise stop. The world only has loaded regions, so these are loaded before a tour is listed or started.
function tourRegions(){
 var out={};
 BERTH_LANES.forEach(function(l){if(l.kind!=="cruise")return;[l.from,l.to].concat(l.via).forEach(function(id){var r=regionOf(id);if(r)out[r]=1})});
 return Object.keys(out);
}
function tourReady(){
 var need=tourRegions().filter(function(r){return!LOADED_REGIONS[r]});
 if(!need.length)return Promise.resolve();
 busyStart("Loading the cruise routes\u2026");
 return Promise.all(need.map(loadRegion)).then(function(){rebuildWorld()},function(){}).then(function(){busyEnd()});
}
function tourLanes(){
 return BERTH_LANES.filter(function(l){return l.kind==="cruise"&&N[l.from]&&N[l.to]&&l.via.every(function(c){return N[c]})});
}
// Stops for a tour. A round trip uses the return lane's stops when there is one, otherwise it comes straight back.
function tourStops(l,rt){
 var out=[l.from].concat(l.via,[l.to]);
 if(!rt)return out;
 var back=BERTH_LANES.filter(function(x){return x.kind==="cruise"&&x.from===l.to&&x.to===l.from})[0];
 return back&&back.via.every(function(c){return N[c]})?out.concat(back.via,[back.to]):out.concat([l.from]);
}
function tourStart(id,rt){
 tourReady().then(function(){
  var l=BERTH_LANES.filter(function(x){return x.id===id})[0];if(!l||!N[l.from]||!N[l.to])return render("That tour is not available.");
  TOUR={lane:id,stops:tourStops(l,rt),i:0,rt:!!rt};
  tourVisit(TOUR.stops[0]);
  TOUR_PICK=false;tourSave();render();
 });
}
function tourContinue(){if(!TOUR||TOUR.i>=TOUR.stops.length-1)return;TOUR.i++;tourVisit(TOUR.stops[TOUR.i]);tourSave();render()}
function tourFinish(){TOUR=null;tourSave();render()}
function tourLeave(){TOUR=null;tourSave();render()}
function tourPickToggle(){
 if(TOUR_PICK){TOUR_PICK=false;return render()}
 tourReady().then(function(){TOUR_PICK=true;render()});
}
// A tour stop is a cruise stop, so it ticks its country (UN list and Taiwan, not territories)
function tourVisit(id){
 var cc=PLACE_COUNTRY[id];
 if(cc&&COUNTRY_LIST.indexOf(cc)>=0&&TOUR_COUNTRIES.indexOf(cc)<0)TOUR_COUNTRIES.push(cc);
}
function tourPickHtml(){
 var rows=tourLanes().map(function(l){
  var name=esc(N[l.from].n)+" to "+esc(N[l.to].n);
  var stops=l.via.length?"Calls at "+l.via.map(function(c){return esc(N[c].n)}).join(", ")+".":"Direct.";
  return "<div class='panel'><h3>"+name+"</h3><p class='mute mb8'>"+stops+"</p>"+
   "<div class='row'><button class='btn' onclick='tourStart(\""+l.id+"\",false)'>One way</button>"+
   "<button class='btn alt' onclick='tourStart(\""+l.id+"\",true)'>Round trip</button></div></div>";
 }).join("");
 return "<div class='panel'><h2>Guided tours</h2><p class='mute mb10'>Follow a cruise from stop to stop. No budget, no clock, no checkpoints. Countries you stop in are ticked off.</p><button class='link' onclick='tourPickToggle()'>Back</button></div>"+rows;
}
function tourHtml(){
 if(TOUR_PICK&&!TOUR)return tourPickHtml();
 if(!TOUR)return "";
 var last=TOUR.i>=TOUR.stops.length-1;
 var here=N[TOUR.stops[TOUR.i]].n;
 var h="<div class='panel'><p class='kicker'>Guided tour · stop "+(TOUR.i+1)+" of "+TOUR.stops.length+(TOUR.rt?" · round trip":" · one way")+"</p>";
 if(last){
  h+="<h2>Welcome to "+esc(here)+"</h2><p class='mute mb10'>The voyage ends here. Thank you for sailing.</p>"+
   "<button class='btn' onclick='tourFinish()'>Finish tour</button>";
 }else{
  var next=N[TOUR.stops[TOUR.i+1]].n;
  h+="<h2>Welcome to "+esc(here)+"</h2><p class='mute mb10'>The ship is in port for the day. Go ashore and look around before the voyage carries on to "+esc(next)+".</p>"+
   "<button class='btn' onclick='tourContinue()'>Continue to "+esc(next)+"</button>";
 }
 h+="<p><button class='link' onclick='tourLeave()'>Leave the tour</button></p></div>";
 return h;
}
tourLoad();
