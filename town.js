// Town: the market, rest days, stranded legs, things to do, and the wait before a service.
// Loaded after game.js. Everything here is a global function, which game.js calls when it needs it.

// ============ REST DAY ============
// After a leg, the rest day is a free day in the arrival town: trade at the stall, find buyers, then leave at 8am on day x+2.
// Stock, prices and buyers come from the Groq proxy, and are scored on one universal 1 to 10 scale (see the market prototype).
var MK_KINDS=["luxury","useful","cultural","food"];

var MK_BAND_NEUTRAL={character:"No clear character, so buyers want things in the usual way.",weights:{luxury:3,useful:3,cultural:3,food:3}};

var MK_CAP=6;

// Stranded: no onward fare is affordable and no checkpoint work is open. The leg ends here as a rest day, and the next income is smaller
var STRANDED_INCOME=50;

function mkRand(){var parts=Array.prototype.slice.call(arguments),a=mkHash(parts.join("|"));a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}

function mkRoll(lo,hi){var parts=Array.prototype.slice.call(arguments,2);return lo+(hi-lo)*mkRand.apply(null,parts)}

function mkMoney(v){return Math.round(15*Math.pow(1.5,Math.min(10,Math.max(1,v))-1))}

function mkBuy(v,supply){return mkMoney(v)*(0.6+0.08*(11-supply))}

function mkSell(v,demand){return mkMoney(v)*(0.6+0.08*demand)}

function mkClamp(v,d){var n=Math.round(Number(v));if(!isFinite(n))n=d;return Math.min(10,Math.max(1,n))}

function mkJson(text){var t=String(text||"").trim().replace(/^```(?:json)?\s*/i,"").replace(/\s*```$/,"");try{return JSON.parse(t)}catch(e){var a=t.indexOf("{"),b=t.lastIndexOf("}");if(a>=0&&b>a){try{return JSON.parse(t.slice(a,b+1))}catch(e2){}}throw new Error("unexpected format")}}


function mkPips(n){var h="<span class='pips'>";for(var i=1;i<=10;i++)h+="<i"+(i<=n?" class='on'":"")+"></i>";return h+"</span>"}

function mkGbp(n){return "\u00a3"+Math.round(n).toLocaleString("en-GB")}

// The town you are in: the market, prices and the rest day all belong to where you are standing
function mkCity(){return N[S.loc]?N[S.loc].n:""}

function mkDayNo(){return arrDay()+1}

function mkMarket(){
 var c=S.camp,mkKey=mkCity()+"|"+mkDayNo()+"|v2";if(!c.market||c.market.key!==mkKey)c.market={key:mkKey,stall:null,profile:null};
 return c.market
}

// Each stall item gets an ID unique to its town and day, so two towns' items are never mistaken for the same item
function mkItemId(i){return 'd'+mkDayNo()+'-'+mkCity().replace(/[^A-Za-z]/g,'')+'-'+i}
function mkSeed(){return(S.camp&&S.camp.seed)||1}

// One request for everything the market needs: the town's profile, its stock and a buyer for each unsold item

function passingDealer(){return{name:'Local dealer',demand:4}}



// Value and supply come from the catalogue's rarity and tier, so the cards keep their numbers.
function mkCatValue(it){return mkClamp((it.tier==="luxury"?7:4)+(it.rarity==="scarce"?1:0),5)}
function mkCatSupply(it){return mkClamp({common:7,uncommon:5,scarce:3}[it.rarity]||5,5)}
// From the catalogue: a pool of 5 to 10 items, of which 3 to 5 are on sale. Same town and day give the same stall.
function mkFromCatalogue(entry,needStall,todo){
 var m=mkMarket();
 if(needStall){
  var w=entry.profile&&entry.profile.weights||{},weights={};
  MK_KINDS.forEach(function(k){weights[k]=Math.min(5,Math.max(1,Math.round(Number(w[k])||3)))});
  m.profile={character:"",weights:weights};
  var pool=(entry.items||[]).slice();
  var n=3+Math.floor(mkRoll(0,3,mkSeed(),mkCity(),mkDayNo(),"count"));
  var picked=[];
  for(var k=0;k<n&&pool.length;k++){
   var idx=Math.min(pool.length-1,Math.floor(mkRoll(0,pool.length,mkSeed(),mkCity(),mkDayNo(),"pick",k)));
   picked.push(pool.splice(idx,1)[0]);
  }
  m.stall=picked.map(function(it,i){
   var id=mkItemId(i);
   var item={name:String(it.name||"Unnamed").slice(0,60),origin:String(it.what_and_why||"").slice(0,320),
     value:mkCatValue(it),supply:mkCatSupply(it),kind:MK_KINDS.indexOf(it.kind)>=0?it.kind:"useful",id:id,search:String(it.search||it.name||"")};
   item.ask=Math.round(mkBuy(item.value,item.supply)*mkRoll(0.95,1.05,mkSeed(),mkCity(),mkDayNo(),id,"ask"));
   return item;
  });
 }
 todo.forEach(function(x){if(!x.buyer)x.buyer=passingDealer()});
}

function mkFallback(needStall,todo){
 var m=mkMarket();
 if(needStall){m.profile=MK_BAND_NEUTRAL;m.stall=mkDemoStock().map(function(x,i){var id=mkItemId(i);return Object.assign({},x,{id:id,ask:Math.round(mkBuy(x.value,x.supply)*mkRoll(0.95,1.05,mkSeed(),mkCity(),mkDayNo(),id,'ask'))})})}
 todo.forEach(function(x){if(!x.buyer)x.buyer=passingDealer()});
}

function restVisit(){
 visitPlace(S.loc,"merchant");
 var m=mkMarket();S.camp.marketOpen=true;
 var needStall=!m.stall,todo=S.camp.pack.filter(function(x){return!x.buyer});
 if(m.finding||(!needStall&&!todo.length)){render();return}
 m.finding=true;render();
 MARKET_READY.then(function(cat){
  var entry=cat&&cat[S.loc];
  if(entry&&entry.items&&entry.items.length)mkFromCatalogue(entry,needStall,todo);
  else mkFallback(needStall,todo);
  m.finding=false;render();
 });
}

function mkDemoStock(){return[
 {name:"Hand-thrown clay vessel",origin:"Clay from the nearby hills, a long tradition",value:3,supply:9,kind:"useful"},
 {name:"Aged local olive oil",origin:"Pressed from groves outside the old walls",value:5,supply:6,kind:"food"},
 {name:"Hand-woven textile",origin:"A pattern unique to this town's looms",value:8,supply:2,kind:"cultural"}]}

function restBuyAt(i){
 var m=mkMarket(),x=m.stall&&m.stall[i];
 if(!x||S.cash<x.ask||S.camp.pack.length>=MK_CAP)return;
 S.cash-=x.ask;
 S.camp.pack.push(Object.assign({},x,{uid:S.camp.nextUid=(S.camp.nextUid||0)+1,boughtIn:mkCity(),buyer:null}));
 say("Bought "+x.name+" in "+mkCity()+" for "+mkGbp(x.ask)+".");render();
}

// The offer: the town's view of the item, moved by what the town wants from its profile, with a fixed-width roll
// Words for the demand the offer uses, so the text matches the numbers beside it.
function demandLine(d){
 if(d<=2)return"Few buyers here want this, so the offer is low.";
 if(d<=4)return"Some interest here, though not much.";
 if(d<=6)return"Reasonable interest among local buyers.";
 if(d<=8)return"Strong demand here, so the offer is good.";
 return"Sought after here, with buyers ready to pay well.";
}
function restEffDemand(x){var m=mkMarket(),b=x.buyer||{demand:4},w=((m.profile||MK_BAND_NEUTRAL).weights||{})[x.kind]||3;return Math.min(10,Math.max(1,b.demand+Math.round(w-3)))}

function restOffer(x){
 var base=mkSell(x.value,restEffDemand(x)),width=0.18,
  r=mkRoll(-1,1,mkSeed(),mkCity(),mkDayNo(),x.id||x.uid,"offer"),key=mkCity()+"|"+x.name,
  repeat=Math.max(0.5,1-0.15*((S.camp.sales||{})[key]||0));
 return Math.max(5,Math.round(base*(1+width*r)*repeat))
}

function restSell(uid){
 var i=S.camp.pack.findIndex(function(p){return p.uid===uid});if(i<0)return;
 var x=S.camp.pack[i],price=restOffer(x);
 S.camp.pack.splice(i,1);S.cash+=price;
 if(price>=2*x.ask)unlockAch("profiteer");S.camp.sales=S.camp.sales||{};var key=mkCity()+"|"+x.name;S.camp.sales[key]=(S.camp.sales[key]||0)+1;
 say("Sold "+x.name+" in "+mkCity()+" for "+mkGbp(price)+" (paid "+mkGbp(x.ask)+").");render();
}

function restLeave(){REST_MAP=false;if(S.camp){S.camp.agentOpen=false;S.camp.berthNote=null;S.camp.cruise=null}nextLeg()}
// Continue a cruise back to where it started: a rest day there, no checkpoint
function cruiseContinue(){
 var i=opts().findIndex(function(o){return o.cruiseNext});
 if(i<0)return;
 takeBerth(i);
}
// Greeting at a cruise stop: the ship is in port until the next leg of the cruise
function cruiseWelcomeHtml(tl){
 var c=S.camp.cruise,city=esc(N[S.loc].n),next=c.queue.length?esc(berthName(c.queue[0].to)):"";
 return "<div class='panel'><h2>Welcome to "+city+"</h2><p class='mute mb6'>The ship is in port for the day. Go ashore, find a cafe on the quay and take a look around before the voyage carries on to "+next+".</p>"+tl+"</div>";
}
// A short arrival note for the rest page after a crossing
function berthNoteHtml(){
 if(!S.camp.berthNote)return"";
 return "<div class='panel'><p>"+esc(S.camp.berthNote)+"</p></div>";
}

function restStart(){
 S.phase="rest";S.camp.market=null;S.camp.marketOpen=false;visitPlace(S.loc,"rest");say("Rest day in "+mkCity()+".");render();
}

function strandLeg(){
 S.stranded=1;S.arrH=S.h;S.phase="rest";visitPlace(S.loc,"rest");S.camp.market=null;S.camp.marketOpen=false;
 say(clk(S.h)+": Stranded in "+N[S.loc].n+". No onward fare is affordable.");
}

function markSeen(k){if(!S||!S.camp)return;S.camp.seen=S.camp.seen||{};S.camp.seen[k+":"+S.loc]=1}
function doneHere(k){return!!(S&&S.camp&&S.camp.seen&&S.camp.seen[k+":"+S.loc])}
function restCloseMarket(){markSeen("m");S.camp.marketOpen=false;render()}

// Names and regions come from the whole gazetteer, so a sailing shows even when its far end is not loaded yet
function berthName(id){var g=placeOf(id);return g?g.n:id}
function berthRegions(l){return [l.from,l.to].concat(l.via).map(regionOf).filter(function(r,i,a){return r&&a.indexOf(r)===i})}

// Travel agent: a button opens it. Opening it is how you hear about sailings from the ports near here.
function agentOpen(){
 var now=absH(S.h),heard=S.camp.heard=S.camp.heard||{},near=berthHops(E,S.loc,BERTH_AGENT_HOPS);
 BERTH_LANES.forEach(function(l){if(near[l.from]!=null&&heard[l.id]==null)heard[l.id]=now});
 S.camp.agentOpen=true;
 var need=[];BERTH_LANES.forEach(function(l){if(heard[l.id]!=null)berthRegions(l).forEach(function(r){if(!LOADED_REGIONS[r]&&need.indexOf(r)<0)need.push(r)})});
 if(!need.length){render();return}
 Promise.all(need.map(loadRegion)).then(function(){rebuildWorld();render()},function(){render()});
}
function agentClose(){S.camp.agentOpen=false;render()}
function agentHtml(){
 if(!berthAgentIn(E,S.loc))return"";
 if(!S.camp.agentOpen)return "<div class='panel'><h2>Travel agent</h2><p class='mute mb6'>Ask about sailings from the ports near here.</p><button class='btn' onclick='agentOpen()'>Visit the travel agent</button></div>";
 var now=absH(S.h),heard=S.camp.heard||{},near=berthHops(E,S.loc,BERTH_AGENT_HOPS);
 var rows=[];BERTH_PORTS.forEach(function(p){if(near[p]!=null)berthListing(p,heard,now).forEach(function(s){rows.push(s)})});
 var h="<div class='panel'><div class='row' style='justify-content:space-between;align-items:center'><h2>Travel agent</h2><button class='tl-close alt' onclick='agentClose()'>Close</button></div>";
 if(!rows.length)return h+"<p class='mute'>Nothing you know about is still sailing from the ports near here.</p></div>";
 h+=rows.map(function(s){
  var l=s.lane,via=l.via.length?" Calls at "+l.via.map(function(c){return esc(berthName(c))}).join(", ")+".":"";
  var rest=l.rest?" Rest day on board.":"";
  var here=S.loc===l.from;
  return "<div class='opt agent-card'><span class='cruise-tag'>"+esc(l.kind)+"</span><h3 class='agent-route'>"+esc(berthName(l.from))+" to "+esc(berthName(l.to))+"</h3>"+
   "<p class='mute mb6'>Leaves in "+Math.max(0,Math.round(s.dep-now))+" h. Crossing "+l.hours+" h. Fare £"+l.fare+"."+via+rest+"</p>"+
   "<div class='agent-foot'>"+(here?(function(){var c=berthCheck(s,now,S.cash);return c.ok?"<button class='btn' onclick='boardBerth(\""+l.id+"\")'>Board for £"+l.fare+"</button>":"<p class='no'>"+esc(c.reason)+"</p>"})():
   "<p class='mute'>Get to "+esc(berthName(l.from))+" before it leaves.</p>")+"</div></div>";
 }).join("");
 return h+"</div>";
}

// Board a sailing at the port: wait for departure if early, pay the fare, arrive after the crossing
function boardBerth(id){
 var heard=S.camp.heard||{},s=null;
 berthListing(S.loc,heard,absH(S.h)).forEach(function(x){if(x.lane.id===id)s=x});
 if(!s){say("That sailing is no longer listed.");render();return}
 function sail(){
  var now=absH(S.h),chk=berthCheck(s,now,S.cash);
  if(!chk.ok){say(chk.reason);render();return}
  var i=opts().findIndex(function(o){return o.berth===id&&o.fix!=null});
  if(i<0){say("That sailing is no longer listed.");render();return}
  S.camp.agentOpen=false;
  takeBerth(i);
 }
 var need=berthRegions(s.lane).filter(function(r){return!LOADED_REGIONS[r]});
 if(!need.length)return sail();
 Promise.all(need.map(loadRegion)).then(function(){rebuildWorld();sail()},function(){say("Could not load the map for that crossing.");render()});
}

function restPage(){
 berthHearHere();
 var arr=arrDay(),city=mkCity();
 var tl="<div class='tl'><div><b>Arrived</b>day "+arr+"</div><div class='now'><b>Rest day</b>day "+(arr+1)+"</div><div><b>Leave 8am</b>day "+(arr+2)+"</div></div>";
 var h=S.camp.cruise?cruiseWelcomeHtml(tl):S.stranded?"<div class='panel'><h2>Stranded in "+esc(city)+"</h2><p class='mute mb6'>No onward fare is affordable. Sell what you carry at the market, then leave at 8am. You receive \u00a3"+STRANDED_INCOME+" when you set off, which covers most onward fares, but flights and fast trains will be out of reach for a while.</p>"+tl+"</div>":"<div class='panel'><h2>Rest day in "+esc(city)+"</h2><p class='mute mb6'>A free day. Visit the market to trade, earn income by correctly placing events on the City Timeline, or just use the buttons below to learn more about the town. Your next leg starts at 8am tomorrow.</p>"+tl+"</div>";
 h=h+(S.camp&&S.camp.tour?"":agentHtml());
 h+=earnHtml();
 h+=thingsHtml();
 h+="<div class='panel'>"+(S.camp.cruise?"<button class='btn' onclick='cruiseContinue()'>"+(S.camp.cruise.kind==="cargo"?"Continue to ":"Continue the cruise to ")+esc(berthName(S.camp.cruise.queue[0].to))+"</button>":restLeaveHtml(arr))+"<p class='mute mt8'>Items you're carrying come with you. Buyers are found afresh in each town.</p></div>";
 return h
}

// Market view: goods to sell first, then the stock to buy
function marketHtml(){
 var m=mkMarket(),busy=!!m.finding,unsold=S.camp.pack.some(function(x){return!x.buyer});
 var h="<div class='panel'><div class='row' style='justify-content:space-between;align-items:center'><h2>Goods for trade ("+S.camp.pack.length+"/"+MK_CAP+")</h2><button class='tl-close alt' onclick='restCloseMarket()'>Close</button></div>";
 if(!S.camp.pack.length)h+="<p class='mute mb8'>Nothing to sell yet. Buy local goods below.</p>";
 else h+=packSellHtml();
 if(unsold&&!busy)h+="<div class='row mt10'><button class='btn alt' onclick='restVisit()'>Find buyers for my pack</button></div>";
 h+="</div><div class='panel'><h2>Buy local goods</h2>";
 if(!m.stall)h+="<p class='mute'>"+(busy?"<span class='spin inline'></span>Asking around the market\u2026":"The market is closed today.")+"</p>";
 else{
  var full=S.camp.pack.length>=MK_CAP;

  h+="<div class='mgrid'>"+m.stall.map(function(x,i){
   var owned=S.camp.pack.some(function(p){return p.id===x.id}),can=!owned&&!full&&S.cash>=x.ask;
   return"<div class='mcard'><b><a class='mlink' href='https://www.google.com/search?q="+encodeURIComponent(x.search||x.name)+"' target='_blank' rel='noopener' style='color:inherit;text-decoration:none;border-bottom:1px dotted #5bc4ad'>"+esc(x.name)+"</a></b><div class='mute fine'><em>"+esc(x.origin)+"</em></div>"+
    "<div class='mstats'>Value <b>"+x.value+"</b> "+mkPips(x.value)+" &nbsp; Supply <b>"+x.supply+"</b> "+mkPips(x.supply)+"</div>"+
    "<div class='mrow'><b class='price'>"+mkGbp(x.ask)+"</b><button class='btn' "+(can?"":"disabled")+" onclick='restBuyAt("+i+")'>"+(owned?"In pack":full?"Pack full":S.cash<x.ask?"Too dear":"Buy")+"</button></div></div>"
  }).join("")+"</div>";
 }
 h+="</div>";
 return h
}

// Goods in the pack, each with its buyer and offer
function packSellHtml(){
 return "<div class='mgrid sell'>"+S.camp.pack.map(function(x){
  var o=restOffer(x),d=o-x.ask,dm=restEffDemand(x);
  var buyer=x.buyer?"<div class='buyer'>"+esc(demandLine(dm))+"<div class='mt4'>Demand here <b>"+dm+"</b> "+mkPips(dm)+"</div></div>":"<div class='mute fine'>No buyer found yet.</div>";
  return"<div class='mcard'><b>"+esc(x.name)+"</b><div class='mute fine'>Paid "+mkGbp(x.ask)+"</div>"+buyer+
   "<div class='mrow mt6'><b>Offer "+mkGbp(o)+"</b><span class='delta "+(d>=0?"up":"down")+"'>"+(d>=0?"+":"\u2212")+mkGbp(Math.abs(d))+"</span></div>"+
   "<button class='btn mt6 wfull' "+(x.buyer?"":"disabled")+" onclick='restSell("+x.uid+")'>Sell</button></div>"
 }).join("")+"</div>";
}

// Ways to make money on a rest day or while waiting: the market and the City Timeline, grouped
function earnHtml(){
 var market=S.camp.marketOpen?marketHtml():"<p class='mute mb10'>Sell what you carry and buy local goods to take on the next leg.</p><button class='btn"+(doneHere("m")?" done":"")+"' onclick='restVisit()'>Visit the market</button>";
 var tl=S.timelineOpen?"<div id='tl-inline'></div>":"<p class='mute mb10'>Ten events about this town. Place each one on the timeline to earn income for this town. It costs no time.</p><button class='btn"+(doneHere("t")?" done":"")+"' onclick='openTimeline()'>City Timeline</button>";
 return "<div class='panel earn'><h2>Ways to make money</h2>"+market+"<div class='earn-sep'></div>"+tl+"</div>";
}

// Things to do on a rest day: search links for the town
// Things to do, shown as a grid of tiles (three across). Each tile is an emoji and a short title.
// To add a theme (e.g. UNESCO), add an entry to the tiles list below. Empty themes are simply left out.
// The settings page still switches the three core themes on or off by their full title (thingOn).
// URL slug for a town name, as TasteAtlas uses in its city addresses:
// "Hamilton, Bermuda" -> "hamilton", "Mayotte (Dzaoudzi)" -> "mayotte", "São Paulo" -> "sao-paulo".
// Towns with no TasteAtlas page land on TasteAtlas's own "page not found" page, which links to the map.
// A hand-set address for a town, from data/tasteatlas-overrides.js, wins over the generated slug.
// The override is the part of the address after tasteatlas.com/, e.g. "bloemfontein-south-africa".
function tileSlug(id){
 return (typeof TASTE_OVERRIDES!=="undefined"&&TASTE_OVERRIDES[id])||null;
}
// Overrides: a string replaces the generated address; false hides the tile for that town.
function tasteTile(){
 return !(typeof TASTE_OVERRIDES!=="undefined"&&TASTE_OVERRIDES[S.loc]===false);
}
function atlasTile(){
 return !(typeof ATLAS_OVERRIDES!=="undefined"&&ATLAS_OVERRIDES[S.loc]===false);
}
// For Atlas Obscura the override is a search term, or a full address starting with https://.
function atlasHref(){
 var o=typeof ATLAS_OVERRIDES!=="undefined"?ATLAS_OVERRIDES[S.loc]:null;
 if(typeof o==="string"&&o.indexOf("https://")===0)return o;
 var term=typeof o==="string"&&o?o:N[S.loc].n;
 return "https://www.atlasobscura.com/search?q="+encodeURIComponent(term).replace(/%20/g,"+");
}
function tasteSlug(id){
 return tileSlug(id)||slugOf(N[id].n);
}
function slugOf(name){
 return name.split(",")[0].split(" (")[0].normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/&/g," and ").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");
}
function tileCss(){
 if(document.getElementById("tile-css"))return;
 var st=document.createElement("style");st.id="tile-css";
 st.textContent=".tiles{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:8px}"+
  ".tiles .tile{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;min-height:92px;padding:10px 6px;text-align:center;text-decoration:none;font-size:.9rem;line-height:1.2;box-sizing:border-box;border:0;cursor:pointer}"+
  ".tile .em{font-size:1.8rem;line-height:1}"+
  ".tile .ext{position:absolute;top:6px;right:6px;width:13px;height:13px;opacity:.85}";
 document.head.appendChild(st);
}
// Icon shown in the corner of tiles that open another website.
var EXT_ICON="<svg class='ext' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round' aria-label='Opens in an external website' role='img'><path d='M14 4h6v6'/><path d='M20 4l-9 9'/><path d='M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5'/></svg>";
function tileHtml(t){
 var inner=(t.ext?EXT_ICON:"")+"<span class='em' aria-hidden='true'>"+t.emoji+"</span><span>"+esc(t.title)+"</span>";
 if(t.searchTerm!==undefined)return "<button type='button' class='btn tile' title='"+esc(t.title)+"' onclick='"+cityStayAction("searchModalOpen",[t.title,t.searchTerm])+"'>"+inner+"</button>";
 if(t.onclick)return "<button type='button' class='btn tile"+(t.cls?" "+t.cls:"")+"' title='"+esc(t.title)+"' onclick=\""+t.onclick+"\">"+inner+"</button>";
 return "<a class='btn tile' href='"+t.href+"' target='_blank' rel='noopener' title='"+esc(t.title)+"'>"+inner+"</a>";
}
// UNESCO sites by town id. Loaded once; if the file is missing or empty, no Heritage tiles appear.
var UNESCO_MAP={};
var NATURE_CACHE={};
var FOOD_SPECIALTIES=null,FOOD_SPECIALTIES_PROMISE=null;
var NATURE_RADII=[5,10,25],NATURE_LIMIT=4;
var UNESCO_READY=fetch("data/unesco.json").then(function(r){if(!r.ok)throw new Error("unesco "+r.status);return r.json()}).catch(function(){return {}}).then(function(m){
 UNESCO_MAP=m||{};
 // The Things panel may already be on screen: redraw once if this town has sites and no Heritage tile yet.
 if(S&&S.loc&&UNESCO_MAP[S.loc]&&UNESCO_MAP[S.loc].length&&document.querySelector(".tiles")&&!document.querySelector(".tile-heritage")&&!document.getElementById("paint-modal"))render();
 return UNESCO_MAP;
});
function paintCss(){
 if(!document.getElementById('paint-css')){
  var st=document.createElement('style');st.id='paint-css';
  st.textContent=".paint-back{position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:999;display:flex;align-items:center;justify-content:center;padding:12px;box-sizing:border-box}.paint-box{background:#1b2630;color:#e8eef2;border-radius:10px;max-width:520px;width:100%;max-height:90vh;overflow:auto;padding:16px;box-sizing:border-box}.paint-box img{max-width:100%;height:auto;border-radius:6px;display:block;margin:8px 0}.paint-item{border-top:1px solid #2c3a45;padding:12px 0}.paint-close{float:right;background:#7bbfae;color:#0d1419;border:0;border-radius:6px;padding:6px 12px;font-size:1em;cursor:pointer}.paint-credit{font-size:.8em;opacity:.7}.paint-icon{background:none;border:0;font-size:1.2em;cursor:pointer;padding:0 0 0 .4em;margin-left:auto}";
  st.textContent+=".paint-box a:link,.paint-box a:visited{color:#5cc2b0;text-decoration-thickness:.08em;text-underline-offset:2px}.paint-box a:hover,.paint-box a:active{color:#a5e8dc}.search-modal-term{width:100%;box-sizing:border-box;min-height:9em;margin:8px 0 12px;font:inherit;resize:vertical}.search-modal-provider{display:block;width:100%;box-sizing:border-box;margin:6px 0 12px;padding:8px;font:inherit}";
  document.head.appendChild(st);
 }
}
function unescoOpen(pid){
 openCityCollection(pid,"heritage");
}
function foodSpecialtiesLoad(){
 if(FOOD_SPECIALTIES)return Promise.resolve(FOOD_SPECIALTIES);
 if(!FOOD_SPECIALTIES_PROMISE){
  FOOD_SPECIALTIES_PROMISE=fetch("data/cuisine/food-specialties.json").then(function(r){
   if(!r.ok)throw new Error("Food specialties request failed ("+r.status+")");
   return r.json();
  }).then(function(data){
   if(!data||!Array.isArray(data.cities))throw new Error("Food specialties data has an unexpected format");
   FOOD_SPECIALTIES=data;
   return data;
  }).catch(function(error){
   FOOD_SPECIALTIES_PROMISE=null;
   throw error;
  });
 }
 return FOOD_SPECIALTIES_PROMISE;
}
function foodSpecialtiesFor(pid,data){
 var place=N[pid]||placeOf(pid),country=PLACE_COUNTRY[pid];
 if(!place||!country||!data||!Array.isArray(data.cities))return[];
 var city=String(place.n).trim().toLowerCase(),countryName=String(country).trim().toLowerCase();
 for(var i=0;i<data.cities.length;i++){
  var entry=data.cities[i];
  if(entry&&String(entry.city||"").trim().toLowerCase()===city&&String(entry.country||"").trim().toLowerCase()===countryName&&Array.isArray(entry.specialties)&&entry.specialties.length)return entry.specialties;
 }
 return[];
}
function cityStayAction(fn,args){
 return esc(fn+"("+args.map(function(value){return typeof value==="string"?JSON.stringify(value):String(value)}).join(",")+")")
}
function cityCollectionField(kind){return kind==="paintings"?"favoritePaintings":"visitedHeritage"}
function cityCollectionList(pid,kind){return kind==="paintings"?((typeof PAINTINGS!=="undefined"&&PAINTINGS[pid])||[]):((UNESCO_MAP||{})[pid]||[])}
function cityCollectionKey(item,kind){
 if(!item)return"";
 var url=String(item.url||"").trim(),name=kind==="paintings"?item.title:item.name;
 return url||String(name||"").trim().toLowerCase()
}
function cityCollectionSnapshot(item,kind){
 if(kind==="paintings"){
  if(!item||!item.title)return null;
  return{title:String(item.title),artist:String(item.artist||""),url:typeof item.url==="string"&&item.url.indexOf("https://")===0?item.url:"",image:typeof item.image==="string"&&item.image.indexOf("https://")===0?item.image:"",image_source:String(item.image_source||""),km:typeof item.km==="number"?item.km:null}
 }
 if(!item||!item.name)return null;
 var image=item.image&&typeof item.image.src==="string"&&item.image.src.indexOf("https://")===0?item.image.src:"";
 var page=item.image&&typeof item.image.page==="string"&&item.image.page.indexOf("https://")===0?item.image.page:"";
 return{name:String(item.name),year:String(item.year||""),category:String(item.category||""),url:typeof item.url==="string"&&item.url.indexOf("https://")===0?item.url:"",km:typeof item.km==="number"?item.km:null,image:{src:image,page:page}}
}
function cityCollectionResultHtml(item,kind,index,stay){
 var name=kind==="paintings"?item.title:item.name,field=cityCollectionField(kind);
 var saved=stay&&Array.isArray(stay[field])?stay[field]:[];
 var checked=saved.some(function(entry){return cityCollectionKey(entry,kind)===cityCollectionKey(item,kind)});
 var image=kind==="paintings"?item.image:(item.image&&item.image.src);
 var km=item.km!=null?(item.km<1?"under 1 km":Math.round(item.km)+" km")+" away":"";
 var details=kind==="paintings"?[item.artist,km].filter(Boolean).join(" · "):[item.year,item.category,km].filter(Boolean).join(" · ");
 var url=typeof item.url==="string"&&item.url.indexOf("https://")===0?item.url:"";
 var imageUrl=typeof image==="string"&&image.indexOf("https://")===0?image:"";
 var source=kind==="paintings"?item.image_source:(item.image&&item.image.page);
 var sourceHtml=source&&String(source).indexOf("https://")===0?"<div class='paint-credit'><a href='"+esc(source)+"' target='_blank' rel='noopener'>Image source</a></div>":(source?"<div class='paint-credit'>Image: "+esc(source)+"</div>":"");
 var checkbox=stay?"<label class='city-collection-toggle'><input type='checkbox' name='saved-collection' value='"+index+"'"+(checked?" checked":"")+"><span>"+(kind==="paintings"?"Add to favourites":"Mark as visited")+"</span></label>":"";
 var img=imageUrl?"<img src='"+esc(imageUrl)+"' alt='' loading='lazy'>":"";
 return"<div class='paint-item'>"+checkbox+"<strong>"+esc(name)+"</strong>"+(details?"<br><span class='mute'>"+esc(details)+"</span>":"")+(img?img+sourceHtml:"")+(url?"<p><a href='"+esc(url)+"' target='_blank' rel='noopener'>"+(kind==="paintings"?"View painting details":"Read on the UNESCO World Heritage site")+"</a></p>":"")+"</div>"
}
function cityCollectionModal(pid,kind,stay,message){
 var list=cityCollectionList(pid,kind),name=(typeof N!=="undefined"&&N[pid]&&N[pid].n)||pid;
 var paintings=kind==="paintings",title=paintings?"Paintings of "+name:"World Heritage near "+name;
 var status=message?"<p class='city-collection-feedback' role='status'>"+esc(message)+"</p>":"";
 var content=stay?"<p class='mute'>"+(paintings?"Select any paintings you want to save as favourites.":"Select any UNESCO sites you have visited.")+"</p><fieldset class='city-collection-list'><legend class='sr-only'>"+(paintings?"Favourite paintings":"UNESCO sites visited")+"</legend>"+list.map(function(item,index){return cityCollectionResultHtml(item,kind,index,stay)}).join("")+"</fieldset><button type='button' class='btn' onclick='"+cityStayAction("saveCityCollection",[kind,pid,stay.id])+"'>"+(paintings?"Save favourites":"Save sites visited")+"</button>"+status:
  "<p class='mute'>Start a campaign stay to save selections.</p>"+list.map(function(item,index){return cityCollectionResultHtml(item,kind,index,null)}).join("");
 paintingsClose();
 paintCss();
 var back=document.createElement("div");back.id="paint-modal";back.className="paint-back";
 back.innerHTML="<div class='paint-box'><button type='button' class='paint-close' onclick='paintingsClose()'>Close</button><h2>"+esc(title)+"</h2>"+content+"</div>";
 back.addEventListener("click",function(e){if(e.target===back)paintingsClose()});
 document.body.appendChild(back)
}
function openCityCollection(pid,kind){
 var list=cityCollectionList(pid,kind);
 if(!list.length)return;
 visitPlace(pid,"activity");
 cityCollectionModal(pid,kind,recordCityStay(pid),"")
}
function saveCityCollection(kind,pid,stayId){
 var c=campAch(),modal=document.getElementById("paint-modal"),list=cityCollectionList(pid,kind),field=cityCollectionField(kind);
 if(!c||!modal)return;
 var stay=ensureCityStays(c).filter(function(item){return item&&item.id===stayId})[0];
 if(!stay||stay.cityId!==pid)return;
 var chosen=Array.prototype.map.call(modal.querySelectorAll("input[name='saved-collection']:checked"),function(input){return Number(input.value)});
 stay[field]=chosen.map(function(index){return cityCollectionSnapshot(list[index],kind)}).filter(function(item){return!!item});
 save();
 var count=stay[field].length,message=kind==="paintings"?"Saved "+count+" "+(count===1?"painting":"paintings")+" as favourites.":"Saved "+count+" heritage "+(count===1?"site":"sites")+" as visited.";
 cityCollectionModal(pid,kind,stay,message)
}
function citySavedCollectionHtml(items,kind){
 if(!Array.isArray(items)||!items.length)return"<p class='mute'>None saved for this stay yet.</p>";
 return"<div class='sighting-grid'>"+items.map(function(item){
  var name=kind==="paintings"?item.title:item.name,image=kind==="paintings"?item.image:(item.image&&item.image.src);
  var details=kind==="paintings"?item.artist:[item.year,item.category].filter(Boolean).join(" · ");
  var url=typeof item.url==="string"&&item.url.indexOf("https://")===0?item.url:"";
  var imageUrl=typeof image==="string"&&image.indexOf("https://")===0?image:"";
  var thumb=imageUrl?"<span class='sighting-thumb'><img src='"+esc(imageUrl)+"' alt='' loading='lazy'></span>":"<span class='sighting-thumb stay-saved-placeholder' aria-hidden='true'></span>";
  return"<article class='sighting-card'>"+thumb+"<div class='sighting-info'><b>"+esc(name||"")+"</b>"+(details?"<small>"+esc(details)+"</small>":"")+(url?"<a href='"+esc(url)+"' target='_blank' rel='noopener'>"+(kind==="paintings"?"View painting":"View UNESCO site")+"</a>":"")+"</div></article>"
 }).join("")+"</div>"
}
function cityJournalModal(title,body,backAction,stayId){
 paintingsClose();
 paintCss();
 var back=document.createElement("div");back.id="paint-modal";back.className="paint-back";
 back.setAttribute("data-city-stay",stayId||"");
 back.setAttribute("data-back-action",backAction||"");
 back.innerHTML="<div class='paint-box city-journal-box' role='dialog' aria-modal='true' aria-label='"+esc(title)+"'>"+
  "<div class='city-journal-heading'>"+(backAction?"<button type='button' class='btn alt city-journal-back' onclick='"+esc(backAction)+"'>Back</button>":"")+"<button type='button' class='paint-close' onclick='paintingsClose()'>Close</button><h2>"+esc(title)+"</h2></div>"+body+"</div>";
 back.addEventListener("click",function(e){if(e.target===back)paintingsClose()});
 document.body.appendChild(back);
 var close=back.querySelector(".paint-close");if(close)close.focus();
}
function searchModalOpen(title,term){
 var body="<label for='search-modal-provider'>Search with</label><select id='search-modal-provider' class='search-modal-provider'><option value='google'>Google</option><option value='ecosia'>Ecosia</option><option value='duckduckgo'>DuckDuckGo</option></select><label for='search-modal-term'>Search term</label><textarea id='search-modal-term' class='search-modal-term'>"+esc(term)+"</textarea><button type='button' class='btn' onclick='launchSearch()'>Search</button><p id='search-modal-feedback' class='mute' role='status'></p>";
 cityJournalModal(title+" search",body,null);
 var input=document.getElementById("search-modal-term");if(input)input.focus();
}
function launchSearch(){
 var modal=document.getElementById("paint-modal"),input=modal&&modal.querySelector("#search-modal-term"),provider=modal&&modal.querySelector("#search-modal-provider"),term=input?input.value.trim():"";
 if(!term){var feedback=modal&&modal.querySelector("#search-modal-feedback");if(feedback)feedback.textContent="Enter a search term first.";return}
 var searchUrls={google:"https://www.google.com/search?q=",ecosia:"https://www.ecosia.org/search?q=",duckduckgo:"https://duckduckgo.com/?q="};
 var base=searchUrls[provider&&provider.value]||searchUrls.google;
 window.open(base+encodeURIComponent(term),"_blank","noopener,noreferrer");
 paintingsClose();
}
function cityNotesHtml(stay){
 var text=String(stay.notes||""),html="",last=0,match,re=/https?:\/\/[^\s<>\"']+/g;
 while((match=re.exec(text))){
  var url=match[0],link=url;
  while(/[.,!?;:)\]}]$/.test(link))link=link.slice(0,-1);
  html+=esc(text.slice(last,match.index));
  if(link){
   html+="<a href='"+esc(link)+"' target='_blank' rel='noopener noreferrer'>"+esc(link)+"</a>"+esc(url.slice(link.length));
  }else html+=esc(url);
  last=match.index+url.length;
 }
 html+=esc(text.slice(last));
 return text.trim()?"<p class='stay-notes-text'>"+html+"</p>":"<p class='mute'>No notes for this stay yet.</p>";
}
function openStayNotes(stayId,returnToJournal){
 var c=campAch();if(!c)return;
 var stay=ensureCityStays(c).filter(function(item){return item&&item.id===stayId})[0];
 if(!stay)return;
 var backAction="";
 if(returnToJournal){
  var current=document.getElementById("paint-modal"),previousAction=current?current.getAttribute("data-back-action"):"";
  backAction="openCityStay("+JSON.stringify(stay.id)+","+JSON.stringify(previousAction||"")+")";
 }
 var body="<label class='city-notes-label' for='city-stay-notes'>Notes for "+esc(journeyName(stay.cityId))+"</label><textarea id='city-stay-notes' class='city-notes-input' rows='8'>"+esc(stay.notes||"")+"</textarea><button type='button' class='btn' onclick='"+cityStayAction("saveStayNotes",[stay.id])+"'>Save notes</button><p id='city-notes-feedback' class='mute' role='status'></p>";
 cityJournalModal("Notes · "+journeyName(stay.cityId),body,backAction,stay.id);
}
function saveStayNotes(stayId){
 var modal=document.getElementById("paint-modal"),input=modal&&modal.querySelector("#city-stay-notes");
 if(!input)return;
 var c=campAch();if(!c)return;
 var stay=ensureCityStays(c).filter(function(item){return item&&item.id===stayId})[0];
 if(!stay)return;
 stay.notes=input.value;
 save();
 var feedback=modal.querySelector("#city-notes-feedback");if(feedback)feedback.textContent="Notes saved.";
}
function countryCityStays(country){
 var c=campAch();if(!c)return[];
 return ensureCityStays(c).filter(function(stay){return stay&&PLACE_COUNTRY[stay.cityId]===country})
}
function openCountryStays(country){
 var stays=countryCityStays(country),cities=[];
 stays.forEach(function(stay){if(cities.indexOf(stay.cityId)<0)cities.push(stay.cityId)});
 if(cities.length===1){openCityStays(cities[0],country,false);return}
 if(!cities.length){
  cityJournalModal(country,"<p class='mute'>No recorded city stays in this country yet.</p>",null);
  return;
 }
 var body="<p class='mute'>Choose a city you have spent time in.</p><div class='city-journal-list'>"+cities.map(function(id){
  var count=stays.filter(function(stay){return stay.cityId===id}).length;
  return"<button type='button' class='city-journal-choice' onclick='"+cityStayAction("openCityStays",[id,country,true])+"'><b>"+esc(journeyName(id))+"</b><small>"+count+" "+(count===1?"stay":"stays")+"</small></button>";
 }).join("")+"</div>";
 cityJournalModal("Cities visited in "+country,body,null);
}
function openCityStays(cityId,country,hasCityList){
 var stays=countryCityStays(country||PLACE_COUNTRY[cityId]).filter(function(stay){return stay.cityId===cityId});
 var backAction=hasCityList?("openCountryStays("+JSON.stringify(country)+")"):"";
 if(stays.length===1){openCityStay(stays[0].id,backAction);return}
 if(!stays.length){
  cityJournalModal(journeyName(cityId),"<p class='mute'>No recorded stays for this city yet.</p>",backAction);
  return;
 }
 var body="<p class='mute'>Choose which stay to view. You can mark one local dish eaten on each stay.</p><div class='city-journal-list'>"+stays.map(function(stay,index){
  return"<button type='button' class='city-journal-choice' onclick='"+cityStayAction("openCityStay",[stay.id,"openCityStays("+JSON.stringify(cityId)+","+JSON.stringify(country)+","+!!hasCityList+")"])+"'><b>Stay "+(index+1)+(stay.eatenDish?" · Dish eaten":"")+"</b><small>"+esc(stay.at||"Recorded visit")+"</small></button>";
 }).join("")+"</div>";
 cityJournalModal(journeyName(cityId),body,backAction);
}
function cityStayContentHtml(stay,data,error){
 var dishes=foodSpecialtiesFor(stay.cityId,data),meal=stay.eatenDish,localBody="";
 if(meal){
  var mealUrl=typeof meal.url==="string"&&meal.url.indexOf("https://")===0?meal.url:"";
  var mealImage=meal.thumbnail&&typeof meal.thumbnail.url==="string"&&meal.thumbnail.url.indexOf("https://")===0?meal.thumbnail.url:"";
  localBody="<div class='sighting-card stay-eaten-card'>"+(mealImage?"<span class='sighting-thumb'><img src='"+esc(mealImage)+"' alt=''></span>":"<span class='sighting-thumb stay-dish-placeholder' aria-hidden='true'></span>")+"<div class='sighting-info'><b>"+esc(meal.name)+"</b>"+(meal.description?"<small>"+esc(meal.description)+"</small>":"")+(mealUrl?"<a href='"+esc(mealUrl)+"' target='_blank' rel='noopener'>Read about this dish</a>":"")+"</div></div><p class='mute'>One dish can be recorded per stay.</p>";
 }else if(error){
  localBody="<p class='mute'>Local dishes could not be loaded: "+esc(error.message||error)+".</p>";
 }else if(!dishes.length){
  localBody="<p class='mute'>No local dish choices are available for this city.</p>";
 }else{
  localBody="<p class='mute'>Choose one dish you ate during this stay. This choice can only be saved once.</p><fieldset class='stay-dish-options sighting-grid'><legend class='sr-only'>Local dishes</legend>"+dishes.map(function(d,index){
   if(!d||!d.name)return"";
   var img=d.thumbnail&&typeof d.thumbnail.url==="string"&&d.thumbnail.url.indexOf("https://")===0?"<img src='"+esc(d.thumbnail.url)+"' alt='' loading='lazy'>":"";
   return"<label class='stay-dish-option sighting-card'><input type='radio' name='stay-dish' value='"+index+"'><span class='sighting-thumb'>"+(img||"<span class='stay-dish-placeholder' aria-hidden='true'></span>")+"</span><span class='sighting-info'><b>"+esc(d.name)+"</b>"+(d.description?"<small>"+esc(d.description)+"</small>":"")+"</span></label>";
  }).join("")+"</fieldset><button type='button' class='btn' onclick='"+cityStayAction("saveStayDish",[stay.id])+"'>Save as eaten</button><p class='stay-dish-feedback' id='stay-dish-feedback' role='status'></p>";
 }
 var c=campAch(),sightings=uniqueSightings((c&&Array.isArray(c.sightings)?c.sightings:[]).filter(function(s){return s&&s.locationId===stay.cityId&&s.id&&s.name&&typeof s.imageUrl==="string"&&s.imageUrl.indexOf("https://")===0}));
 var paintings=Array.isArray(stay.favoritePaintings)?stay.favoritePaintings:[],heritage=Array.isArray(stay.visitedHeritage)?stay.visitedHeritage:[];
 var natureBody="<p class='stay-saved-note' role='status'>Nature sightings are saved here automatically; you do not need to select or save them.</p>"+
  (sightings.length?"<div class='sighting-grid stay-nature-list' role='list'>"+sightings.map(function(s){
   var url="https://www.inaturalist.org/observations/"+encodeURIComponent(s.id);
   return"<article class='sighting-card' role='listitem'><a class='sighting-thumb' href='"+url+"' target='_blank' rel='noopener' aria-label='View "+esc(s.name)+" on iNaturalist'><img src='"+esc(s.imageUrl)+"' alt='Photo of "+esc(s.name)+"' loading='lazy'></a><div class='sighting-info'><b>"+esc(s.name)+"</b><small>"+esc(s.locationName||s.locationId||"")+"</small><a href='"+url+"' target='_blank' rel='noopener'>View on iNaturalist</a><small class='sighting-credit'>"+esc(naturePhotoCredit(s.credit||s.attribution,s.representative))+"</small></div></article>";
  }).join("")+"</div>":"<p class='mute'>No sightings recorded in this city yet. Use Nature while exploring to add them.</p>");
 return"<p class='mute stay-date'>"+esc(stay.at||"Recorded stay")+"</p><div class='stay-interactions'>"+
  "<section class='stay-interaction-card'><h3>Notes</h3>"+cityNotesHtml(stay)+"<button type='button' class='btn alt' onclick='"+cityStayAction("openStayNotes",[stay.id,true])+"'>Edit notes</button></section>"+
  "<section class='stay-interaction-card'><h3>Local dishes</h3>"+localBody+"</section>"+
  "<section class='stay-interaction-card'><h3>Nature</h3>"+natureBody+"</section>"+
  "<section class='stay-interaction-card'><h3>Favourite paintings</h3>"+citySavedCollectionHtml(paintings,"paintings")+"</section>"+
  "<section class='stay-interaction-card'><h3>UNESCO sites visited</h3>"+citySavedCollectionHtml(heritage,"heritage")+"</section></div>";
}
function openCityStay(stayId,backAction){
 var c=campAch();if(!c)return;
 var stay=ensureCityStays(c).filter(function(item){return item&&item.id===stayId})[0];
 if(!stay)return;
 var title=journeyName(stay.cityId);
 cityJournalModal(title,"<div id='city-stay-content'><p class='mute'>Loading stay journal\u2026</p></div>",backAction,stay.id);
 foodSpecialtiesLoad().then(function(data){
  var modal=document.getElementById("paint-modal");
  if(modal&&modal.getAttribute("data-city-stay")===String(stay.id))modal.querySelector("#city-stay-content").innerHTML=cityStayContentHtml(stay,data,null);
 },function(error){
  var modal=document.getElementById("paint-modal");
  if(modal&&modal.getAttribute("data-city-stay")===String(stay.id))modal.querySelector("#city-stay-content").innerHTML=cityStayContentHtml(stay,null,error);
 });
}
function saveStayDish(stayId){
 var feedback=document.getElementById("stay-dish-feedback"),modal=document.getElementById("paint-modal");
 var selected=modal&&modal.querySelector("input[name='stay-dish']:checked");
 if(!selected){if(feedback)feedback.textContent="Choose a dish before saving.";return}
 var c=campAch();if(!c)return;
 var stay=ensureCityStays(c).filter(function(item){return item&&item.id===stayId})[0];
 if(!stay||stay.eatenDish)return;
 var dishes=foodSpecialtiesFor(stay.cityId,FOOD_SPECIALTIES),dish=dishes[Number(selected.value)];
 if(!dish||!dish.name){if(feedback)feedback.textContent="That dish is no longer available.";return}
 var thumbnail=dish.thumbnail||{};
 stay.eatenDish={name:String(dish.name),description:String(dish.description||""),url:typeof dish.url==="string"?dish.url:"",thumbnail:{url:typeof thumbnail.url==="string"?thumbnail.url:""}};
 save();
 openCityStay(stay.id,modal.getAttribute("data-back-action"));
}
function notesOpen(pid){
 visitPlace(pid,"activity");
 var stay=recordCityStay(pid);
 if(stay)openStayNotes(stay.id,false);
}
function cuisineOpen(pid){
 visitPlace(pid,"activity");
 var stay=recordCityStay(pid);
 if(stay)openCityStay(stay.id);
}
var FOOD_SPECIALTIES_READY=foodSpecialtiesLoad().then(function(data){
 if(S&&S.loc&&foodSpecialtiesFor(S.loc,data).length&&document.querySelector(".tiles")&&!document.querySelector(".tile-local-dishes")&&!document.getElementById("paint-modal"))render();
},function(error){console.error("Could not load local food specialties",error)});
function thingsHtml(){
 tileCss();
 var q=function(s){return encodeURIComponent(s).replace(/%20/g,"+")},c=q(N[S.loc].n);
 var core=[
  {full:"Discover the local music scene",emoji:"🎵",title:"Music",ext:true,searchTerm:"tell me about the music scene in "+N[S.loc].n+". Give me examples of artists covering traditional, mainstream and more locally unique music where applicable"},
  {full:"Discover the local sports scene",emoji:"⚽",title:"Sport",ext:true,searchTerm:"tell me about the sports scene in "+N[S.loc].n+". Give me examples covering traditional, mainstream and more locally unique sports where applicable"},
  {full:"Explore local folklore and legends",emoji:"📜",title:"Folklore",ext:true,searchTerm:N[S.loc].n+": tell me about local folklore, myths and unusual histories"}
 ].filter(function(t){return thingOn(t.full)});
 // Themes with data for this town. Paintings always comes from the paintings data; other themes (e.g. UNESCO) go here too.
 var pics=(typeof PAINTINGS!=="undefined"&&PAINTINGS[S.loc])||[];
 var extra=[];
 if(pics.length)extra.push({emoji:"🖼️",title:"Paintings",onclick:"paintingsOpen('"+S.loc+"')"});
 // UNESCO World Heritage sites near this town (data/unesco.json, built by tools/gen-unesco.mjs).
 if(((UNESCO_MAP||{})[S.loc]||[]).length)extra.push({emoji:"🏛️",title:"Heritage",onclick:"unescoOpen('"+S.loc+"')",cls:"tile-heritage"});
 extra.push({emoji:"🌿",title:"Nature",onclick:"natureOpen('"+S.loc+"')"});
 if(FOOD_SPECIALTIES&&foodSpecialtiesFor(S.loc,FOOD_SPECIALTIES).length)extra.push({emoji:"🍽️",title:"Local dishes",onclick:"cuisineOpen('"+S.loc+"')",cls:"tile-local-dishes"});
 // Link-out search tiles. They open the site's own search for the town name; nothing is fetched or stored.
 // The search addresses are not checked against the live sites, so confirm them in a browser and edit here if they change.
 if(atlasTile())extra.push({emoji:"🧭",title:"Atlas Obscura",ext:true,href:atlasHref()});
 if(tasteTile())extra.push({emoji:"🍽️",title:"TasteAtlas",ext:true,href:"https://www.tasteatlas.com/"+tasteSlug(S.loc)});
 // YouTube search for "{town} Must See". A plain link out, like Atlas Obscura: no key, no data stored.
 extra.push({emoji:"🎬",title:"A day in... videos",ext:true,href:"https://www.youtube.com/results?search_query="+encodeURIComponent(N[S.loc].n+" Must See").replace(/%20/g,"+")});
 // Your own search links from Settings, as tiles too.
 customLinks(N[S.loc].n).forEach(function(l){extra.push({emoji:"🔗",title:l[0],href:l[2]})});
 var tiles=[{emoji:"📝",title:"Notes",onclick:"notesOpen('"+S.loc+"')"}].concat(core,extra);
 if(!tiles.length)return "<div class='panel'><h2>Things to do</h2><p class='mute'>All the things to do links are turned off. Turn them back on in Settings.</p></div>";
 return "<div class='panel'><h2>Things to do</h2><div class='tiles'>"+tiles.map(tileHtml).join("")+"</div></div>";
}

// While you wait: the market and things to do cost no time, so the service still leaves on schedule
function waitHtml(){
 var o=S.pendOpt,v=vehicleName(o.m),to=N[o.to].n;
 var h="<div class='panel'><h2>Waiting for the "+esc(v)+" to "+esc(to)+"</h2>"+
  "<p class='mute mb6'>It leaves at "+esc(clk(S.waitDep))+", "+mins(S.waitDep-S.h)+" from now.</p>"+
  "<p class='mute mb10'>Why not explore "+esc(N[S.loc].n)+" while you wait? The market, timeline challenge and local activities cost no time, and you could make some money to help you along the way.</p>"+
  "<p class='mute mb10'>When you're ready, continue your journey with the button below.</p></div>";
 h+=earnHtml();
 h+=thingsHtml();
 h+="<div class='panel'><p class='mute mb10'>When you're ready, continue your journey with the button below.</p>"+
  "<div class='row'><button class='btn' onclick='boardWaiting()'>Board the "+esc(v)+" at "+esc(clk(S.waitDep))+"</button><button class='link' onclick='cancelWait()'>Choose a different option</button></div></div>";
 return h
}
function boardWaiting(){
 S.timelineOpen=false;
 if(S.phase!=="wait")return;
 var i=S.pend,dep=S.waitDep,c=campAch();visitPlace(S.loc,"stay");if(c){c.waited+=Math.max(0,dep-S.h);if(c.waited>=12)unlockAch("timewaster")}
 S.pend=null;S.pendOpt=null;S.waitDep=null;S.camp.marketOpen=false;S.phase="move";
 hop(i,dep);
}

function cancelWait(){S.timelineOpen=false;S.phase="move";S.pend=null;S.pendOpt=null;S.waitDep=null;S.camp.marketOpen=false;render()}

// The town market catalogue (data/market.json, built by tools/gen-market.mjs). Loaded once.
// If the file is missing, towns fall back to the built-in demo stock; no live lookup is made.
var MARKET_CAT={};
var MARKET_READY=fetch("data/market.json").then(function(r){if(!r.ok)throw new Error("market "+r.status);return r.json()}).catch(function(){return {}}).then(function(c){
 MARKET_CAT=c||{};return MARKET_CAT;
});


// Start the market's stock and buyers for the pack as it stands, so the visit is ready when the player gets there


// Opens the timeline activity over the page, for the town you are in. Closing returns to where you were.
// The timeline opens in place of the things-to-do list, the way the market does. Back returns to the list.
function openTimeline(){ S.timelineOpen=true; render() }
function closeTimeline(){ markSeen("t");S.timelineOpen=false; render() }
// Called after each render: starts the activity in its place on the page
function mountTimeline(){
 var el=document.getElementById("tl-inline");
 if(!el||el.dataset.mounted)return;
 el.dataset.mounted="1";
 timelineActivity(el,mkCity(),closeTimeline,function(pts,max){return awardTimeline(mkCity(),pts,max)});
}

// Points from the City Timeline are paid as pounds, once for each town in each leg
function awardTimeline(city,pts,max){
 timelineFullMarks(pts,max);
 visitPlace(S.loc,"timeline");
 S.camp.timelinePaid=S.camp.timelinePaid||{};
 if(S.camp.timelinePaid[city])return "You have already earned from "+city+" this leg.";
 S.camp.timelinePaid[city]=1;
 S.cash+=pts;
 say(clk(S.h)+": City Timeline in "+city+": +\u00a3"+pts+".");
 save();
 var b=document.querySelector(".hdr .r1>span:nth-child(2) b");if(b)b.textContent="\u00a3"+Math.round(S.cash);
 return "You earn \u00a3"+pts+" for "+city+".";
}

function paintingsOpen(pid){
 openCityCollection(pid,"paintings");
}
function paintingsClose(){var m=document.getElementById('paint-modal');if(m)m.remove();}

function natureLoad(pid){
 if(NATURE_CACHE[pid])return NATURE_CACHE[pid];
 var place=N[pid];
 if(!place||typeof place.la!=="number"||!isFinite(place.la)||typeof place.lo!=="number"||!isFinite(place.lo))return Promise.reject(new Error("Town coordinates unavailable"));
 var sightings=[],seen=Object.create(null);
 function radiusSearch(index){
  if(index>=NATURE_RADII.length||sightings.length>=NATURE_LIMIT)return Promise.resolve(sightings);
  var url="https://api.inaturalist.org/v1/observations?lat="+encodeURIComponent(place.la)+
   "&lng="+encodeURIComponent(place.lo)+"&radius="+NATURE_RADII[index]+"&quality_grade=research&photos=true&taxon_id=1&rank=species&per_page=100&order=desc&order_by=observed_on";
  return fetch(url).then(function(r){
   if(!r.ok)throw new Error("iNaturalist request failed ("+r.status+")");
   return r.json();
  }).then(function(data){
   if(!data||!Array.isArray(data.results))throw new Error("Unexpected iNaturalist response");
   data.results.forEach(function(o){
    if(sightings.length>=NATURE_LIMIT)return;
    var sighting=natureSightingRecord(o,pid);
    var key=sightingSpeciesKey(sighting);
    if(!sighting||!key||seen[key])return;
    seen[key]=true;
    sightings.push(sighting);
   });
   return radiusSearch(index+1);
  });
 }
 var request=radiusSearch(0);
 NATURE_CACHE[pid]=request;
 request.catch(function(){if(NATURE_CACHE[pid]===request)delete NATURE_CACHE[pid]});
 return request;
}
function natureResults(pid){
 var el=document.getElementById("nature-results");
 return el&&el.getAttribute("data-town")===pid?el:null;
}
function naturePhotoUrl(photo){
 var url=photo&&(photo.medium_url||photo.large_url||photo.url||photo.square_url);
 if(typeof url!=="string")return "";
 url=url.replace(/\/square\.(jpg|jpeg|png)(\?.*)?$/i,"/medium.$1$2");
 return url.indexOf("https://")===0?url:"";
}
function natureSightingRecord(o,pid){
 if(!o||!o.id||!o.taxon||!o.taxon.id||!Array.isArray(o.photos)||!o.photos.length)return null;
 var taxon=o.taxon,photo=taxon.default_photo,representative=!!naturePhotoUrl(photo);
 if(!representative)photo=o.photos[0];
 var imageUrl=naturePhotoUrl(photo),name=taxon.preferred_common_name||taxon.name||o.species_guess;
 if(!imageUrl||!name)return null;
 var location=N[pid];
 return{
  id:String(o.id),taxonId:String(taxon.id),name:name,imageUrl:imageUrl,
  url:"https://www.inaturalist.org/observations/"+encodeURIComponent(o.id),
  locationId:pid,locationName:location?location.n:pid,
  credit:natureCreditName(photo.attribution),
  representative:representative,scientificName:taxon.name&&taxon.name!==name?taxon.name:"",observedOn:o.observed_on||""
 };
}
function recordNatureSightings(list){
 if(!S||!S.camp)return;
 var sightings=Array.isArray(S.camp.sightings)?S.camp.sightings:[],combined=sightings.concat(Array.isArray(list)?list:[]);
 var unique=uniqueSightings(combined);
 S.camp.sightings=unique;
 if(unique.length!==sightings.length||unique.length!==combined.length)save();
}
function natureHtml(list){
 if(!list.length)return "<p class='mute'>No research-grade animal photos found within 25 km.</p>";
 return list.map(function(s){
  var scientific=s.scientificName?"<br><i>"+esc(s.scientificName)+"</i>":"";
  var date=s.observedOn?"<span class='mute'>Observed "+esc(s.observedOn)+"</span><br>":"";
  return "<div class='paint-item'><strong>"+esc(s.name)+"</strong>"+scientific+
   "<br><img src='"+esc(s.imageUrl)+"' alt='"+esc(s.name)+"' loading='lazy'>"+
    "<div class='paint-credit'>"+esc(naturePhotoCredit(s.credit||s.attribution,s.representative))+"</div>"+
   date+"<a href='"+esc(s.url)+"' target='_blank' rel='noopener'>View local observation on iNaturalist</a></div>";
 }).join("");
}
function natureOpen(pid){
 visitPlace(pid,"activity");
 var name=(typeof N!=="undefined"&&N[pid]&&N[pid].n)||pid;
 paintingsClose();
 paintCss();
 var back=document.createElement("div");back.id="paint-modal";back.className="paint-back";
 back.innerHTML="<div class='paint-box'><button type='button' class='paint-close' onclick='paintingsClose()'>Close</button>"+
  "<h2>Wildlife near "+esc(name)+"</h2><p class='mute'>Recent research-grade animal observations with photos, searching from 5 km out to 25 km.</p>"+
  "<div id='nature-results' data-town='"+esc(pid)+"' role='status' aria-live='polite'>Loading wildlife observations…</div></div>";
 back.addEventListener("click",function(e){if(e.target===back)paintingsClose();});
 document.body.appendChild(back);
 natureLoad(pid).then(function(list){
  recordNatureSightings(list);
  var el=natureResults(pid);
  if(el)el.innerHTML=natureHtml(list);
 },function(){
  var el=natureResults(pid);
  if(!el)return;
  el.setAttribute("role","alert");
  el.innerHTML="<p class='mute'>Could not load wildlife observations. Check your connection and try again.</p><button type='button' class='btn' id='nature-retry'>Try again</button>";
  document.getElementById("nature-retry").addEventListener("click",function(){natureOpen(pid)});
 });
}
