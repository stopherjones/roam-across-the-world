// Classic itineraries: fixed routes that play like a campaign, with a set start and finish.
// stops: the checkpoints in order (each one ends a leg).
// seg[s]: number of interim stops on the leg that ends at stops[s].
// ITIN_CANDS: for each leg, one shortlist per interim stop. The player picks from the shortlist on time;
// otherwise an interim stop is drawn at random from it. Interim stops are checkpoints too.
var ITIN_CANDS={
 "lon>ath":[["muc","zrh","str","mil","vie","ven"]],
 "ath>bak":[["ank","alp"]],
 "tsh>sha":[["del","lhe","isl"],["ktm","ccu","dac"],["ctu","ckg","xia"]],
 "sha>pnh":[["hkg","mfm","han"]],
 "anc>lax":[["van","sea"]],
 "lax>mex":[["dal"]],
 "mex>pty":[["ssv","sps","tgu"]],
 "pty>lpb":[["uio","bog","lma"]],
 "lpb>rio":[["bsa"]],
 "rio>cba":[["asu"]],
 "lon>cai":[["tur","mil","ven"]],
 "cai>bom":[["bgd","teh"]],
 "ccu>hkg":[["vte","han"]],
 "hkg>yok":[["tao","pyg","sel"]],
 "sfo>nyc":[["dal","dnv"],["cle","yyz","dca"]]
};
var ITINERARIES=[
 {id:"series1",title:"London to Singapore",
  sub:"The route of the first Race Across the World series, calling at Athens, Baku, Tashkent, Shanghai and Phnom Penh.",
  stops:["lon","ath","bak","tsh","sha","pnh","sin"],seg:[0,1,1,0,3,1,0]},
 {id:"series2",title:"Anchorage to Ushuaia",
  sub:"The route of the second series, extended through the USA and Canada, calling at Los Angeles, Mexico City, Panama City, La Paz, Rio de Janeiro and Cordoba.",
  stops:["anc","lax","mex","pty","lpb","rio","cba","ush"],seg:[0,1,1,1,1,1,1,0]},
 {id:"fogg",title:"London to London",
  sub:"Phileas Fogg's circumnavigation, calling at Cairo, Mumbai, Kolkata, Hong Kong, Yokohama, San Francisco and New York.",
  stops:["lon","cai","bom","ccu","hkg","yok","lax","sfo","nyc","mia","lon"],seg:[0,1,1,0,1,1,0,0,2,0,0]}
];
var ITIN_PICK=false;
// The shortlist for the interim stop that is next on the current leg (not visited yet)
function itinOptions(it,visited){
 var n=it.seg[it.s],k=n-it.left,pool=(it.cands&&it.cands[it.s]&&it.cands[it.s][k])||[];
 return pool.filter(function(i){return visited.indexOf(i)<0&&placeOf(i)});
}
// Decide the next leg's destination, and move the itinerary on. Mutates it.
function itinTake(it,from,chosen,visited){
 var target=it.stops[it.s];
 if(!target)return null;
 if(it.left>0){
  var opts=itinOptions(it,visited);
  var pick=(chosen&&opts.indexOf(chosen)>=0)?chosen:(opts.length?opts[Math.floor(Math.random()*opts.length)]:null);
  if(pick){it.left--;return pick}
  it.left=0; // nothing left on the shortlist: go straight to the checkpoint
 }
 it.s++;
 it.left=it.s<it.stops.length?it.seg[it.s]:0;
 return target;
}
// The itinerary has reached its final checkpoint
function itinComplete(){var it=S&&S.camp&&S.camp.itin;return!!it&&it.s>=it.stops.length&&S.loc===it.stops[it.stops.length-1]}
function itinStart(id){
 var I=ITINERARIES.filter(function(x){return x.id===id})[0];if(!I)return;
 var cands=I.stops.map(function(s,i){return i===0?[]:(ITIN_CANDS[I.stops[i-1]+">"+s]||[])});
 var it={id:I.id,title:I.title,stops:I.stops.slice(),seg:I.seg.slice(),cands:cands,s:1,left:I.seg[1]||0};
 var from=I.stops[0],to=itinTake(it,from,null,[]);
 var camp={ach:{},countries:[],continents:[],waited:0,visited:[],heard:{},income:0,money:250,legs:1,start:0,log:[],dirs:[],paid:[],pack:[],seed:(Math.random()*1e9)|0,sales:{},seen:{},nextUid:0,itin:it};
 var lm={on:true,clue:"off",level:"mixed",plan:true};
 ITIN_PICK=false;activePanel="play";
 return startJourney(from,to,false,true,lm,camp).then(function(ok){if(ok)return render();S=null;return render("No route found for this itinerary.")},function(err){S=null;return render("Could not load the map: "+(err&&err.message||err))});
}
function itinPickToggle(){ITIN_PICK=!ITIN_PICK;render()}
function itinPickHtml(){
 var rows=ITINERARIES.map(function(I){return"<div class='panel'><h3>"+esc(I.title)+"</h3><p class='mute mb8'>"+esc(I.sub)+"</p><button class='btn' onclick='itinStart(\""+I.id+"\")'>Start journey</button></div>"}).join("");
 return"<div class='panel'><h2>Classic itineraries</h2><p class='mute mb10'>Fixed routes with a set start and finish. They play like a campaign and start with £250. Achievements do not count.</p><button class='link' onclick='itinPickToggle()'>Back</button></div>"+rows;
}
