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
 if(t.onclick)return "<button type='button' class='btn tile"+(t.cls?" "+t.cls:"")+"' title='"+esc(t.title)+"' onclick=\""+t.onclick+"\">"+inner+"</button>";
 return "<a class='btn tile' href='"+t.href+"' target='_blank' rel='noopener' title='"+esc(t.title)+"'>"+inner+"</a>";
}
// UNESCO sites by town id. Loaded once; if the file is missing or empty, no Heritage tiles appear.
var UNESCO_MAP={};
var NATURE_CACHE={};
var CUISINE_INDEX=null,CUISINE_INDEX_PROMISE=null;
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
  st.textContent+=".paint-box a:link,.paint-box a:visited{color:#5cc2b0;text-decoration-thickness:.08em;text-underline-offset:2px}.paint-box a:hover,.paint-box a:active{color:#a5e8dc}";
  document.head.appendChild(st);
 }
}
function unescoOpen(pid){
 var list=(UNESCO_MAP||{})[pid]||[];
 if(!list.length)return;
 paintCss();
 var name=(typeof N!=="undefined"&&N[pid]&&N[pid].n)||pid;
 paintingsClose();
 var items=list.map(function(x){
  var km=x.km!=null?(x.km<1?"under 1 km":Math.round(x.km)+" km")+" away":"";
  var img=x.image&&x.image.src?"<img src='"+x.image.src+"' alt='"+esc(x.name)+"' loading='lazy' style='max-width:100%;border-radius:6px;display:block;margin:8px 0'><div class='paint-credit'>Photo from Wikimedia Commons. <a href='"+x.image.page+"' target='_blank' rel='noopener'>Photographer and licence</a>.</div>":"";
  return "<div class='paint-item'><strong>"+esc(x.name)+"</strong><br><span class='mute'>"+esc([x.year,x.category,km].filter(Boolean).join(" · "))+"</span>"+img+
   "<p><a href='"+x.url+"' target='_blank' rel='noopener'>Read on the UNESCO World Heritage site</a></p></div>";
 }).join("");
 var back=document.createElement('div');back.id='paint-modal';back.className='paint-back';
 back.innerHTML="<div class='paint-box'><button type='button' class='paint-close' onclick='paintingsClose()'>Close</button><h2>World Heritage near "+esc(name)+"</h2>"+items+"</div>";
 back.addEventListener('click',function(e){if(e.target===back)paintingsClose();});
 document.body.appendChild(back);
}
function cuisineIndexLoad(){
 if(CUISINE_INDEX)return Promise.resolve(CUISINE_INDEX);
 if(!CUISINE_INDEX_PROMISE){
  CUISINE_INDEX_PROMISE=fetch("data/cuisine/index.json").then(function(r){
   if(!r.ok)throw new Error("Cuisine data request failed ("+r.status+")");
   return r.json();
  }).then(function(data){
   if(!data||!data.townAreas||!data.areas)throw new Error("Cuisine data has an unexpected format");
   CUISINE_INDEX=data;
   return data;
  }).catch(function(error){
   CUISINE_INDEX_PROMISE=null;
   throw error;
  });
 }
 return CUISINE_INDEX_PROMISE;
}
function cuisineHtml(pid,index){
 var area=index.townAreas[pid],dishes=area?(index.areas[area]||[]):[];
 var attribution="<p class='paint-credit'>Town-area mapping: &copy; <a href='https://www.openstreetmap.org/copyright' target='_blank' rel='noopener'>OpenStreetMap contributors</a> (Nominatim).</p>";
 if(!dishes.length)return attribution+"<p class='mute'>No local dishes were found for "+esc(N[pid]?N[pid].n:pid)+".</p>";
 return "<p class='mute'>Dishes associated with "+esc(area)+": "+dishes.length+".</p>"+attribution+dishes.map(function(d){
  if(!d||!d.name||typeof d.url!=="string"||d.url.indexOf("https://")!==0)return"";
  var image=typeof d.imageUrl==="string"&&d.imageUrl.indexOf("https://")===0
   ?"<a href='"+esc(d.url)+"' target='_blank' rel='noopener' aria-label='Read about "+esc(d.name)+" on Wikipedia'><img src='"+esc(d.imageUrl)+"' alt='"+esc(d.name)+"' loading='lazy'></a>"
   :"<p class='paint-credit'>No Wikipedia lead photo available.</p>";
  var description=d.description?"<p class='mute'>"+esc(d.description)+"</p>":"";
  var license=d.license?(typeof d.licenseUrl==="string"&&d.licenseUrl.indexOf("https://")===0
   ?"<a href='"+esc(d.licenseUrl)+"' target='_blank' rel='noopener'>"+esc(d.license)+"</a>"
   :esc(d.license)):"";
  var creditParts=[];
  if(d.imageUrl||d.photoCredit||license||d.photoUrl)creditParts.push(d.photoCredit?esc(d.photoCredit):"Photographer not credited");
  if(license)creditParts.push(license);
  if(typeof d.photoUrl==="string"&&d.photoUrl.indexOf("https://")===0)creditParts.push("<a href='"+esc(d.photoUrl)+"' target='_blank' rel='noopener'>Image details</a>");
  var photoCredit=creditParts.length?"<div class='paint-credit'>Photo: "+creditParts.join(" · ")+"</div>":"";
  return "<div class='paint-item'><a href='"+esc(d.url)+"' target='_blank' rel='noopener'><strong>"+esc(d.name)+"</strong></a>"+description+image+photoCredit+
   "<a href='"+esc(d.url)+"' target='_blank' rel='noopener'>Read about this dish on Wikipedia</a></div>";
 }).join("");
}
function cuisineOpen(pid){
 paintingsClose();
 paintCss();
 var name=(typeof N!=="undefined"&&N[pid]&&N[pid].n)||pid;
 var back=document.createElement("div");back.id="paint-modal";back.className="paint-back";
 back.innerHTML="<div class='paint-box'><button type='button' class='paint-close' onclick='paintingsClose()'>Close</button>"+
  "<h2>Local dishes in "+esc(name)+"</h2><div id='cuisine-results' role='status' aria-live='polite'><p class='mute'>Loading local dishes\u2026</p></div></div>";
 back.addEventListener("click",function(e){if(e.target===back)paintingsClose()});
 document.body.appendChild(back);
 cuisineIndexLoad().then(function(index){
  var el=document.getElementById("cuisine-results");
  if(el)el.innerHTML=cuisineHtml(pid,index);
 },function(error){
  var el=document.getElementById("cuisine-results");
  if(!el)return;
  el.setAttribute("role","alert");
  el.innerHTML="<p class='mute'>Could not load local dishes: "+esc(error&&error.message||error)+"</p><button type='button' class='btn' id='cuisine-retry'>Try again</button>";
  document.getElementById("cuisine-retry").addEventListener("click",function(){cuisineOpen(pid)});
 });
}
function thingsHtml(){
 tileCss();
 var q=function(s){return encodeURIComponent(s).replace(/%20/g,"+")},c=q(N[S.loc].n);
 var core=[
  {full:"Discover the local music scene",emoji:"🎵",title:"Music",ext:true,href:"https://www.google.com/search?q=tell+me+about+the+music+scene+in+"+c+".+Give+me+examples+of+artists+covering+traditional%2C+mainstream+and+more+locally+unique+music+where+applicable"},
  {full:"Discover the local sports scene",emoji:"⚽",title:"Sport",ext:true,href:"https://www.google.com/search?q=tell+me+about+the+sports+scene+in+"+c+".+Give+me+examples+covering+traditional%2C+mainstream+and+more+locally+unique+sports+where+applicable"},
  {full:"Explore local folklore and legends",emoji:"📜",title:"Folklore",ext:true,href:"https://www.google.com/search?q="+c+"%3A+tell+me+about+local+folklore%2C+myths+and+unusual+histories"}
 ].filter(function(t){return thingOn(t.full)});
 // Themes with data for this town. Paintings always comes from the paintings data; other themes (e.g. UNESCO) go here too.
 var pics=(typeof PAINTINGS!=="undefined"&&PAINTINGS[S.loc])||[];
 var extra=[];
 if(pics.length)extra.push({emoji:"🖼️",title:"Paintings",onclick:"paintingsOpen('"+S.loc+"')"});
 // UNESCO World Heritage sites near this town (data/unesco.json, built by tools/gen-unesco.mjs).
 if(((UNESCO_MAP||{})[S.loc]||[]).length)extra.push({emoji:"🏛️",title:"Heritage",onclick:"unescoOpen('"+S.loc+"')",cls:"tile-heritage"});
 extra.push({emoji:"🌿",title:"Nature",onclick:"natureOpen('"+S.loc+"')"});
 extra.push({emoji:"🍽️",title:"Local dishes",onclick:"cuisineOpen('"+S.loc+"')"});
 // Link-out search tiles. They open the site's own search for the town name; nothing is fetched or stored.
 // The search addresses are not checked against the live sites, so confirm them in a browser and edit here if they change.
 if(atlasTile())extra.push({emoji:"🧭",title:"Atlas Obscura",ext:true,href:atlasHref()});
 if(tasteTile())extra.push({emoji:"🍽️",title:"TasteAtlas",ext:true,href:"https://www.tasteatlas.com/"+tasteSlug(S.loc)});
 // YouTube search for "{town} Must See". A plain link out, like Atlas Obscura: no key, no data stored.
 extra.push({emoji:"🎬",title:"A day in... videos",ext:true,href:"https://www.youtube.com/results?search_query="+encodeURIComponent(N[S.loc].n+" Must See").replace(/%20/g,"+")});
 // Your own search links from Settings, as tiles too.
 customLinks(N[S.loc].n).forEach(function(l){extra.push({emoji:"🔗",title:l[0],href:l[2]})});
 var tiles=core.concat(extra);
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
 var i=S.pend,dep=S.waitDep,c=campAch();if(c){c.waited+=Math.max(0,dep-S.h);if(c.waited>=12)unlockAch("timewaster")}
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
 var list=(typeof PAINTINGS!=="undefined"&&PAINTINGS[pid])||[];
 if(!list.length)return;
 var name=(typeof N!=="undefined"&&N[pid]&&N[pid].n)||pid;
 paintingsClose();
 paintCss();
 var items=list.map(function(p){
  var img=p.image?"<img src='"+String(p.image).replace(/'/g,"%27")+"' alt='"+esc(p.title)+"' loading='lazy'><div class='paint-credit'>Image: "+esc(p.image_source||"")+"</div>":"";
  return "<div class='paint-item'><strong>"+esc(p.title)+"</strong><br><span class='mute'>"+esc(p.artist)+"</span>"+img+"<p><a href='"+p.url+"' target='_blank' rel='noopener'>View on paintinglocations.com</a></p></div>";
 }).join("");
 var back=document.createElement('div');back.id='paint-modal';back.className='paint-back';
 back.innerHTML="<div class='paint-box'><button type='button' class='paint-close' onclick='paintingsClose()'>Close</button><h2>Paintings of "+esc(name)+"</h2>"+items+"</div>";
 back.addEventListener('click',function(e){if(e.target===back)paintingsClose();});
 document.body.appendChild(back);
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
