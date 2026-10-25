// Weather for the current stop, from Open-Meteo. The game clock is treated as local time at the stop,
// so the header shows tomorrow's forecast for the hour the clock is at. One small request per stop,
// made the first time the stop is shown. Nothing waits for it: until the data arrives, the header is blank.
var WX=(function(){
 var API="https://api.open-meteo.com/v1/forecast";
 var RETRY_MS=5*60*1000;
 var cache={},busy={},failedAt={};

 function p2(n){return(n<10?"0":"")+n}
 function tomorrow(){var d=new Date();d.setDate(d.getDate()+1);return d.getFullYear()+"-"+p2(d.getMonth()+1)+"-"+p2(d.getDate())}

 // WMO weather code -> [day icon, night icon, text]
 function info(code,isDay){
  var d=isDay!==0,t=function(a,b,s){return{icon:d?a:b,text:s}};
  switch(code){
   case 0:return t("\u2600\uFE0F","\uD83C\uDF19","Clear");
   case 1:return t("\uD83C\uDF24\uFE0F","\uD83C\uDF19","Mainly clear");
   case 2:return t("\u26C5","\u2601\uFE0F","Partly cloudy");
   case 3:return t("\u2601\uFE0F","\u2601\uFE0F","Overcast");
   case 45:case 48:return t("\uD83C\uDF2B\uFE0F","\uD83C\uDF2B\uFE0F","Fog");
   case 51:case 53:case 55:return t("\uD83C\uDF26\uFE0F","\uD83C\uDF27\uFE0F","Drizzle");
   case 56:case 57:case 66:case 67:return t("\uD83C\uDF27\uFE0F","\uD83C\uDF27\uFE0F","Freezing rain");
   case 61:return t("\uD83C\uDF26\uFE0F","\uD83C\uDF27\uFE0F","Light rain");
   case 63:case 65:return t("\uD83C\uDF27\uFE0F","\uD83C\uDF27\uFE0F","Rain");
   case 71:case 73:case 75:case 77:case 85:case 86:return t("\uD83C\uDF28\uFE0F","\uD83C\uDF28\uFE0F","Snow");
   case 80:case 81:return t("\uD83C\uDF26\uFE0F","\uD83C\uDF27\uFE0F","Showers");
   case 82:return t("\uD83C\uDF27\uFE0F","\uD83C\uDF27\uFE0F","Heavy showers");
   case 95:case 96:case 99:return t("\u26C8\uFE0F","\u26C8\uFE0F","Thunderstorm");
   default:return null;
  }
 }

 // Hour of the day on the game clock at the current stop. Rest days use midday.
 function hourNow(){
  if(!S||S.phase==="rest")return 12;
  var t=(480+Math.round(absH(S.h)*60))%1440;
  return Math.floor(t/60);
 }

 // Put the header's weather back in place, if the stop it belongs to is still the current one
 function refresh(id){
  var el=document.getElementById("wx-now");
  if(el&&S&&S.loc===id)el.innerHTML=html();
 }

 function fetchStop(id){
  if(cache[id]||busy[id])return;
  if(failedAt[id]&&Date.now()-failedAt[id]<RETRY_MS)return;
  var g=N[id];if(!g)return;
  busy[id]=1;
  var day=tomorrow();
  var url=API+"?latitude="+g.la+"&longitude="+g.lo
   +"&hourly=temperature_2m,weather_code,is_day&timezone=auto&forecast_days=3";
  // Starts inside a promise so that a failing fetch never breaks the page render
  Promise.resolve().then(function(){return fetch(url)}).then(function(r){if(!r.ok)throw new Error("HTTP "+r.status);return r.json()}).then(function(j){
   var h=j.hourly,hours={};
   h.time.forEach(function(t,i){
    if(t.slice(0,10)===day)hours[+t.slice(11,13)]={t:h.temperature_2m[i],code:h.weather_code[i],day:h.is_day[i]};
   });
   if(!Object.keys(hours).length)throw new Error("no hours for "+day);
   cache[id]=hours;delete failedAt[id];
  }).catch(function(e){
   failedAt[id]=Date.now();
   console.warn("Weather unavailable for "+id+": "+(e&&e.message));
  }).then(function(){delete busy[id];refresh(id)});
 }

 // The header's weather for the current stop. Starts a fetch if the stop is not known yet.
 function html(){
  if(!S||!S.loc)return"";
  var id=S.loc;
  if(!cache[id]){fetchStop(id);return""}
  var w=cache[id][hourNow()];
  if(!w)return"";
  var k=info(w.code,w.day);
  if(!k)return"";
  return"<span class='wx' aria-label='"+k.text+", "+Math.round(w.t)+" degrees'>"+k.icon+" "+Math.round(w.t)+"\u00B0C</span>";
 }

 return{html:html};
})();
