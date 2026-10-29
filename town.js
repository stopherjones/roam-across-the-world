// Town: the market, rest days, stranded legs, things to do, and the wait before a service.
// Loaded after game.js. Everything here is a global function, which game.js calls when it needs it.

// ============ REST DAY ============
// After a leg, the rest day is a free day in the arrival town: trade at the stall, find buyers, then leave at 8am on day x+2.
// Stock, prices and buyers come from the Groq proxy, and are scored on one universal 1 to 10 scale (see the market prototype).
var MK_KINDS=["luxury","useful","cultural","food"];

var MK_BAND_NEUTRAL={character:"No clear character, so buyers want things in the usual way.",weights:{luxury:3,useful:3,cultural:3,food:3}};

var MK_CAP=6;

// Stranded: no onward fare is affordable and no checkpoint work is open. The leg ends here as a rest day, and the next income is smaller
var STRANDED_INCOME=200;

function mkRand(){var parts=Array.prototype.slice.call(arguments),a=mkHash(parts.join("|"));a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}

function mkRoll(lo,hi){var parts=Array.prototype.slice.call(arguments,2);return lo+(hi-lo)*mkRand.apply(null,parts)}

function mkMoney(v){return Math.round(15*Math.pow(1.5,Math.min(10,Math.max(1,v))-1))}

function mkBuy(v,supply){return mkMoney(v)*(0.6+0.08*(11-supply))}

function mkSell(v,demand){return mkMoney(v)*(0.6+0.08*demand)}

function mkClamp(v,d){var n=Math.round(Number(v));if(!isFinite(n))n=d;return Math.min(10,Math.max(1,n))}

function mkJson(text){var t=String(text||"").trim().replace(/^```(?:json)?\s*/i,"").replace(/\s*```$/,"");try{return JSON.parse(t)}catch(e){var a=t.indexOf("{"),b=t.lastIndexOf("}");if(a>=0&&b>a){try{return JSON.parse(t.slice(a,b+1))}catch(e2){}}throw new Error("unexpected format")}}

function mkAsk(prompt){return fetch(FLAVOUR_URL,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:FLAVOUR_MODEL,messages:[{role:"user",content:prompt}],temperature:0.9})}).then(function(r){if(!r.ok)throw new Error("status "+r.status);return r.json()}).then(function(j){return mkJson(j.choices&&j.choices[0]&&j.choices[0].message&&j.choices[0].message.content)})}

function mkPips(n){var h="<span class='pips'>";for(var i=1;i<=10;i++)h+="<i"+(i<=n?" class='on'":"")+"></i>";return h+"</span>"}

function mkGbp(n){return "\u00a3"+Math.round(n).toLocaleString("en-GB")}

// The town you are in: the market, prices and the rest day all belong to where you are standing
function mkCity(){return N[S.loc]?N[S.loc].n:""}

function mkDayNo(){return arrDay()+1}

function mkMarket(){
 var c=S.camp;if(!c.market||c.market.key!==mkCity()+"|"+mkDayNo())c.market={key:mkCity()+"|"+mkDayNo(),stall:null,profile:null};
 return c.market
}

function mkSeed(){return(S.camp&&S.camp.seed)||1}

// One request for everything the market needs: the town's profile, its stock and a buyer for each unsold item
function mkVisitPrompt(needStall,todo){
 var c=mkCity(),parts=["You are producing a travel game set in "+c+". Answer every part below in one reply."];
 if(needStall)parts.push("PROFILE: describe what the buyers of "+c+" tend to want, using general knowledge of the town's wealth, cost of living, fashions, working economy and cultural life. Give character as one short phrase, and weights scoring each kind of item from 1 (little interest) to 5 (strong interest), with 3 as neutral: luxury (fine craft, jewellery, fragrance), useful (tools, cookware, textiles, staples), cultural (folk art, instruments, ritual objects), food (produce, preserves, drink). A fashionable affluent city leans to luxury; a working port or farming region leans to useful goods.");
 if(needStall)parts.push("STOCK: list 3 to 5 specialist items genuinely associated with "+c+": local crafts, foods, produce or trades a visitor could buy from a maker or market there. Be specific and avoid generic goods. For each give name; craft (who makes it, one short phrase); origin_note (12 words maximum); value: a whole number 1 to 10 on a universal scale that means the same anywhere (1 is an everyday item, 10 a rare treasure); supply: a whole number 1 to 10 for how readily available it is in "+c+" (10 abundant, 1 scarce); kind: one of luxury, useful, cultural or food. Spread scores across the range: a typical town should sit around 5.");
 if(todo.length)parts.push("BUYERS: for each traveller item listed below, invent one local buyer who would realistically be shopping in "+c+". Give name; type (dealer, collector, shop owner or agent); line: one in-character sentence about the item and where they might try to sell it, which can be far away; demand: a whole number 1 to 10 for how much "+c+"'s buyers want this kind of item, on the same universal scale as the item's value, based on the town's wealth, climate, tastes, existing crafts and how far the item is from local life. Many should be 2 to 5, and only a genuine match 8 or more. savvy: a whole number 1 to 5 for how well they know the trade. Copy each item's ref exactly. Items: "+JSON.stringify(todo.map(function(x){return{ref:x.uid,name:x.name,craft:x.craft,origin:x.origin,value:x.value}})));
 var shape=[];
 if(needStall)shape.push('"character":"","weights":{"luxury":3,"useful":3,"cultural":3,"food":3},"items":[{"name":"","craft":"","origin_note":"","value":5,"supply":5,"kind":"useful"}]');
 if(todo.length)shape.push('"buyers":[{"ref":0,"name":"","type":"","line":"","demand":4,"savvy":3}]');
 parts.push("Return ONLY valid JSON, with no markdown: {"+shape.join(",")+"}");
 return parts.join("\n\n");
}

function passingDealer(){return{name:'A passing dealer',type:'dealer',line:'Takes a look, shrugs, and makes an offer.',demand:4,savvy:3}}

function mkBuyer(b){return{name:String(b.name||'A buyer').slice(0,60),type:String(b.type||'dealer').slice(0,20),line:String(b.line||'').slice(0,300),demand:mkClamp(b.demand,4),savvy:Math.min(5,Math.max(1,Math.round(Number(b.savvy)||3)))}}

function mkApply(j,needStall,todo){
 var m=mkMarket();
 if(needStall){
  var w=j.weights||{},weights={};MK_KINDS.forEach(function(k){weights[k]=Math.min(5,Math.max(1,Math.round(Number(w[k])||3)))});
  var list=(j.items||[]).slice(0,5);if(!list.length)throw new Error('no items');
  m.profile={character:String(j.character||'').slice(0,120),weights:weights};
  m.stall=list.map(function(x,i){var id='d'+mkDayNo()+'i'+i;var item={name:String(x.name||'Unnamed').slice(0,60),craft:String(x.craft||'').slice(0,90),origin:String(x.origin_note||'').slice(0,120),value:mkClamp(x.value,5),supply:mkClamp(x.supply,5),kind:MK_KINDS.indexOf(x.kind)>=0?x.kind:'useful',id:id};item.ask=Math.round(mkBuy(item.value,item.supply)*mkRoll(0.95,1.05,mkSeed(),mkCity(),mkDayNo(),id,'ask'));return item});
 }
 var byRef={};(j.buyers||[]).forEach(function(b){byRef[String(b.ref)]=b});
 todo.forEach(function(x){var b=byRef[String(x.uid)];x.buyer=b?mkBuyer(b):passingDealer()});
}

function mkFallback(needStall,todo){
 var m=mkMarket();
 if(needStall){m.profile=MK_BAND_NEUTRAL;m.stall=mkDemoStock().map(function(x,i){var id='d'+mkDayNo()+'i'+i;return Object.assign({},x,{id:id,ask:Math.round(mkBuy(x.value,x.supply)*mkRoll(0.95,1.05,mkSeed(),mkCity(),mkDayNo(),id,'ask'))})})}
 todo.forEach(function(x){if(!x.buyer)x.buyer=passingDealer()});
}

function restVisit(){
 visitPlace(S.loc,"merchant");
 var m=mkMarket();S.camp.marketOpen=true;
 var needStall=!m.stall,todo=S.camp.pack.filter(function(x){return!x.buyer});
 if(m.finding||(!needStall&&!todo.length)){render();return}
 m.finding=true;render();busyStart("Asking around the market\u2026");
 var pre=MK_PRE&&needStall&&MK_PRE.key===mkCacheKey()&&todo.every(function(x){return MK_PRE.uids.indexOf(x.uid)>=0})?MK_PRE.promise:null;
 MK_PRE=null;
 (pre||mkAsk(mkVisitPrompt(needStall,todo)))
  .then(function(j){mkApply(j,needStall,todo)})
  .catch(function(){mkFallback(needStall,todo)})
  .then(function(){m.finding=false;busyEnd();render()});
}

function mkDemoStock(){return[
 {name:"Hand-thrown clay vessel",craft:"Local potter's workshop",origin:"Clay from the nearby hills, a long tradition",value:3,supply:9,kind:"useful"},
 {name:"Aged local olive oil",craft:"Family press",origin:"Pressed from groves outside the old walls",value:5,supply:6,kind:"food"},
 {name:"Hand-woven textile",craft:"Weaver's cooperative",origin:"A pattern unique to this town's looms",value:8,supply:2,kind:"cultural"}]}

function restBuyAt(i){
 var m=mkMarket(),x=m.stall&&m.stall[i];
 if(!x||S.cash<x.ask||S.camp.pack.length>=MK_CAP)return;
 S.cash-=x.ask;
 S.camp.pack.push(Object.assign({},x,{uid:S.camp.nextUid=(S.camp.nextUid||0)+1,boughtIn:mkCity(),buyer:null}));
 say("Bought "+x.name+" in "+mkCity()+" for "+mkGbp(x.ask)+".");render();
}

// The offer: the town's view of the item, moved by what the town wants from its profile, with a roll narrowed by savvy
function restEffDemand(x){var m=mkMarket(),b=x.buyer||{demand:4},w=((m.profile||MK_BAND_NEUTRAL).weights||{})[x.kind]||3;return Math.min(10,Math.max(1,b.demand+Math.round(w-3)))}

function restOffer(x){
 var b=x.buyer||{savvy:3},base=mkSell(x.value,restEffDemand(x)),width=0.36-0.06*b.savvy,
  r=mkRoll(-1,1,mkSeed(),mkCity(),mkDayNo(),x.id||x.uid,"offer"),key=mkCity()+"|"+x.name,
  repeat=Math.max(0.5,1-0.15*((S.camp.sales||{})[key]||0));
 return Math.max(5,Math.round(base*(1+width*r)*repeat))
}

function restSell(uid){
 var i=S.camp.pack.findIndex(function(p){return p.uid===uid});if(i<0)return;
 var x=S.camp.pack[i],price=restOffer(x);
 S.camp.pack.splice(i,1);S.cash+=price;
 if(price>=2*x.ask)unlockAch("profiteer");S.camp.sales=S.camp.sales||{};var key=mkCity()+"|"+x.name;S.camp.sales[key]=(S.camp.sales[key]||0)+1;
 say("Sold "+x.name+" in "+mkCity()+" to "+(x.buyer?x.buyer.name:"a buyer")+" for "+mkGbp(price)+" (paid "+mkGbp(x.ask)+").");render();
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
 var h="<div class='panel'><div class='row' style='justify-content:space-between;align-items:center'><h2>Travel agent</h2><button class='alt' onclick='agentClose()'>Close</button></div>";
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
 var h="<div class='panel'><div class='row' style='justify-content:space-between;align-items:center'><h2>Goods for trade ("+S.camp.pack.length+"/"+MK_CAP+")</h2><button class='alt' onclick='restCloseMarket()'>Close</button></div>";
 if(!S.camp.pack.length)h+="<p class='mute mb8'>Nothing to sell yet. Buy local goods below.</p>";
 else h+=packSellHtml();
 if(unsold&&!busy)h+="<div class='row mt10'><button class='btn alt' onclick='restVisit()'>Find buyers for my pack</button></div>";
 h+="</div><div class='panel'><h2>Buy local goods</h2>";
 if(!m.stall)h+="<p class='mute'>"+(busy?"<span class='spin inline'></span>Asking around the market\u2026":"The market is closed today.")+"</p>";
 else{
  var full=S.camp.pack.length>=MK_CAP;
  h+="<p class='mute mb8'>"+esc(m.profile&&m.profile.character?m.profile.character:"")+"</p>";
  h+="<div class='mgrid'>"+m.stall.map(function(x,i){
   var owned=S.camp.pack.some(function(p){return p.id===x.id}),can=!owned&&!full&&S.cash>=x.ask;
   return"<div class='mcard'><b>"+esc(x.name)+"</b><div class='mute fine'>"+esc(x.craft)+"</div><div class='mute fine'><em>"+esc(x.origin)+"</em></div>"+
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
  var buyer=x.buyer?"<div class='buyer'><b>"+esc(x.buyer.name)+"</b> ("+esc(x.buyer.type)+"): "+esc(x.buyer.line)+"<div class='mt4'>Demand here <b>"+dm+"</b> "+mkPips(dm)+" \u00b7 savvy "+x.buyer.savvy+"/5</div></div>":"<div class='mute fine'>No buyer found yet.</div>";
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
function thingsHtml(){
 var q=function(s){return encodeURIComponent(s).replace(/%20/g,"+")},c=q(N[S.loc].n);
 var items=[
  ["Discover the local music scene","Acts across traditional, mainstream and experimental music.","https://www.google.com/search?q=tell+me+about+the+music+scene+in+"+c+".+Give+me+examples+of+acts+covering+traditional%2C+mainstream+and+contemporary+%2F+experimental+music"],
  ["Discover the local sports scene","Traditional, mainstream and local sports.","https://www.google.com/search?q=tell+me+about+the+sports+scene+in+"+c+".+Give+me+examples+covering+traditional%2C+mainstream+and+more+locally+unique+sports+where+applicable"],
  ["Paint a local street scene","Painting inspiration from the town.","https://www.google.com/search?q=give+me+painting+inspiration+from+"+c+""]
 ];
 items=items.filter(function(i){return thingOn(i[0])}).concat(customLinks(N[S.loc].n));
 if(!items.length)return "<div class='panel'><h2>Things to do</h2><p class='mute'>All the things to do links are turned off. Turn them back on in Settings.</p></div>";
 return "<div class='panel'><h2>Things to do</h2>"+items.map(function(i){return"<a class='btn' href='"+i[2]+"' target='_blank' rel='noopener'>"+esc(i[0])+"</a><p class='mute note'>"+esc(i[1])+"</p>"}).join("")+"</div>";
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

var MK_PRE=null;

function mkCacheKey(){return mkCity()+"|"+mkDayNo()}

// Start the market's stock and buyers for the pack as it stands, so the visit is ready when the player gets there
function prefetchMarket(){
 var todo=S.camp.pack.filter(function(x){return!x.buyer});
 var entry={key:mkCacheKey(),uids:todo.map(function(x){return x.uid}),promise:mkAsk(mkVisitPrompt(true,todo))};
 MK_PRE=entry;
 entry.promise.catch(function(){if(MK_PRE===entry)MK_PRE=null});
}


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
