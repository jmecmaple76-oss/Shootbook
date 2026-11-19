
const KEY = "shootbook-v1";
let shoots = load();
let currentView = "dashboard";

function load(){try{return JSON.parse(localStorage.getItem(KEY)||"[]")}catch{return []}}
function persist(){localStorage.setItem(KEY,JSON.stringify(shoots))}
const $ = id => document.getElementById(id);
const esc = s => String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const money = n => "$"+(Number(n||0)).toFixed(2);
const fmtDate = d => d ? new Date(d+"T12:00:00").toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"}) : "Date not set";

/* Photo files are stored separately in IndexedDB so localStorage stays small. */
const PHOTO_DB_NAME = "shootbook-photos";
const PHOTO_STORE = "photos";
function openPhotoDB(){
  return new Promise((resolve,reject)=>{
    if(!("indexedDB" in window)){reject(new Error("Photo storage is not supported by this browser."));return}
    const request=indexedDB.open(PHOTO_DB_NAME,1);
    request.onupgradeneeded=()=>{
      const db=request.result;
      if(!db.objectStoreNames.contains(PHOTO_STORE)){
        const store=db.createObjectStore(PHOTO_STORE,{keyPath:"id",autoIncrement:true});
        store.createIndex("shootId","shootId",{unique:false});
      }
    };
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error||new Error("Could not open photo storage."));
  });
}
async function saveShootPhoto(shootId,file){
  const db=await openPhotoDB();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(PHOTO_STORE,"readwrite");
    const request=tx.objectStore(PHOTO_STORE).add({
      shootId,
      name:file.name,
      type:file.type,
      createdAt:Date.now(),
      blob:file
    });
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error||new Error("Could not save this photo."));
    tx.oncomplete=()=>db.close();
    tx.onerror=()=>{db.close();reject(tx.error||new Error("Could not save this photo."))};
  });
}
async function getShootPhotos(shootId){
  const db=await openPhotoDB();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(PHOTO_STORE,"readonly");
    const request=tx.objectStore(PHOTO_STORE).index("shootId").getAll(shootId);
    request.onsuccess=()=>resolve(request.result||[]);
    request.onerror=()=>reject(request.error||new Error("Could not load photos."));
    tx.oncomplete=()=>db.close();
    tx.onerror=()=>{db.close();reject(tx.error||new Error("Could not load photos."))};
  });
}
async function deleteShootPhoto(photoId){
  const db=await openPhotoDB();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(PHOTO_STORE,"readwrite");
    tx.objectStore(PHOTO_STORE).delete(Number(photoId));
    tx.oncomplete=()=>{db.close();resolve()};
    tx.onerror=()=>{db.close();reject(tx.error||new Error("Could not delete photo."))};
  });
}
async function deleteAllShootPhotos(shootId){
  const photos=await getShootPhotos(shootId);
  for(const photo of photos) await deleteShootPhoto(photo.id);
}

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
    app.innerHTML=`<div class="card"><h2>Backup & settings</h2><p class="muted">Your ShootBook data is stored in this browser on this device. Export a backup regularly, especially before clearing browser data or changing phones.</p><div class="actions" style="justify-content:flex-start"><button class="btn primary" onclick="exportData()">Download backup</button><label class="btn" style="margin:0">Import backup<input id="importFile" type="file" accept="application/json" hidden onchange="importData(event)"></label></div><hr style="border-color:var(--line);margin:20px 0"><h3>Storage note</h3><p class="muted">Shoot details are stored locally in this browser. Uploaded photos are stored separately in this browser's IndexedDB. They are not uploaded to GitHub or a server. Export a data backup regularly; photo files are not yet included in the JSON backup. If you clear browser data or switch devices, photos may be lost.</p><p class="muted">Reference links need an internet connection. Weather also needs internet access. Weather lookup uses Open-Meteo when you enter a location in a shoot.</p></div>`;
  }
}
function card(s){return `<article class="shoot-card"><div class="meta">${esc(fmtDate(s.date))}${s.time?" · "+esc(s.time):""} · ${esc(s.type)}</div><h3>${esc(s.title)}</h3><div class="meta">${esc(s.client||"No client")} ${s.location?"· "+esc(s.location):""}</div><span class="pill">${esc(s.status)}</span><div class="actions" style="justify-content:flex-start"><button class="btn small" onclick="viewShoot('${s.id}')">Open details</button><button class="btn small" onclick="editShoot('${s.id}')">Edit</button></div></article>`}
function editShoot(id){openForm(shoots.find(s=>s.id===id))}
function viewShoot(id){
  const s=shoots.find(x=>x.id===id);if(!s)return;
  const lines=(v)=>String(v||"").split("\n").filter(Boolean);
  const links=lines(s.inspiration).map(u=>`<div><a href="${esc(u)}" target="_blank" rel="noopener" style="color:var(--accent);overflow-wrap:anywhere">${esc(u)}</a></div>`).join("")||"None added";
  const checklist=(arr)=>arr.length?arr.map((v)=>`<label class="checkrow"><input type="checkbox"> ${esc(v)}</label>`).join(""):"None added";
  const panel=document.createElement("div");panel.className="modal open";panel.innerHTML=`<section class="dialog"><div class="dialoghead"><h2>${esc(s.title)}</h2><button class="btn small" onclick="this.closest('.modal').remove()">✕</button></div><div class="detail-list" style="margin-top:15px">
  <div class="detail-row"><b>DATE & LOCATION</b>${esc(fmtDate(s.date))} ${esc(s.time||"")}<br>${esc(s.location||"Location not set")}</div>
  <div class="detail-row"><b>CLIENT</b>${esc(s.client||"Not set")}<br>${esc(s.contact||"No contact details")}</div>
  <div class="detail-row"><b>STATUS & PAYMENT</b>${esc(s.status)} · ${esc(s.paid)}<br>${money(s.fee)}</div>
  <div class="detail-row"><b>NOTES</b>${esc(s.notes||"No notes")}</div>
  <div class="detail-row"><b>SHOT LIST</b>${checklist(lines(s.shots))}</div>
  <div class="detail-row"><b>EQUIPMENT CHECKLIST</b>${checklist(lines(s.gear))}</div>
  <div class="detail-row"><b>INSPIRATION</b>${links}</div>
  <div class="detail-row"><b>PHOTO GALLERY</b><p class="muted" style="margin:6px 0 10px">Upload reference photos or pictures from this session. Photos stay in this browser on this device.</p><label class="btn small" style="display:inline-block;cursor:pointer">＋ Upload photos<input class="shoot-photo-input" type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple hidden></label><div class="shoot-photo-status muted" role="status" style="margin-top:8px"></div><div class="shoot-photo-gallery" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:10px;margin-top:12px"></div></div>
  <div class="detail-row"><b>WEATHER</b><input id="weatherPlace" placeholder="Enter city or ZIP code" value="${esc(s.location||"")}"><button class="btn small" style="margin-top:8px" onclick="getWeather(this)">Check forecast</button><div class="weather" hidden></div></div>
  </div><div class="actions"><button class="btn danger" onclick="if(confirm('Delete this photoshoot?')){deleteShoot('${s.id}');this.closest('.modal').remove()}">Delete</button><button class="btn primary" onclick="this.closest('.modal').remove();editShoot('${s.id}')">Edit shoot</button></div></section>`;
  document.body.appendChild(panel);panel.addEventListener("click",e=>{if(e.target===panel)panel.remove()});
  loadPhotoGallery(panel,s.id);
}
async function loadPhotoGallery(panel,shootId){
  const gallery=panel.querySelector(".shoot-photo-gallery");
  const status=panel.querySelector(".shoot-photo-status");
  const input=panel.querySelector(".shoot-photo-input");
  const refresh=async()=>{
    gallery.querySelectorAll("img").forEach(img=>{if(img.dataset.objectUrl)URL.revokeObjectURL(img.dataset.objectUrl)});
    gallery.innerHTML="";
    try{
      const photos=await getShootPhotos(shootId);
      status.textContent=photos.length?`${photos.length} photo${photos.length===1?"":"s"} saved`:"No photos uploaded yet.";
      for(const photo of photos){
        const url=URL.createObjectURL(photo.blob);
        const tile=document.createElement("div");
        tile.style.cssText="position:relative;min-width:0";
        const img=document.createElement("img");
        img.src=url;img.alt=photo.name||"Photoshoot photo";img.dataset.objectUrl=url;
        img.style.cssText="width:100%;height:105px;object-fit:cover;border-radius:10px;display:block";
        const del=document.createElement("button");
        del.type="button";del.className="btn danger small";del.textContent="Delete";
        del.style.cssText="width:100%;margin-top:5px";
        del.addEventListener("click",async()=>{
          if(!confirm("Delete this photo?"))return;
          try{await deleteShootPhoto(photo.id);URL.revokeObjectURL(url);await refresh()}
          catch(err){status.textContent=err.message||"Could not delete photo."}
        });
        tile.append(img,del);gallery.appendChild(tile);
      }
    }catch(err){status.textContent=err.message||"Could not load photo gallery."}
  };
  input.addEventListener("change",async()=>{
    const files=Array.from(input.files||[]);
    if(!files.length)return;
    status.textContent="Saving photos...";
    let saved=0;
    for(const file of files){
      if(!["image/jpeg","image/png","image/webp","image/gif"].includes(file.type)){
        status.textContent=`Skipped ${file.name}: choose a JPG, PNG, WebP, or GIF image.`;continue;
      }
      if(file.size>15*1024*1024){
        status.textContent=`Skipped ${file.name}: maximum size is 15 MB per photo.`;continue;
      }
      try{await saveShootPhoto(shootId,file);saved++}
      catch(err){status.textContent=err.message||"Could not save photo."}
    }
    input.value="";
    await refresh();
    if(saved)status.textContent=`Saved ${saved} photo${saved===1?"":"s"}. ${status.textContent}`;
  });
  await refresh();
}
function deleteShoot(id){shoots=shoots.filter(s=>s.id!==id);persist();deleteAllShootPhotos(id).catch(()=>{});render()}
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
