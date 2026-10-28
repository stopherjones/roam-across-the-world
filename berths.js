// Berths: cargo and cruise crossings the player books at a port, with no payment up front.
// Pure rules only. No UI, no game state. The game passes in the link list and the campaign clock.
//
// A lane is a route a berth can run. A sailing is one departure of a lane, listed once the player has heard of it.
// The player must be at the port by the departure time, with the fare, to board.
// There are no random cancellations: a sailing either leaves on time or does not exist for that player.
//
// Times are campaign hours (absH in game.js). "window" is how long after the player hears of a sailing it leaves.
var BERTH_LANES=[
 // Cruise 5: New Zealand and the Philippines, one-way in each direction, across the Pacific islands
 {id:"akl-dav-cruise",kind:"cruise",from:"akl",to:"dav",via:["tbu","apw","suv","fun","tws","maj","pnp","ror"],legH:[60,15,33,58,45,30,33,30,27],hours:331,fare:2600,window:96,oneWay:true},
 {id:"dav-akl-cruise",kind:"cruise",from:"dav",to:"akl",via:["ror","pnp","maj","tws","fun","suv","apw","tbu"],legH:[27,30,33,30,45,58,33,15,60],hours:331,fare:2600,window:96,oneWay:true},

 // Cruise 4: New Zealand and Australia, one-way in each direction, via Vanuatu and the Solomon Islands
 {id:"akl-cns-cruise",kind:"cruise",from:"akl",to:"cns",via:["vli","hiu"],legH:[60,33,85],hours:178,fare:1400,window:96,oneWay:true},
 {id:"cns-akl-cruise",kind:"cruise",from:"cns",to:"akl",via:["hiu","vli"],legH:[85,33,60],hours:178,fare:1400,window:96,oneWay:true},

 // Cruise 3: Venezuela and Puerto Rico, one-way in each direction, through the eastern Caribbean islands
 {id:"gur-sju-cruise",kind:"cruise",from:"gur",to:"sju",via:["pos","kgs","bdt","cstr","rsu","sjn","bst"],legH:[2,16,8,12,6,8,4,24],hours:80,fare:700,window:96,oneWay:true},
 {id:"sju-gur-cruise",kind:"cruise",from:"sju",to:"gur",via:["bst","sjn","rsu","cstr","bdt","kgs","pos"],legH:[24,4,8,6,12,8,16,2],hours:80,fare:700,window:96,oneWay:true},

 // Cruise 2: South Africa and Sri Lanka, one-way in each direction, via the Indian Ocean islands
 {id:"dbn-cmb-cruise",kind:"cruise",from:"dbn",to:"cmb",via:["mpl","ans","dzo","mor","svc","mle"],legH:[100,30,12,3,50,40,33],hours:268,fare:2200,window:96,oneWay:true},
 {id:"cmb-dbn-cruise",kind:"cruise",from:"cmb",to:"dbn",via:["mle","svc","mor","dzo","ans","mpl"],legH:[33,40,50,3,12,30,100],hours:268,fare:2200,window:96,oneWay:true},

 // Cruise 1: New York and Miami, via Bermuda and the Bahamas, in both directions (each returns to its start)
 {id:"nyc-mia-cruise",kind:"cruise",from:"nyc",to:"mia",via:["hmn","nas"],legH:[60,30,12],hours:102,fare:850,window:96,oneWay:true},
 {id:"mia-nyc-cruise",kind:"cruise",from:"mia",to:"nyc",via:["nas","hmn"],legH:[12,30,60],hours:102,fare:850,window:96,oneWay:true},

  // Africa, Caribbean and Asia: cargo crossings replacing ferries, and new routes
 {id:"lbv-sto-cargo",kind:"cargo",from:"lbv",to:"sto",via:[],hours:36,fare:90,window:48},
 {id:"bta-sto-cargo",kind:"cargo",from:"bta",to:"sto",via:[],hours:24,fare:60,window:48},
 {id:"hab-mia-cargo",kind:"cargo",from:"hab",to:"mia",via:[],hours:30,fare:100,window:48},
 {id:"hab-kgn-cargo",kind:"cargo",from:"hab",to:"kgn",via:[],hours:30,fare:90,window:48},
 {id:"kgn-pap-cargo",kind:"cargo",from:"kgn",to:"pap",via:[],hours:20,fare:70,window:48},
 {id:"scu-pap-cargo",kind:"cargo",from:"scu",to:"pap",via:[],hours:30,fare:80,window:48},
 {id:"scu-kgn-cargo",kind:"cargo",from:"scu",to:"kgn",via:[],hours:24,fare:70,window:48},
 {id:"hkg-mnl-cargo",kind:"cargo",from:"hkg",to:"mnl",via:[],hours:48,fare:130,window:48},

 // Australia and New Zealand: cargo or cruise only
 {id:"akl-syd-cargo", kind:"cargo", from:"akl",to:"syd",via:[],hours:84,fare:150,window:36},
 {id:"suv-akl-cargo", kind:"cargo", from:"suv",to:"akl",via:[],hours:78,fare:120,window:36},
 {id:"kpg-drw-cargo", kind:"cargo", from:"kpg",to:"drw",via:[],hours:72,fare:110,window:36},
 // Pacific: Japan and China to Los Angeles, calling at Honolulu (a call, not a stop)
 {id:"tyo-lax-cargo", kind:"cargo", from:"yok",to:"lax",via:["hnl"],legH:[175,125],hours:300,fare:330,window:48},
 {id:"sha-lax-cargo", kind:"cargo", from:"sha",to:"lax",via:["hnl"],legH:[205,125],hours:330,fare:320,window:48},
 // Honolulu to Majuro: berth only, acts as a rest day on board
 // Atlantic: UK and Spain to the Americas
 {id:"por-mia-cargo", kind:"cargo", from:"por",to:"mia",via:[],hours:300,fare:340,window:48},
 {id:"bil-rio-cargo", kind:"cargo", from:"bil",to:"rio",via:[],hours:360,fare:380,window:48},
 // Cruise: a luxury service that reaches places cargo does not. Dakar to Cape Verde, the cheaper of the three
 {id:"dak-pia-cruise",kind:"cruise",from:"dak",to:"pia",via:[],legH:[60],hours:60,fare:380,window:72},
 {id:"lis-pia-cruise",kind:"cruise",from:"lis",to:"pia",via:["pdl","fnc"],legH:[40,25,30],hours:95,fare:900,window:96},
 {id:"bcn-pia-cruise",kind:"cruise",from:"bcn",to:"pia",via:["lpg","tfs"],legH:[75,4,30],hours:109,fare:1000,window:96},
 {id:"bil-mia-cargo", kind:"cargo", from:"bil",to:"mia",via:[],hours:216,fare:260,window:48}
];

// Ports where the travel agent is open. Cities within BERTH_AGENT_HOPS hops of one of these get an agent.
var BERTH_PORTS=["gur","sju","dbn","cmb","nyc","sto","pap","mnl","lbv","bta","kgn","scu","hab","dav","kkb","hkg","sju","lis","bcn","dak","akl","syd","suv","kpg","drw","pom","cns","yok","sha","lax","hnl","maj","por","bil","mia","rio"];
var BERTH_AGENT_HOPS=3;

// Hops between two places over ground and ferry links, not air. links: [{a,b,m}]. Returns a map id -> hops.
function berthHops(links,from,maxHops){
 var adj={};
 links.forEach(function(e){if(e.m==="air"||e.berth)return;(adj[e.a]=adj[e.a]||[]).push(e.b);(adj[e.b]=adj[e.b]||[]).push(e.a)});
 var dist={};dist[from]=0;var q=[from];
 while(q.length){var n=q.shift();if(dist[n]>=maxHops)continue;(adj[n]||[]).forEach(function(m){if(dist[m]==null){dist[m]=dist[n]+1;q.push(m)}})}
 return dist;
}

// Is there a travel agent in this city? Only cities within the agent radius of a designated port.
function berthAgentIn(links,city){
 // A designated port always has an agent; other towns need one within the radius
 if(BERTH_PORTS.indexOf(city)>=0)return true;
 // A cruise stop has nothing to offer, so it has no agent
 if(BERTH_LANES.some(function(l){return l.kind==="cruise"&&(l.to===city||l.via.indexOf(city)>=0)}))return false;
 var near=berthHops(links,city,BERTH_AGENT_HOPS);
 return BERTH_PORTS.some(function(p){return near[p]!=null});
}

// Sailings the player knows about at a port: lanes out of that port that they have heard of, not yet gone.
// heard: {laneId: discoveredAtHour}. now: campaign hour.
function berthListing(port,heard,now){
 var out=[],tl=S&&S.camp&&S.camp.tourLane;
 if(tl){if(port!==tl.from||heard[tl.id]==null)return out;var d=heard[tl.id]+tl.window;if(now<=d)out.push({lane:tl,dep:d});return out}
 BERTH_LANES.forEach(function(l){
  if(l.from!==port||heard[l.id]==null)return;
  var dep=heard[l.id]+l.window;
  if(now>dep)return;
  out.push({lane:l,dep:dep});
 });
 return out;
}

// Can the player board this sailing now? Reason is shown to the player.
function berthCheck(sailing,now,cash){
 if(now>sailing.dep)return{ok:false,reason:"Missed the departure."};
 if(cash<sailing.lane.fare)return{ok:false,reason:"Not enough cash for the £"+sailing.lane.fare+" fare."};
 return{ok:true,reason:""};
}

// The crossing once boarded. The Honolulu call is shown as a rest day on board, never as a stop.
function berthTrip(sailing){
 var l=sailing.lane;
 return{arriveAt:sailing.dep+l.hours,calls:l.via.slice(),fare:l.fare,restOnBoard:l.via.length>0||l.rest===true};
}

// Cargo crossings run both ways: each cargo lane gets a return lane with the same time, fare and rest setting.
// Calls are made in reverse order on the way back. Cruises already return on their own route.
BERTH_LANES.slice().forEach(function(l){
  if(l.kind!=="cargo")return;
  BERTH_LANES.push({id:l.id+"-return",kind:"cargo",from:l.to,to:l.from,via:l.via.slice().reverse(),
    hours:l.hours,fare:l.fare,window:l.window,rest:l.rest,legH:l.legH?l.legH.slice().reverse():undefined});
});

if(typeof module!=="undefined")module.exports={BERTH_LANES,BERTH_PORTS,BERTH_AGENT_HOPS,berthHops,berthAgentIn,berthListing,berthCheck,berthTrip};
