const KEY = "shootbook-v1";
let shoots = load();
let currentView = "dashboard";

function load(){try{return JSON.parse(localStorage.getItem(KEY)||"[]")}catch{return []}}
function persist(){localStorage.setItem(KEY,JSON.stringify(shoots))}
const $ = id => document.getElementById(id);
const esc = s => String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const money = n => "$"+(Number(n||0)).toFixed(2);
const fmtDate = d => d ? new Date(d+"T12:00:00").toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"}) : "Date not set";
function setView(view){currentView=view;document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("active",b.dataset.view===view));render()}
document.querySelectorAll(".tab").forEach(b=>b.addEventListener("click",()=>setView(b.dataset.view)));
$("newShoot").onclick=()=>openForm();
$("closeModal").onclick=$("cancelForm").onclick=closeForm;
$("modal").addEventListener("click",e=>{if(e.target===$("modal"))closeForm()});

function openForm(s=null){
  $("shootForm").reset();$("shootId").value=s?.id||"";
  $("formTitle").textContent=s?"Edit photoshoot":"New photoshoot";
  ["title","date","time","type","status","client","contact","location","fee","paid","notes","shots","gear","inspiration"].forEach(k=>$(k).value=s?.[k]??({type:"Portrait",status:"Planning",paid:"Not paid"}[k]||""));
  $("modal").classList.add("open");
}
function closeForm(){$("modal").classList.remove("open")}
$("shootForm").onsubmit=e=>{
  e.preventDefault();
  const id=$("shootId").value||crypto.randomUUID();
  const item={id};
  ["title","date","time","type","status","client","contact","location","fee","paid","notes","shots","gear","inspiration"].forEach(k=>item[k]=$(k).value.trim());
  const i=shoots.findIndex(s=>s.id===id);if(i>=0)shoots[i]=item;else shoots.push(item);
  persist();closeForm();render();
};

function render(){
  const app=$("app");
  if(currentView==="dashboard"){
    const upcoming=shoots.filter(s=>s.date && s.date>=new Date().toISOString().slice(0,10) && s.status!=="Completed" && s.status!=="Delivered").sort((a,b)=>a.date.localeCompare(b.date));
    const unpaid=shoots.filter(s=>s.paid!=="Paid in full"&&s.paid!=="No charge").reduce((n,s)=>n+Number(s.fee||0),0);
    app.innerHTML=`<section class="hero"><h2>Make every shot count.</h2><p>Your sessions, clients, gear and creative ideas — all in one place.</p></section>
      <div class="stats"><div class="stat"><strong>${upcoming.length}</strong><span>Upcoming shoots</span></div><div class="stat"><strong>${shoots.filter(s=>s.status==="Completed"||s.status==="Delivered").length}</strong><span>Completed</span></div><div class="stat"><strong>${money(unpaid)}</strong><span>Outstanding total*</span></div></div>
      <div class="sectionhead"><h2>Coming up</h2><button class="btn small" onclick="setView('shoots')">View all</button></div>
      ${upcoming.length?`<div class="shoots">${upcoming.slice(0,4).map(card).join("")}</div>`:`<div class="empty">No upcoming shoots yet.<br><br><button class="btn primary" onclick="openForm()">＋ Add your first shoot</button></div>`}
      <p class="muted" style="font-size:11px;margin-top:12px">*Based on shoot prices not marked Paid in full or No charge. Adjust deposits manually in each shoot.</p>`;
  } else if(currentView==="shoots"){
    app.innerHTML=`<div class="sectionhead"><h2>All photoshoots (${shoots.length})</h2><button class="btn primary small" onclick="openForm()">＋ Add shoot</button></div>
      <div class="toolbar"><input id="search" placeholder="Search shoots, clients or locations..."><select id="filter" style="max-width:160px"><option value="">All statuses</option><option>Planning</option><option>Scheduled</option><option>Completed</option><option>Delivered</option></select></div><div id="shootResults"></div>`;
    const update=()=>{const q=$("search").value.toLowerCase(),f=$("filter").value;const found=shoots.filter(s=>(!f||s.status===f)&&[s.title,s.client,s.location,s.type].join(" ").toLowerCase().includes(q)).sort((a,b)=>(a.date||"").localeCompare(b.date||""));$("shootResults").innerHTML=found.length?`<div class="shoots">${found.map(card).join("")}</div>`:`<div class="empty">No matching shoots found.</div>`};
    $("search").oninput=update;$("filter").onchange=update;update();
  } else {
    app.innerHTML=`<div class="card"><h2>Backup & settings</h2><p class="muted">Your ShootBook data is stored in this browser on this device. Export a backup regularly, especially before clearing browser data or changing phones.</p><div class="actions" style="justify-content:flex-start"><button class="btn primary" onclick="exportData()">Download backup</button><label class="btn" style="margin:0">Import backup<input id="importFile" type="file" accept="application/json" hidden onchange="importData(event)"></label></div><hr style="border-color:var(--line);margin:20px 0"><h3>Storage note</h3><p class="muted">This first version stores shoot details and reference links locally. It does not upload your data to a server. If you uninstall the app, clear browser data, or switch devices, restore from a backup. Reference links need an internet connection. Weather also needs internet access.</p><p class="muted">Weather lookup uses Open-Meteo when you enter a location in a shoot. It is optional and requires internet access.</p></div>`;
  }
}
function card(s){return `<article class="shoot-card"><div class="meta">${esc(fmtDate(s.date))}${s.time?" · "+esc(s.time):""} · ${esc(s.type)}</div><h3>${esc(s.title)}</h3><div class="meta">${esc(s.client||"No client")} ${s.location?"· "+esc(s.location):""}</div><span class="pill">${esc(s.status)}</span><div class="actions" style="justify-content:flex-start"><button class="btn small" onclick="viewShoot('${s.id}')">Open details</button><button class="btn small" onclick="editShoot('${s.id}')">Edit</button></div></article>`}
function editShoot(id){openForm(shoots.find(s=>s.id===id))}
function viewShoot(id){
 const s=shoots.find(x=>x.id===id);if(!s)return;
 const lines=(v)=>String(v||"").split("\n").filter(Boolean);
 const links=lines(s.inspiration).map(u=>`<div><a href="${esc(u)}" target="_blank" rel="noopener" style="color:var(--accent);overflow-wrap:anywhere">${esc(u)}</a></div>`).join("")||"None added";
 const checklist=(arr)=>arr.length?arr.map((v,i)=>`<label class="checkrow"><input type="checkbox"> ${esc(v)}</label>`).join(""):"None added";
 const panel=document.createElement("div");panel.className="modal open";panel.innerHTML=`<section class="dialog"><div class="dialoghead"><h2>${esc(s.title)}</h2><button class="btn small" onclick="this.closest('.modal').remove()">✕</button></div><div class="detail-list" style="margin-top:15px">
 <div class="detail-row"><b>DATE & LOCATION</b>${esc(fmtDate(s.date))} ${esc(s.time||"")}<br>${esc(s.location||"Location not set")}</div>
 <div class="detail-row"><b>CLIENT</b>${esc(s.client||"Not set")}<br>${esc(s.contact||"No contact details")}</div>
 <div class="detail-row"><b>STATUS & PAYMENT</b>${esc(s.status)} · ${esc(s.paid)}<br>${money(s.fee)}</div>
 <div class="detail-row"><b>NOTES</b>${esc(s.notes||"No notes")}</div>
 <div class="detail-row"><b>SHOT LIST</b>${checklist(lines(s.shots))}</div>
 <div class="detail-row"><b>EQUIPMENT CHECKLIST</b>${checklist(lines(s.gear))}</div>
 <div class="detail-row"><b>INSPIRATION</b>${links}</div>
 <div class="detail-row"><b>WEATHER</b><input id="weatherPlace" placeholder="Enter city or ZIP code" value="${esc(s.location||"")}"><button class="btn small" style="margin-top:8px" onclick="getWeather(this)">Check forecast</button><div class="weather" hidden></div></div>
 </div><div class="actions"><button class="btn danger" onclick="if(confirm('Delete this photoshoot?')){deleteShoot('${s.id}');this.closest('.modal').remove()}">Delete</button><button class="btn primary" onclick="this.closest('.modal').remove();editShoot('${s.id}')">Edit shoot</button></div></section>`;
 document.body.appendChild(panel);panel.addEventListener("click",e=>{if(e.target===panel)panel.remove()});
}
function deleteShoot(id){shoots=shoots.filter(s=>s.id!==id);persist();render()}
async function getWeather(btn){
 const box=btn.nextElementSibling,place=btn.previousElementSibling.value.trim();if(!place){box.hidden=false;box.textContent="Enter a city or ZIP code first.";return}
 box.hidden=false;box.textContent="Loading forecast...";
 try{
  const g=await fetch("https://geocoding-api.open-meteo.com/v1/search?name="+encodeURIComponent(place)+"&count=1&language=en&format=json").then(r=>r.json());
  if(!g.results?.length)throw Error("Location not found.");
  const p=g.results[0],w=await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${p.latitude}&longitude=${p.longitude}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=3`).then(r=>r.json());
  box.innerHTML=`<b>${esc(p.name)}, ${esc(p.admin1||p.country||"")}</b><br>`+w.daily.time.map((d,i)=>`${new Date(d+"T12:00:00").toLocaleDateString(undefined,{weekday:"short",month:"short",day:"numeric"})}: ${w.daily.temperature_2m_min[i]}°–${w.daily.temperature_2m_max[i]}°C · Rain chance ${w.daily.precipitation_probability_max[i]}%`).join("<br>")+"<br><small>Forecast may change. Check again near shoot day.</small>";
 }catch(e){box.textContent=e.message||"Could not load weather. Check your connection."}
}
function exportData(){const blob=new Blob([JSON.stringify({app:"ShootBook",version:1,shoots},null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="shootbook-backup.json";a.click();URL.revokeObjectURL(a.href)}
function importData(e){const file=e.target.files[0];if(!file)return;const r=new FileReader();r.onload=()=>{try{const data=JSON.parse(r.result);if(!Array.isArray(data.shoots))throw Error();if(confirm("Replace your current ShootBook data with this backup?")){shoots=data.shoots;persist();render();alert("Backup restored.")}}catch{alert("That file doesn't look like a valid ShootBook backup.")}};r.readAsText(file)}
render();
if("serviceWorker" in navigator && location.protocol.startsWith("http"))navigator.serviceWorker.register("./sw.js").catch(()=>{});
