// Achievements: campaign-wide, so they carry over from leg to leg and are kept in the save file.
var ACHIEVEMENTS=[
 {id:"countries",name:"Countries",desc:"Visit 10 different countries."},
 {id:"continents",name:"Continents",desc:"Visit 5 of the 6 inhabited continents."},
 {id:"pinpoint",name:"Pinpoint accuracy",desc:"Lock in a destination guess that is 0 km off."},
 {id:"checkout",name:"Check It Out",desc:"Lose 0 minutes on a checkpoint challenge."},
 {id:"history",name:"History Buff",desc:"Get full marks in a City Timeline."},
 {id:"globe",name:"Globe Trotter",desc:"Visit all six continents."},
 {id:"welltraveled",name:"Well Traveled",desc:"Visit every country in the game."},
 {id:"completer",name:"Completer Finisher",desc:"Visit every main destination."},
 {id:"profiteer",name:"Profiteering",desc:"Sell a good for at least double what you paid."},
 {id:"timewaster",name:"Time waster",desc:"Spend 12 hours waiting for services in one campaign."},
 {id:"late",name:"Better late than never",desc:"Finish a leg after the target time."}
];
// Which continent each region belongs to. Islands are placed with their nearest mainland.
var CONTINENT_OF={"uk":"Europe","fr":"Europe","benelux":"Europe","de":"Europe","alps-it":"Europe","es":"Europe","scandinavia":"Europe","east":"Europe","balkans":"Europe","greece":"Europe","baltic":"Europe","eastern-europe":"Europe","north-atlantic":"Europe",
 "north-africa":"Africa","west-africa":"Africa","sahel":"Africa","west-africa-coast":"Africa","east-africa":"Africa","central-africa":"Africa","southern-africa":"Africa","upper-guinea":"Africa","egypt-libya":"Africa","indian-ocean-islands":"Africa","atlantic-islands":"Africa",
 "turkey":"Asia","caucasus":"Asia","levant":"Asia","iraq":"Asia","iran":"Asia","gulf":"Asia","central-asia":"Asia","afghanistan":"Asia","pakistan":"Asia","india":"Asia","sri-lanka":"Asia","mainland-se-asia":"Asia","bhutan":"Asia","china":"Asia","taiwan":"Asia","mongolia":"Asia","siberia":"Asia","indonesia":"Asia","philippines":"Asia","malaysia-singapore":"Asia","timor":"Asia","korea":"Asia","japan":"Asia",
 "png":"Oceania","australia":"Oceania","new-zealand":"Oceania","pacific-islands":"Oceania","micronesia":"Oceania","hawaii":"Oceania",
 "canada":"North America","usa":"North America","mexico":"North America","central-america":"North America","caribbean-greater":"North America","caribbean-lesser":"North America",
 "sa-north":"South America","brazil":"South America","southern-cone":"South America"};
// Campaign achievement state, created when first needed (so older saves still load)
function campAch(){if(!S||!S.camp)return null;var c=S.camp;c.ach=c.ach||{};c.countries=c.countries||[];c.continents=c.continents||[];c.waited=c.waited||0;c.visited=c.visited||[];return c}
function unlockAch(id){
 var c=campAch();if(!c||c.tour||c.itin||c.ach[id])return;
 var a=ACHIEVEMENTS.filter(function(x){return x.id===id})[0];if(!a)return;
 c.ach[id]={at:clk(S.h)};
 say("Achievement unlocked: "+a.name+".");
 achToast(a.name);
}
// Countries that can be ticked off. Overseas territories (Mayotte, Puerto Rico, Hong Kong and so on) are left out.
// Taiwan is included by choice, though it is not a UN member.
var COUNTRY_LIST=["Afghanistan","Albania","Algeria","Andorra","Angola","Antigua and Barbuda","Argentina","Armenia","Australia","Austria","Azerbaijan","Bahamas","Bahrain","Bangladesh","Barbados","Belarus","Belgium","Belize","Benin","Bhutan","Bolivia","Bosnia and Herzegovina","Botswana","Brazil","Brunei","Bulgaria","Burkina Faso","Burundi","Cambodia","Cameroon","Canada","Cape Verde","Central African Republic","Chad","Chile","China","Colombia","Comoros","Congo","Costa Rica","Croatia","Cuba","Cyprus","Czechia","Democratic Republic of the Congo","Denmark","Djibouti","Dominica","Dominican Republic","Ecuador","Egypt","El Salvador","Equatorial Guinea","Eritrea","Estonia","Eswatini","Ethiopia","Fiji","Finland","France","Gabon","Gambia","Georgia","Germany","Ghana","Greece","Grenada","Guatemala","Guinea","Guinea-Bissau","Guyana","Haiti","Honduras","Hungary","Iceland","India","Indonesia","Iran","Iraq","Ireland","Israel","Italy","Ivory Coast","Jamaica","Japan","Jordan","Kazakhstan","Kenya","Kiribati","Kuwait","Kyrgyzstan","Laos","Latvia","Lebanon","Lesotho","Liberia","Libya","Liechtenstein","Lithuania","Luxembourg","Madagascar","Malawi","Malaysia","Maldives","Mali","Malta","Marshall Islands","Mauritania","Mauritius","Mexico","Micronesia","Moldova","Monaco","Mongolia","Montenegro","Morocco","Mozambique","Myanmar","Namibia","Nauru","Nepal","Netherlands","New Zealand","Nicaragua","Niger","Nigeria","North Korea","North Macedonia","Norway","Oman","Pakistan","Palau","Palestine","Panama","Papua New Guinea","Paraguay","Peru","Philippines","Poland","Portugal","Qatar","Romania","Russia","Rwanda","Saint Kitts and Nevis","Saint Lucia","Saint Vincent and the Grenadines","Samoa","San Marino","Sao Tome and Principe","Saudi Arabia","Senegal","Serbia","Seychelles","Sierra Leone","Singapore","Slovakia","Slovenia","Solomon Islands","Somalia","South Africa","South Korea","South Sudan","Spain","Sri Lanka","Sudan","Suriname","Sweden","Switzerland","Syria","Taiwan","Tajikistan","Tanzania","Thailand","Timor-Leste","Togo","Tonga","Trinidad and Tobago","Tunisia","Turkey","Turkmenistan","Tuvalu","Uganda","Ukraine","United Arab Emirates","United Kingdom","United States","Uruguay","Uzbekistan","Vanuatu","Vatican City","Venezuela","Vietnam","Yemen","Zambia","Zimbabwe","Kosovo"];
// Where a visit can come from. Set a source to false to stop it ticking a country. Travel agent visits never count.
var VISIT_SOURCES={start:true,rest:true,cruise:true,merchant:true,timeline:true,checkpoint:true};
// Records a visit to a place. Only a campaign start, a rest day, a cruise stop, the market or a finished City Timeline
// count. Passing through on a journey, including changing trains, does not.
function visitPlace(id,src){
 var c=campAch();if(!c||!N[id]||!VISIT_SOURCES[src])return;
 if(c.tour){tourVisit(id);return}
 var cc=PLACE_COUNTRY[id];if(cc&&COUNTRY_LIST.indexOf(cc)>=0&&c.countries.indexOf(cc)<0)c.countries.push(cc);
 var cont=CONTINENT_OF[regionOf(id)];if(cont&&c.continents.indexOf(cont)<0)c.continents.push(cont);
 if(c.visited.indexOf(id)<0)c.visited.push(id);
 if(countriesVisited(c)>=10)unlockAch("countries");
 if(c.continents.length>=5)unlockAch("continents");
 checkCollections(c);
}
function countriesVisited(c){return COUNTRY_LIST.filter(function(k){return ticked(c,k)}).length}
function ticked(c,k){return c.countries.indexOf(k)>=0||(typeof TOUR_COUNTRIES!=="undefined"&&TOUR_COUNTRIES.indexOf(k)>=0)}
// Collection achievements: every continent, every country in the data, every main destination
function checkCollections(c){
 var conts={};Object.keys(CONTINENT_OF).forEach(function(r){conts[CONTINENT_OF[r]]=1});
 if(Object.keys(conts).every(function(k){return c.continents.indexOf(k)>=0}))unlockAch("globe");
 if(COUNTRY_LIST.every(function(k){return c.countries.indexOf(k)>=0}))unlockAch("welltraveled");
 var mains=gazetteer().filter(gzCity).map(function(g){return g.id});
 if(mains.length&&mains.every(function(id){return c.visited.indexOf(id)>=0}))unlockAch("completer");
}
// Full marks in a City Timeline: every card placed correctly first time
function timelineFullMarks(pts,max){var c=campAch();if(c&&max&&pts>=max)unlockAch("history")}
function achToast(name){
 var el=document.createElement("div");el.className="toast";el.setAttribute("role","status");el.textContent="Achievement unlocked: "+name;
 document.body.appendChild(el);setTimeout(function(){el.remove()},4000);
}
function achHtml(){
 var c=campAch();if(!c)return"";
 var n=ACHIEVEMENTS.filter(function(a){return c.ach[a.id]}).length;
 return"<div class='panel'><h2>Achievements ("+n+"/"+ACHIEVEMENTS.length+")</h2><p><button class='btn alt' onclick='countriesToggle()'>Countries visited ("+countriesVisited(c)+"/"+COUNTRY_LIST.length+")</button></p><ul class='ach'>"+ACHIEVEMENTS.map(function(a){
  var got=c.ach[a.id];
  return"<li class='"+(got?"got":"")+"'><b>"+esc(a.name)+"</b> "+esc(a.desc)+(got?"<span class='mute'> Unlocked "+esc(got.at)+"</span>":"")+"</li>"
 }).join("")+"</ul></div>";
}

// Flag emoji for each country, from its ISO 3166 code. Shown as a stamp when visited, greyed out until then.
var COUNTRY_CODE={"Afghanistan":"AF","Albania":"AL","Algeria":"DZ","Andorra":"AD","Angola":"AO","Antigua and Barbuda":"AG","Argentina":"AR","Armenia":"AM","Australia":"AU","Austria":"AT","Azerbaijan":"AZ","Bahamas":"BS","Bahrain":"BH","Bangladesh":"BD","Barbados":"BB","Belarus":"BY","Belgium":"BE","Belize":"BZ","Benin":"BJ","Bhutan":"BT","Bolivia":"BO","Bosnia and Herzegovina":"BA","Botswana":"BW","Brazil":"BR","Brunei":"BN","Bulgaria":"BG","Burkina Faso":"BF","Burundi":"BI","Cambodia":"KH","Cameroon":"CM","Canada":"CA","Cape Verde":"CV","Central African Republic":"CF","Chad":"TD","Chile":"CL","China":"CN","Colombia":"CO","Comoros":"KM","Congo":"CG","Costa Rica":"CR","Croatia":"HR","Cuba":"CU","Cyprus":"CY","Czechia":"CZ","Democratic Republic of the Congo":"CD","Denmark":"DK","Djibouti":"DJ","Dominica":"DM","Dominican Republic":"DO","Ecuador":"EC","Egypt":"EG","El Salvador":"SV","Equatorial Guinea":"GQ","Eritrea":"ER","Estonia":"EE","Eswatini":"SZ","Ethiopia":"ET","Fiji":"FJ","Finland":"FI","France":"FR","Gabon":"GA","Gambia":"GM","Georgia":"GE","Germany":"DE","Ghana":"GH","Greece":"GR","Grenada":"GD","Guatemala":"GT","Guinea":"GN","Guinea-Bissau":"GW","Guyana":"GY","Haiti":"HT","Honduras":"HN","Hungary":"HU","Iceland":"IS","India":"IN","Indonesia":"ID","Iran":"IR","Iraq":"IQ","Ireland":"IE","Israel":"IL","Italy":"IT","Ivory Coast":"CI","Jamaica":"JM","Japan":"JP","Jordan":"JO","Kazakhstan":"KZ","Kenya":"KE","Kiribati":"KI","Kuwait":"KW","Kyrgyzstan":"KG","Laos":"LA","Latvia":"LV","Lebanon":"LB","Lesotho":"LS","Liberia":"LR","Libya":"LY","Liechtenstein":"LI","Lithuania":"LT","Luxembourg":"LU","Madagascar":"MG","Malawi":"MW","Malaysia":"MY","Maldives":"MV","Mali":"ML","Malta":"MT","Marshall Islands":"MH","Mauritania":"MR","Mauritius":"MU","Mexico":"MX","Micronesia":"FM","Moldova":"MD","Monaco":"MC","Mongolia":"MN","Montenegro":"ME","Morocco":"MA","Mozambique":"MZ","Myanmar":"MM","Namibia":"NA","Nauru":"NR","Nepal":"NP","Netherlands":"NL","New Zealand":"NZ","Nicaragua":"NI","Niger":"NE","Nigeria":"NG","North Korea":"KP","North Macedonia":"MK","Norway":"NO","Oman":"OM","Pakistan":"PK","Palau":"PW","Palestine":"PS","Panama":"PA","Papua New Guinea":"PG","Paraguay":"PY","Peru":"PE","Philippines":"PH","Poland":"PL","Portugal":"PT","Qatar":"QA","Romania":"RO","Russia":"RU","Rwanda":"RW","Saint Kitts and Nevis":"KN","Saint Lucia":"LC","Saint Vincent and the Grenadines":"VC","Samoa":"WS","San Marino":"SM","Sao Tome and Principe":"ST","Saudi Arabia":"SA","Senegal":"SN","Serbia":"RS","Seychelles":"SC","Sierra Leone":"SL","Singapore":"SG","Slovakia":"SK","Slovenia":"SI","Solomon Islands":"SB","Somalia":"SO","South Africa":"ZA","South Korea":"KR","South Sudan":"SS","Spain":"ES","Sri Lanka":"LK","Sudan":"SD","Suriname":"SR","Sweden":"SE","Switzerland":"CH","Syria":"SY","Taiwan":"TW","Tajikistan":"TJ","Tanzania":"TZ","Thailand":"TH","Timor-Leste":"TL","Togo":"TG","Tonga":"TO","Trinidad and Tobago":"TT","Tunisia":"TN","Turkey":"TR","Turkmenistan":"TM","Tuvalu":"TV","Uganda":"UG","Ukraine":"UA","United Arab Emirates":"AE","United Kingdom":"GB","United States":"US","Uruguay":"UY","Uzbekistan":"UZ","Vanuatu":"VU","Vatican City":"VA","Venezuela":"VE","Vietnam":"VN","Yemen":"YE","Zambia":"ZM","Zimbabwe":"ZW","Kosovo":"XK"};
function flagOf(name){var c=COUNTRY_CODE[name];if(!c)return"";return String.fromCodePoint(127462+c.charCodeAt(0)-65,127462+c.charCodeAt(1)-65)}
function flagStamp(name,got){return"<span class='stamp"+(got?"":" empty")+"' aria-hidden='true'>"+flagOf(name)+"</span>"}
// Countries page: opened from the achievements button, in place of the journal
var COUNTRIES_VIEW=false;
function countriesToggle(){COUNTRIES_VIEW=!COUNTRIES_VIEW;render()}
function countriesPanelHtml(){
 var c=campAch()||{countries:[]};
 var list=COUNTRY_LIST.slice().sort(function(x,y){var gx=ticked(c,x),gy=ticked(c,y);if(gx!==gy)return gx?-1:1;return x.localeCompare(y)});
 var n=countriesVisited(c);
 return"<div class='panel'><h2>Countries visited ("+n+"/"+COUNTRY_LIST.length+")</h2><p class='mute'>A country counts once you rest there, visit its market, finish its City Timeline, stop on a cruise, or start a campaign there. Passing through on a journey does not count.</p><ul class='ach'>"+list.map(function(k){var g=ticked(c,k);return"<li class='"+(g?"got":"")+"'>"+flagStamp(k,g)+"<span>"+esc(k)+"</span></li>"}).join("")+"</ul><button class='link' onclick='countriesToggle()'>Back to achievements</button></div>";
}
