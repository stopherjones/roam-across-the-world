// Guided tours: a cruise run as a campaign-style game with its own clock and cash, but no income, no achievements,
// and the same travel agent, market, timeline, rest days and cruise stops. It ends at the last stop of the cruise.
// Countries visited on a tour are kept under their own key and shown on the countries page.
var TOUR_KEY="ratw-tour-v1";
var TOUR_MONEY=300;       // spending money at the start: for the market, built up with the timeline
var TOUR_PICK=false;      // the list of tours is open
var TOUR_COUNTRIES=[];    // countries ticked by tours
function tourLoad(){try{var r=localStorage.getItem(TOUR_KEY);if(r){var o=JSON.parse(r);TOUR_COUNTRIES=o.countries||[]}}catch(e){}}
function tourSave(){try{localStorage.setItem(TOUR_KEY,JSON.stringify({countries:TOUR_COUNTRIES}))}catch(e){}}
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
// Cruise lanes that can be followed: every stop is on the map
function tourLanes(){
 return BERTH_LANES.filter(function(l){return l.kind==="cruise"&&N[l.from]&&N[l.to]&&l.via.every(function(c){return N[c]})});
}
// The lane a tour sails. A round trip follows the return schedule's stops when there is one, and otherwise comes straight back.
// It is one-way from the start to the end, so the cruise ends at the last stop.
function tourLane(l,rt){
 var base={id:"tour-"+l.id,kind:"cruise",window:96,fare:0,hours:l.hours};
 if(!rt)return Object.assign(base,{from:l.from,to:l.to,via:l.via.slice(),legH:l.legH.slice(),oneWay:true});
 var back=BERTH_LANES.filter(function(x){return x.kind==="cruise"&&x.from===l.to&&x.to===l.from})[0];
 if(back&&back.via.every(function(c){return N[c]})){
  return Object.assign(base,{from:l.from,to:l.from,via:l.via.concat([l.to],back.via),legH:l.legH.concat(back.legH),hours:l.hours+back.hours,oneWay:true});
 }
 var total=l.legH.reduce(function(a,b){return a+b},0);
 return Object.assign(base,{from:l.from,to:l.from,via:l.via.concat([l.to]),legH:l.legH.concat([total]),hours:l.hours*2,oneWay:true});
}
function tourStart(id,rt){
 tourReady().then(function(){
  var l=BERTH_LANES.filter(function(x){return x.id===id})[0];
  if(!l||!N[l.from]||!N[l.to])return render("That tour is not available.");
  var lane=tourLane(l,rt),stops=[lane.from].concat(lane.via,[lane.to]);
  var camp={ach:{},countries:[],continents:[],waited:0,visited:[],heard:{},income:0,money:TOUR_MONEY,legs:1,start:0,log:[],dirs:[],paid:[],pack:[],seed:(Math.random()*1e9)|0,sales:{},seen:{},nextUid:0,
   tour:{lane:id,rt:!!rt,stops:stops},tourLane:lane,
   cruise:{back:lane.from,at:lane.from,queue:lane.via.concat([lane.to]).map(function(st,j){return{to:st,h:lane.legH[j]}}),kind:"cruise"}};
  S={legHazards:0,legNotes:[],start:lane.from,goal:lane.to,air:false,ev:true,camp:camp,setup:{air:false,evn:true,lm:{on:false,clue:"off",level:"mixed",plan:false}},
   lmOn:false,planOn:false,lmClue:"off",lmLevel:"mixed",rooms:[],wait:0,tired:false,pend:null,pendOpt:null,loc:lane.from,h:0,spent:0,
   path:[lane.from],times:[0],modes:[],nights:[],rev:{},log:["Your tour begins in "+N[lane.from].n+". Book the cruise at the travel agent."],
   phase:"rest",draft:[],over:null,term:null,arr:0,arrH:0,budget:TOUR_MONEY,cash:TOUR_MONEY,opt:null,opts:[],target:0,stranded:0};
  S.term=grp("ferry");   // a cruise stop is in ferry mode, as takeBerth sets it, so the cruise option keeps its place in the list
  tourVisit(lane.from);
  activePanel="play";TOUR_PICK=false;tourSave();save();render();
 });
}
function tourEnd(){S=null;TOUR_PICK=false;save();render()}
// Where the rest page leaves a tour: book the cruise first, then end at the last stop
function restLeaveHtml(arr){
 if(S&&S.camp&&S.camp.tour)return "<button class='btn' onclick='tourEnd()'>End the tour</button>";
 return "<button class='btn' onclick='restLeave()'>Leave for the next leg (8am, day "+(arr+2)+")</button>";
}
// A tour stop ticks its country on the countries page (the UN list and Taiwan, not territories)
function tourVisit(id){
 var cc=PLACE_COUNTRY[id];
 if(cc&&COUNTRY_LIST.indexOf(cc)>=0&&TOUR_COUNTRIES.indexOf(cc)<0){TOUR_COUNTRIES.push(cc);tourSave()}
}
function tourPickToggle(){
 if(TOUR_PICK){TOUR_PICK=false;return render()}
 tourReady().then(function(){TOUR_PICK=true;render()});
}
// Country names for a tour, without the countries it starts and ends in
function tourCountry(id){return PLACE_COUNTRY[id]||N[id].n}
function tourListText(a){return a.length<2?a.join(""):a.slice(0,-1).join(", ")+" and "+a[a.length-1]}
// A small route map drawn from the stop coordinates. Routes over the date line are kept continuous.
// The land outline is defined once in the page and reused by every route map
function ensureLandDefs(){
 if(document.getElementById('rm-land-defs'))return;
 var s=document.createElementNS('http://www.w3.org/2000/svg','svg');
 s.setAttribute('id','rm-land-defs');s.setAttribute('width','0');s.setAttribute('height','0');s.setAttribute('aria-hidden','true');s.style.position='absolute';
 s.innerHTML="<defs><path id='rm-land' d='"+LAND_PATH+"'/></defs>";
 document.body.appendChild(s);
}
function tourRouteSvg(ids,label){
 var pts=ids.map(function(id){return{la:N[id].la,lo:N[id].lo}});
 var lo0=Math.min.apply(null,pts.map(function(p){return p.lo})),lo1=Math.max.apply(null,pts.map(function(p){return p.lo}));
 if(lo1-lo0>180){pts.forEach(function(p){if(p.lo<0)p.lo+=360});lo0=Math.min.apply(null,pts.map(function(p){return p.lo}));lo1=Math.max.apply(null,pts.map(function(p){return p.lo}))}
 var la0=Math.min.apply(null,pts.map(function(p){return p.la})),la1=Math.max.apply(null,pts.map(function(p){return p.la}));
 var W=240,H=140,P=18,rx=Math.max(lo1-lo0,2),ry=Math.max(la1-la0,2);
 var sc=Math.min((W-2*P)/rx,(H-2*P)/ry),ox=(W-rx*sc)/2,oy=(H-ry*sc)/2;
 function X(p){return ox+(p.lo-lo0)*sc}
 function Y(p){return oy+(la1-p.la)*sc}
 var line=pts.map(function(p){return X(p).toFixed(1)+","+Y(p).toFixed(1)}).join(" ");
 var dots=pts.map(function(p,i){var end=i===0||i===pts.length-1;return"<circle cx='"+X(p).toFixed(1)+"' cy='"+Y(p).toFixed(1)+"' r='"+(end?4.5:3)+"' class='rm-stop"+(end?" rm-end":"")+"'/>"}).join("");
 // Land copies one world either side, so routes over the date line still show their coast
 ensureLandDefs();
 var land=[-360,0,360].map(function(k){return"<use href='#rm-land' class='rm-land' transform='translate("+(ox-lo0*sc+k*sc).toFixed(1)+" "+(oy+la1*sc).toFixed(1)+") scale("+sc.toFixed(4)+" -"+sc.toFixed(4)+")'/>"}).join("");
 return"<svg class='route-map' viewBox='0 0 "+W+" "+H+"' role='img' aria-label='Route map: "+esc(label)+"'>"+land+"<polyline points='"+line+"' fill='none' class='rm-line'/>"+dots+"</svg>";
}
function tourPickHtml(){
 var rows=tourLanes().map(function(l){
  var lane=tourLane(l,false),ids=[lane.from].concat(lane.via,[lane.to]);
  var from=tourCountry(l.from),to=tourCountry(l.to);
  var mid=[];lane.via.map(tourCountry).forEach(function(c){if(c!==from&&c!==to&&mid.indexOf(c)<0)mid.push(c)});
  var stops=mid.length?"Calls at "+esc(tourListText(mid))+".":"Direct.";
  return "<div class='panel'><h3>"+esc(from)+" to "+esc(to)+"</h3>"+tourRouteSvg(ids,from+" to "+to)+"<p class='mute mb8'>"+stops+"</p>"+
   "<div class='row'><button class='btn' onclick='tourStart(\""+l.id+"\",false)'>One way</button>"+
   "<button class='btn alt' onclick='tourStart(\""+l.id+"\",true)'>Round trip</button></div></div>";
 }).join("");
 return "<div class='panel'><h2>Guided tours</h2><p class='mute mb10'>Pick from our luxury tours and cruise itineraries below and simply follow along from stop by stop. You get £"+TOUR_MONEY+" spending money for the local markets, so just relax and enjoy the ride.</p><button class='link' onclick='tourPickToggle()'>Back</button></div>"+rows;
}
function tourHtml(){return TOUR_PICK?tourPickHtml():""}
tourLoad();
