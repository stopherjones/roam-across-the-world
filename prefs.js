// Personal preferences. They apply to every campaign until changed, are kept in this browser,
// and are included in each save file so they follow you to another device.
var PREFS_KEY="ratw-prefs-v1";
var PREFS_DEFAULT={things:{music:true,sport:true,art:true},custom:[]};
var CUSTOM_MAX=5,CUSTOM_LABEL_MAX=40,CUSTOM_QUERY_MAX=120;
var CUSTOM_MSG="";
var THING_KEYS={"Discover the local music scene":"music","Discover the local sports scene":"sport","Paint a local street scene":"art"};
var THING_LABELS=[["music","Discover the local music scene"],["sport","Discover the local sports scene"],["art","Paint a local street scene"]];
var PREFS=prefsMerge(null);
var SETTINGS_OPEN=false;
// Fills in any missing or invalid setting from the default, so older saves and partial files still work
function prefsMerge(p){
 var o=JSON.parse(JSON.stringify(PREFS_DEFAULT));
 if(p&&typeof p==="object"&&p.things&&typeof p.things==="object"){
  Object.keys(o.things).forEach(function(k){if(typeof p.things[k]==="boolean")o.things[k]=p.things[k]});
 }
 if(p&&Array.isArray(p.custom)){
  o.custom=p.custom.filter(function(c){return c&&typeof c.label==="string"&&typeof c.query==="string"&&c.label.trim()&&c.query.trim()})
   .slice(0,CUSTOM_MAX).map(function(c){return{label:c.label.trim().slice(0,CUSTOM_LABEL_MAX),query:c.query.trim().slice(0,CUSTOM_QUERY_MAX)}});
 }
 return o;
}
function prefsLoad(){try{var r=localStorage.getItem(PREFS_KEY);if(r)PREFS=prefsMerge(JSON.parse(r))}catch(e){}}
function prefsSave(){try{localStorage.setItem(PREFS_KEY,JSON.stringify(PREFS))}catch(e){}}
// Whether a things-to-do link is on. Unknown links are always shown.
function thingOn(title){var k=THING_KEYS[title];return!k||PREFS.things[k]!==false}
// Your own links, as search links. {place} stands for the town.
function customLinks(city){
 return PREFS.custom.map(function(c){
  var q=c.query.indexOf("{place}")>=0?c.query.split("{place}").join(city):c.query+" in "+city;
  return[c.label,"Your own search link.","https://www.google.com/search?q="+encodeURIComponent(q)];
 });
}
function customAdd(){
 var l=(document.getElementById("customLabel").value||"").trim(),q=(document.getElementById("customQuery").value||"").trim();
 if(!l||!q){CUSTOM_MSG="Enter both a button text and a search.";return render()}
 if(PREFS.custom.length>=CUSTOM_MAX){CUSTOM_MSG="You can add up to "+CUSTOM_MAX+" links.";return render()}
 PREFS.custom.push({label:l.slice(0,CUSTOM_LABEL_MAX),query:q.slice(0,CUSTOM_QUERY_MAX)});
 CUSTOM_MSG="";prefsSave();render();
}
function customRemove(i){PREFS.custom.splice(i,1);CUSTOM_MSG="";prefsSave();render()}
function settingsToggle(){SETTINGS_OPEN=!SETTINGS_OPEN;render()}
function prefThing(k){PREFS.things[k]=!PREFS.things[k];prefsSave();render()}
function settingsHtml(){
 var rows=THING_LABELS.map(function(r){
  var on=PREFS.things[r[0]]!==false;
  return "<label class='pref'><input type='checkbox'"+(on?" checked":"")+" onclick=\"prefThing('"+r[0]+"')\"> "+esc(r[1])+"</label>";
 }).join("");
 return "<div class='panel'><h2>Settings</h2><p class='mute mb10'>The game encourages you to spend time researching the local area while waiting for your next departure and during rest days. By default these are set to research local sports, music and painting inspiration, but you can remove these and replace them with subjects that you are more interested in.</p>"+
  "<h3>Things to do</h3>"+rows+
  "<h3>Your own links</h3><p class='mute mb8'>Add up to "+CUSTOM_MAX+" search links of your own. Use {place} in the search to mean the town, for example: best cafes in {place}.</p>"+
  PREFS.custom.map(function(c,i){return"<div class='pref'>"+esc(c.label)+" <span class='mute'>("+esc(c.query)+")</span> <button class='link' onclick='customRemove("+i+")'>Remove</button></div>"}).join("")+
  (PREFS.custom.length<CUSTOM_MAX?"<div class='custom-form'><label>Button text<input id='customLabel' maxlength='"+CUSTOM_LABEL_MAX+"'></label><label>Search<input id='customQuery' maxlength='"+CUSTOM_QUERY_MAX+"' placeholder='best cafes in {place}'></label><button class='btn alt' onclick='customAdd()'>Add link</button></div>":"")+
  (CUSTOM_MSG?"<p class='mute'>"+esc(CUSTOM_MSG)+"</p>":"")+
  "<p><button class='link' onclick='settingsToggle()'>Back</button></p></div>";
}
prefsLoad();
