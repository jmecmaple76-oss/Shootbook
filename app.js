/* ShootBook Plus — keeps the existing shootbook-v1 and shootbook-photos stores */
const KEY = "shootbook-v1";
const GEAR_KEY = "shootbook-gear-v1";
let shoots = load();
let currentView = "dashboard";
let calendarDate = new Date();
let lightboxItems = [], lightboxIndex = 0;
function load(){try{return JSON.parse(localStorage.getItem(KEY)||"[]")}catch{return []}}
function persist(){localStorage.setItem(KEY,JSON.stringify(shoots))}
const $ = id => document.getElementById(id);
const esc = s => String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const money = n => "$"+(Number(n||0)).toFixed(2);
const fmtDate = d => d ? new Date(d+"T12:00:00").toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"}) : "Date not set";
const lines = v => String(v||"").split("\n").map(x=>x.trim()).filter(Boolean);
const today = () => new Date().toISOString().slice(0,10);

/* Keep the gallery's existing IndexedDB database and object store. */
const PHOTO_DB_NAME="shootbook-photos", PHOTO_STORE="photos";
function openPhotoDB(){return new Promise((resolve,reject)=>{if(!("indexedDB" in window)){reject(Error("Photo storage is not supported in this browser."));return}const q=indexedDB.open(PHOTO_DB_NAME,1);q.onupgradeneeded=()=>{const db=q.result;if(!db.objectStoreNames.contains(PHOTO_STORE)){const st=db.createObjectStore(PHOTO_STORE,{keyPath:"id",autoIncrement:true});st.createIndex("shootId","shootId",{unique:false})}};q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error)})}
async function getAllPhotos(){const db=await openPhotoDB();return new Promise((res,rej)=>{const tx=db.transaction(PHOTO_STORE,"readonly"),q=tx.objectStore(PHOTO_STORE).getAll();q.onsuccess=()=>res(q.result||[]);q.onerror=()=>rej(q.error);tx.oncomplete=()=>db.close()})}
async function getShootPhotos(id){return (await getAllPhotos()).filter(p=>p.shootId===id)}
async function saveShootPhoto(shootId,file){const db=await openPhotoDB();return new Promise((res,rej)=>{const tx=db.transaction(PHOTO_STORE,"readwrite"),q=tx.objectStore(PHOTO_STORE).add({shootId,name:file.name,type:file.type,createdAt:Date.now(),blob:file});q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error);tx.oncomplete=()=>db.close();tx.onerror=()=>{db.close();rej(tx.error)}})}
async function deleteShootPhoto(id){const db=await openPhotoDB();return new Promise((res,rej)=>{const tx=db.transaction(PHOTO_STORE,"readwrite");tx.objectStore(PHOTO_STORE).delete(Number(id));tx.oncomplete=()=>{db.close();res()};tx.onerror=()=>{db.close();rej(tx.error)}})}
async function deleteAllShootPhotos(shootId){for(const p of await getShootPhotos(shootId))await deleteShootPhoto(p.id)}

/* Add the new sections and responsive styling without requiring an index.html replacement. */
const style=document.createElement("style");style.textContent=`
.extra-tabs{display:flex;gap:7px;overflow:auto;margin:-10px 0 20px;padding-bottom:5px}.extra-tabs .tab{font-size:13px}
.feature-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px}.feature-card{background:var(--panel);border:1px solid var(--line);border-radius:15px;padding:15px;min-width:0}.feature-card h3{margin:0 0 8px;font-size:15px}.feature-card p{color:var(--muted);font-size:13px}.calendar-head{display:flex;justify-content:space-between;align-items:center;gap:8px;margin:15px 0}.calendar-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:5px}.cal-day{min-height:76px;background:var(--panel);border:1px solid var(--line);border-radius:9px;padding:6px;font-size:12px;overflow:hidden}.cal-day.muted-day{opacity:.4}.cal-day.today{border-color:var(--accent)}.cal-event{display:block;background:#2c4056;color:#d9eaff;border-radius:5px;padding:3px;margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:10px}.client-row,.gear-row{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:11px 0;border-bottom:1px solid var(--line)}.photo-tile{position:relative;min-width:0}.photo-tile img{width:100%;height:125px;object-fit:cover;border-radius:10px;display:block;cursor:zoom-in}.photo-lightbox{position:fixed;inset:0;background:#05070bf2;z-index:30;display:none;align-items:center;justify-content:center;padding:18px}.photo-lightbox.open{display:flex}.photo-lightbox img{max-width:94vw;max-height:84vh;object-fit:contain}.lightbox-close,.lightbox-nav{position:absolute;background:#222a35;color:white;border:1px solid #566273;border-radius:50%;width:42px;height:42px;font-size:22px}.lightbox-close{top:18px;right:18px}.lightbox-prev{left:18px}.lightbox-next{right:18px}.lightbox-count{position:absolute;bottom:18px;color:white}.mood-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(125px,1fr));gap:10px}.mood-grid img{width:100%;height:140px;object-fit:cover;border-radius:10px}.status-select{max-width:220px}.inline-note{font-size:12px;color:var(--muted)}.metric{font-size:25px;font-weight:700}.feature-card input,.feature-card select{margin:5px 0}@media(max-width:650px){.cal-day{min-height:58px;padding:4px}.cal-event{font-size:9px}.photo-lightbox{padding:8px}}
`;

/* ShootBook mobile polish — visual-only overrides */
style.textContent += `
:root{
  --bg:#0c1016;--panel:#151c26;--panel2:#202b39;--line:#293646;
  --text:#f4f7fb;--muted:#9aa9bb;--accent:#a9d1ff;
}
html{background:var(--bg);-webkit-text-size-adjust:100%;scroll-behavior:smooth}
body{background:var(--bg);letter-spacing:.005em;-webkit-tap-highlight-color:transparent}
.shell{max-width:1120px;padding:clamp(14px,3vw,28px) clamp(14px,3vw,24px) calc(40px + env(safe-area-inset-bottom))}
header{margin-bottom:20px;align-items:center}
.brand{min-width:0}.logo{box-shadow:0 6px 18px #0003}
h1{font-size:clamp(22px,4vw,27px)}
.sub{letter-spacing:.11em;font-size:10px}
.btn,.tab{min-height:42px;transition:background .16s ease,border-color .16s ease,transform .16s ease}
.btn{border-radius:12px;padding:10px 14px}
.btn:active,.tab:active{transform:scale(.98)}
.btn.primary{box-shadow:0 5px 16px #a9d1ff18}
.tabs,.extra-tabs{gap:7px;margin-bottom:14px;padding:3px 1px 8px;scrollbar-width:none}
.tabs::-webkit-scrollbar,.extra-tabs::-webkit-scrollbar{display:none}
.tab{padding:9px 14px;background:#121923;border-color:#263344;font-size:13px}
.tab.active{background:#27384b;border-color:#5d7898;color:#f7fbff}
.hero{padding:clamp(18px,4vw,26px);border-radius:20px;box-shadow:0 12px 32px #0002}
.hero h2{font-size:clamp(21px,4vw,26px);letter-spacing:-.025em}
.stats{gap:10px;margin:14px 0 22px}
.stat,.card,.shoot-card,.feature-card{border-radius:17px;box-shadow:0 5px 18px #00000012}
.stat{padding:15px}
.stat strong{letter-spacing:-.04em}
.sectionhead{margin:22px 0 12px}
.sectionhead h2{font-size:17px;letter-spacing:-.015em}
.shoot-card{padding:16px}
.shoot-card h3{font-size:16px;line-height:1.3}
.pill{padding:5px 10px}
input,textarea,select{min-height:46px;border-radius:12px;padding:12px;background:#0e151e}
textarea{min-height:92px}
label{margin-top:13px}
.actions{gap:8px}
.empty{padding:30px 18px;border-radius:17px;background:#12192355}
.detail-row{border:1px solid #263344;border-radius:13px;padding:13px}
.dialog{border-radius:22px;padding:clamp(16px,4vw,22px)}
.modal{padding:12px}
.calendar-grid{gap:4px}
.cal-day{border-radius:10px;background:#151c26}
.cal-event{border:0;text-align:left}
.feature-card p,.muted{line-height:1.55}
.photo-tile img{border-radius:13px}
.photo-lightbox{backdrop-filter:blur(12px)}
@media(max-width:650px){
  .shell{padding:12px 13px calc(26px + env(safe-area-inset-bottom))}
  header{gap:9px;margin-bottom:17px}
  .brand{gap:9px}.logo{width:38px;height:38px;border-radius:12px;font-size:20px}
  h1{font-size:22px}.sub{font-size:9px}
  #newShoot{padding:9px 11px;min-height:42px;font-size:13px;white-space:nowrap}
  .tabs,.extra-tabs{margin-left:-1px;margin-right:-1px;gap:6px}
  .tab{padding:9px 12px;font-size:12px;min-height:40px}
  .hero{margin-bottom:15px;padding:18px;border-radius:17px}
  .hero p{font-size:13px;line-height:1.5}
  .stats{grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin:13px 0 20px}
  .stat{padding:11px 9px;border-radius:14px;min-width:0}
  .stat strong{font-size:clamp(17px,5vw,22px);overflow-wrap:anywhere}
  .stat span{font-size:10px;line-height:1.3;display:block}
  .shoots{grid-template-columns:1fr;gap:10px}
  .shoot-card{padding:14px;border-radius:15px}
  .sectionhead{align-items:center}
  .sectionhead h2{font-size:16px}
  .toolbar{gap:7px}
  .toolbar input{min-width:100%;flex-basis:100%}
  .toolbar select{max-width:none!important;flex:1}
  .formgrid{grid-template-columns:1fr}
  .full{grid-column:auto}
  .modal{align-items:flex-end;padding:0}
  .dialog{width:100%;max-height:94dvh;border-radius:22px 22px 0 0;padding:18px 16px calc(18px + env(safe-area-inset-bottom));border-bottom:0}
  .dialoghead{position:sticky;top:-18px;background:var(--panel);padding:7px 0 12px;z-index:2}
  .actions .btn{flex:1}
  .calendar-head{gap:6px}
  .calendar-head .btn{padding:8px 9px;font-size:11px}
  .calendar-grid{gap:3px}
  .cal-day{min-height:55px;padding:4px 3px;font-size:11px;border-radius:8px}
  .cal-event{font-size:8px;padding:3px 2px;margin-top:3px}
  .feature-grid{grid-template-columns:1fr}
  .mood-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
  .mood-grid img{height:130px}
  .client-row,.gear-row{align-items:flex-start}
  .photo-lightbox{padding:8px}
  .lightbox-prev{left:8px}.lightbox-next{right:8px}
  footer{padding:0 12px;line-height:1.5}
}
@media(max-width:370px){
  .stats{gap:5px}.stat{padding:9px 6px}.stat span{font-size:9px}
  .logo{width:34px;height:34px}
  h1{font-size:20px}
  #newShoot{font-size:12px;padding:8px 9px}
}
@media(prefers-reduced-motion:reduce){
  html{scroll-behavior:auto}
  *,*::before,*::after{transition:none!important;animation:none!important}
}
`;


/* Desktop redesign — intentionally applies at desktop widths, not just mobile */
style.textContent += `
@media (min-width: 900px){
  :root{
    --bg:#0a0e14;--panel:#121a25;--panel2:#1a2635;--line:#263548;
    --text:#f2f6fc;--muted:#91a2b7;--accent:#b7d8ff;
  }
  body{
    background:
      radial-gradient(ellipse at 12% 0%,rgba(75,112,155,.13),transparent 34rem),
      radial-gradient(ellipse at 92% 14%,rgba(87,105,143,.09),transparent 28rem),
      var(--bg);
    color:var(--text);
  }
  .shell{max-width:1440px;padding:34px 48px 64px}
  header{
    display:flex;justify-content:space-between;align-items:center;
    padding:0 0 25px;margin:0 0 26px;border-bottom:1px solid #263548;
  }
  .brand{gap:15px}
  .logo{
    width:52px;height:52px;border-radius:16px;
    background:linear-gradient(145deg,#b7d8ff,#648bb5);
    color:#101a27;box-shadow:0 10px 28px #0005;
  }
  h1{font-size:29px;letter-spacing:-.045em}
  .sub{font-size:10px;letter-spacing:.18em;margin-top:5px;color:#91a2b7}
  #newShoot{padding:13px 20px;border-radius:13px;font-size:14px}
  .tabs,.extra-tabs{
    display:flex;flex-wrap:wrap;gap:9px;margin:0 0 17px;padding:0 0 4px;
  }
  .extra-tabs{margin:0 0 30px}
  .tab{
    min-height:43px;padding:11px 18px;border-radius:12px;
    background:#111a26;border:1px solid #263548;color:#aebdd0;
    font-size:13px;font-weight:600;
  }
  .tab:hover{background:#1b2939;border-color:#49617e;color:#f5f8fc}
  .tab.active{
    color:#f5f9ff;background:#263b53;border-color:#6487ad;
    box-shadow:inset 0 0 0 1px #6487ad22;
  }
  .hero{
    padding:34px 38px;border:1px solid #30445b;border-radius:22px;
    background:linear-gradient(112deg,#1a2b3e 0%,#172332 56%,#151d2a 100%);
    box-shadow:0 18px 45px #0003;position:relative;overflow:hidden;
  }
  .hero:after{
    content:"";position:absolute;width:270px;height:270px;border-radius:50%;
    right:7%;top:-155px;border:1px solid #a9c9ed20;
    box-shadow:0 0 0 28px #a9c9ed08,0 0 0 58px #a9c9ed06;
    pointer-events:none;
  }
  .hero h2{font-size:30px;letter-spacing:-.04em;margin:0 0 9px}
  .hero p{font-size:15px;max-width:600px;color:#b5c4d6;line-height:1.7}
  .stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;margin:18px 0 24px}
  .stat{
    padding:22px 24px;border:1px solid #28394d;border-radius:17px;
    background:linear-gradient(145deg,#151f2c,#111923);
    box-shadow:0 10px 28px #0002;min-height:112px;
  }
  .stat strong{display:block;font-size:30px;letter-spacing:-.045em;margin-bottom:7px}
  .stat span{font-size:12px;color:#9aacc1;letter-spacing:.02em}
  .feature-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
  .feature-card{
    padding:22px 24px;border:1px solid #28394d;border-radius:17px;
    background:linear-gradient(145deg,#151f2c,#111923);
  }
  .feature-card h3{font-size:15px;letter-spacing:.01em;margin-bottom:14px}
  .feature-card p{font-size:13px;margin:9px 0;color:#9aacc1}
  .metric{font-size:32px;letter-spacing:-.04em}
  .sectionhead{margin:34px 0 15px;align-items:center}
  .sectionhead h2{font-size:20px;letter-spacing:-.025em}
  .shoots{grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
  .shoot-card,.card{
    padding:21px;border:1px solid #28394d;border-radius:17px;
    background:linear-gradient(145deg,#151f2c,#111923);
    box-shadow:0 9px 26px #0002;transition:transform .18s,border-color .18s,box-shadow .18s;
  }
  .shoot-card:hover,.card:hover{
    transform:translateY(-2px);border-color:#49617e;box-shadow:0 15px 32px #0003;
  }
  .shoot-card h3{font-size:17px;letter-spacing:-.02em}
  .toolbar{gap:12px;margin:16px 0 20px}
  .toolbar input{max-width:440px}
  input,textarea,select{
    border:1px solid #2b3b50;background:#0e1621;color:#f2f6fc;
    border-radius:11px;padding:12px 14px;
  }
  input:focus,textarea:focus,select:focus{
    outline:2px solid #7da7d2;outline-offset:1px;border-color:#7da7d2;
  }
  .btn{border-radius:11px;font-weight:650}
  .btn.primary{background:#b7d8ff;color:#142235;border-color:#b7d8ff}
  .btn.primary:hover{background:#d0e5ff}
  .empty{padding:42px;border:1px dashed #344960;border-radius:17px;background:#111a25}
  .calendar-grid{gap:7px}
  .cal-day{min-height:104px;padding:10px;border-radius:12px;background:#121c28;border-color:#293b50}
  .cal-event{background:#263d57;color:#e1efff;padding:5px 7px;border-radius:6px}
  .feature-grid,.stats,.shoots{align-items:stretch}
}
@media (min-width:1200px){
  .shell{padding-left:64px;padding-right:64px}
  .shoots{grid-template-columns:repeat(3,minmax(0,1fr))}
}
`;

document.head.appendChild(style);
let extraNav=document.createElement("nav");extraNav.className="extra-tabs";extraNav.setAttribute("aria-label","More ShootBook sections");extraNav.innerHTML=[['calendar','Calendar'],['clients','Clients'],['gear','Gear'],['inspiration','Inspiration']].map(([v,t])=>`<button class="tab" data-extra-view="${v}">${t}</button>`).join("");const mainNav=document.querySelector(".tabs");if(mainNav)mainNav.after(extraNav);
const lightbox=document.createElement("div");lightbox.className="photo-lightbox";lightbox.innerHTML='<button class="lightbox-close" aria-label="Close">×</button><button class="lightbox-nav lightbox-prev" aria-label="Previous">‹</button><img alt="Full-size photoshoot image"><button class="lightbox-nav lightbox-next" aria-label="Next">›</button><div class="lightbox-count"></div>';document.body.appendChild(lightbox);
lightbox.querySelector('.lightbox-close').onclick=closeLightbox;lightbox.querySelector('.lightbox-prev').onclick=()=>showLightbox(lightboxIndex-1);lightbox.querySelector('.lightbox-next').onclick=()=>showLightbox(lightboxIndex+1);lightbox.addEventListener('click',e=>{if(e.target===lightbox)closeLightbox()});document.addEventListener('keydown',e=>{if(!lightbox.classList.contains('open'))return;if(e.key==='Escape')closeLightbox();if(e.key==='ArrowLeft')showLightbox(lightboxIndex-1);if(e.key==='ArrowRight')showLightbox(lightboxIndex+1)});
function openLightbox(items,index){lightboxItems=items;lightboxIndex=index;showLightbox(index);lightbox.classList.add('open')}
function showLightbox(index){if(!lightboxItems.length)return;lightboxIndex=(index+lightboxItems.length)%lightboxItems.length;const item=lightboxItems[lightboxIndex];lightbox.querySelector('img').src=item.url;lightbox.querySelector('.lightbox-count').textContent=`${lightboxIndex+1} / ${lightboxItems.length}`}
function closeLightbox(){lightbox.classList.remove('open');lightbox.querySelector('img').src='';lightboxItems.forEach(x=>URL.revokeObjectURL(x.url));lightboxItems=[]}

function setView(view){currentView=view;document.querySelectorAll('.tabs .tab').forEach(b=>b.classList.toggle('active',b.dataset.view===view));document.querySelectorAll('[data-extra-view]').forEach(b=>b.classList.toggle('active',b.dataset.extraView===view));render()}
document.querySelectorAll('.tabs .tab').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));extraNav.addEventListener('click',e=>{const b=e.target.closest('[data-extra-view]');if(b)setView(b.dataset.extraView)});
$('newShoot').onclick=()=>openForm();$('closeModal').onclick=$('cancelForm').onclick=closeForm;$('modal').addEventListener('click',e=>{if(e.target===$('modal'))closeForm()});
function openForm(s=null){$('shootForm').reset();$('shootId').value=s?.id||'';$('formTitle').textContent=s?'Edit photoshoot':'New photoshoot';['title','date','time','type','status','client','contact','location','fee','paid','notes','shots','gear','inspiration'].forEach(k=>$(k).value=s?.[k]??({type:'Portrait',status:'Planning',paid:'Not paid'}[k]||''));$('modal').classList.add('open')}
function closeForm(){$('modal').classList.remove('open')}
$('shootForm').onsubmit=e=>{e.preventDefault();const id=$('shootId').value||crypto.randomUUID(),item={id};['title','date','time','type','status','client','contact','location','fee','paid','notes','shots','gear','inspiration'].forEach(k=>item[k]=$(k).value.trim());const old=shoots.find(x=>x.id===id);if(old)Object.assign(item,old,item);const i=shoots.findIndex(x=>x.id===id);if(i>=0)shoots[i]=item;else shoots.push(item);persist();closeForm();render()};
function card(s){return `<article class="shoot-card"><div class="meta">${esc(fmtDate(s.date))}${s.time?' · '+esc(s.time):''} · ${esc(s.type)}</div><h3>${esc(s.title)}</h3><div class="meta">${esc(s.client||'No client')} ${s.location?'· '+esc(s.location):''}</div><span class="pill">${esc(s.status)}</span><div class="actions" style="justify-content:flex-start"><button class="btn small" onclick="viewShoot('${s.id}')">Open details</button><button class="btn small" onclick="editShoot('${s.id}')">Edit</button></div></article>`}
function editShoot(id){openForm(shoots.find(s=>s.id===id))}
function deleteShoot(id){shoots=shoots.filter(s=>s.id!==id);persist();deleteAllShootPhotos(id).catch(()=>{});render()}
async function viewShoot(id){const s=shoots.find(x=>x.id===id);if(!s)return;const links=lines(s.inspiration).map(u=>`<div><a href="${esc(u)}" target="_blank" rel="noopener" style="color:var(--accent);overflow-wrap:anywhere">${esc(u)}</a></div>`).join('')||'None added';const checklist=a=>a.length?a.map(v=>`<label class="checkrow"><input type="checkbox"> ${esc(v)}</label>`).join(''):'None added';const panel=document.createElement('div');panel.className='modal open';panel.innerHTML=`<section class="dialog"><div class="dialoghead"><h2>${esc(s.title)}</h2><button class="btn small" onclick="this.closest('.modal').remove()">✕</button></div><div class="detail-list" style="margin-top:15px"><div class="detail-row"><b>DATE & LOCATION</b>${esc(fmtDate(s.date))} ${esc(s.time||'')}<br>${esc(s.location||'Location not set')}</div><div class="detail-row"><b>CLIENT</b>${esc(s.client||'Not set')}<br>${esc(s.contact||'No contact details')}</div><div class="detail-row"><b>STATUS & PAYMENT</b>${esc(s.status)} · ${esc(s.paid)}<br>${money(s.fee)}</div><div class="detail-row"><b>NOTES</b>${esc(s.notes||'No notes')}</div><div class="detail-row"><b>SHOT LIST</b>${checklist(lines(s.shots))}</div><div class="detail-row"><b>EQUIPMENT CHECKLIST</b>${checklist(lines(s.gear))}</div><div class="detail-row"><b>INSPIRATION</b>${links}</div><div class="detail-row"><b>PHOTO DELIVERY</b><label for="delivery-${s.id}">Delivery progress</label><select id="delivery-${s.id}" class="status-select"><option ${(!s.delivery||s.delivery==='Not started')?'selected':''}>Not started</option><option ${s.delivery==='Editing'?'selected':''}>Editing</option><option ${s.delivery==='Ready for delivery'?'selected':''}>Ready for delivery</option><option ${s.delivery==='Delivered'?'selected':''}>Delivered</option></select><p class="inline-note">This is tracked separately from the shoot's planning status.</p></div><div class="detail-row"><b>PHOTO GALLERY & INSPIRATION BOARD</b><p class="muted" style="margin:6px 0 10px">Tap a photo to view it full-screen. Uploads stay in this browser on this device.</p><label class="btn small" style="display:inline-block;cursor:pointer">＋ Upload photos<input class="shoot-photo-input" type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple hidden></label><div class="shoot-photo-status muted" role="status" style="margin-top:8px"></div><div class="shoot-photo-gallery mood-grid" style="margin-top:12px"></div></div><div class="detail-row"><b>WEATHER</b><input class="weather-place" placeholder="Enter city or ZIP code" value="${esc(s.location||'')}"><button class="btn small weather-button" style="margin-top:8px">Check forecast</button><div class="weather" hidden></div></div></div><div class="actions"><button class="btn danger delete-shoot">Delete</button><button class="btn primary edit-shoot">Edit shoot</button></div></section>`;document.body.appendChild(panel);panel.addEventListener('click',e=>{if(e.target===panel)panel.remove()});panel.querySelector('.delete-shoot').onclick=()=>{if(confirm('Delete this photoshoot?')){deleteShoot(id);panel.remove()}};panel.querySelector('.edit-shoot').onclick=()=>{panel.remove();editShoot(id)};panel.querySelector(`#delivery-${CSS.escape(id)}`).onchange=e=>{s.delivery=e.target.value;persist()};panel.querySelector('.weather-button').onclick=e=>getWeather(e.currentTarget);await loadPhotoGallery(panel,id)}
async function loadPhotoGallery(panel,id){const gallery=panel.querySelector('.shoot-photo-gallery'),status=panel.querySelector('.shoot-photo-status'),input=panel.querySelector('.shoot-photo-input');let urls=[];const refresh=async()=>{urls.forEach(URL.revokeObjectURL);urls=[];gallery.innerHTML='';try{const photos=await getShootPhotos(id);status.textContent=photos.length?`${photos.length} photo${photos.length===1?'':'s'} saved`:'No photos uploaded yet.';photos.forEach((p,i)=>{const url=URL.createObjectURL(p.blob);urls.push(url);const tile=document.createElement('div');tile.className='photo-tile';const img=document.createElement('img');img.src=url;img.alt=p.name||'Photoshoot photo';img.onclick=()=>openLightbox(photos.map(x=>({url:URL.createObjectURL(x.blob),name:x.name})),i);const del=document.createElement('button');del.className='btn danger small';del.textContent='Delete';del.style.width='100%';del.onclick=async()=>{if(confirm('Delete this photo?')){await deleteShootPhoto(p.id);refresh()}};tile.append(img,del);gallery.append(tile)})}catch(err){status.textContent=err.message||'Could not load photos.'}};input.onchange=async()=>{const files=Array.from(input.files||[]);let saved=0;status.textContent='Saving photos...';for(const f of files){if(!['image/jpeg','image/png','image/webp','image/gif'].includes(f.type)){status.textContent=`Skipped ${f.name}: use JPG, PNG, WebP, or GIF.`;continue}if(f.size>15*1024*1024){status.textContent=`Skipped ${f.name}: maximum 15 MB each.`;continue}try{await saveShootPhoto(id,f);saved++}catch(err){status.textContent=err.message||'Photo could not be saved.'}}input.value='';await refresh();if(saved)status.textContent=`Saved ${saved} photo${saved===1?'':'s'}.`};await refresh()}
async function getWeather(btn){const box=btn.nextElementSibling,place=btn.previousElementSibling.value.trim();if(!place){box.hidden=false;box.textContent='Enter a city or ZIP code first.';return}box.hidden=false;box.textContent='Loading forecast...';try{const g=await fetch('https://geocoding-api.open-meteo.com/v1/search?name='+encodeURIComponent(place)+'&count=1&language=en&format=json').then(r=>r.json());if(!g.results?.length)throw Error('Location not found.');const p=g.results[0],w=await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${p.latitude}&longitude=${p.longitude}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=3`).then(r=>r.json());box.innerHTML=`<b>${esc(p.name)}, ${esc(p.admin1||p.country||'')}</b><br>`+w.daily.time.map((d,i)=>`${new Date(d+'T12:00:00').toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'})}: ${w.daily.temperature_2m_min[i]}°–${w.daily.temperature_2m_max[i]}°C · Rain chance ${w.daily.precipitation_probability_max[i]}%`).join('<br>')+'<br><small>Forecast may change. Check again near shoot day.</small>'}catch(e){box.textContent=e.message||'Could not load weather.'}}

function renderDashboard(){const upcoming=shoots.filter(s=>s.date&&s.date>=today()&&!['Completed','Delivered'].includes(s.status)).sort((a,b)=>a.date.localeCompare(b.date));const completed=shoots.filter(s=>['Completed','Delivered'].includes(s.status)).length;const paid=shoots.filter(s=>['Paid in full','No charge'].includes(s.paid)).reduce((n,s)=>n+Number(s.fee||0),0);const outstanding=shoots.filter(s=>!['Paid in full','No charge'].includes(s.paid)).reduce((n,s)=>n+Number(s.fee||0),0);const clients=new Set(shoots.map(s=>s.client).filter(Boolean)).size;return `<section class="hero"><h2>Make every shot count.</h2><p>Your sessions, clients, gear and creative ideas — all in one place.</p></section><div class="stats"><div class="stat"><strong>${upcoming.length}</strong><span>Upcoming shoots</span></div><div class="stat"><strong>${completed}</strong><span>Completed</span></div><div class="stat"><strong>${money(outstanding)}</strong><span>Outstanding</span></div></div><div class="feature-grid"><div class="feature-card"><h3>Business overview</h3><div class="metric">${shoots.length}</div><p>Total shoots · ${clients} clients</p><p>Recorded paid amount: <b>${money(paid)}</b></p></div><div class="feature-card"><h3>Delivery pipeline</h3>${['Not started','Editing','Ready for delivery','Delivered'].map(x=>`<p>${x}: <b>${shoots.filter(s=>(s.delivery||'Not started')===x).length}</b></p>`).join('')}</div></div><div class="sectionhead"><h2>Coming up</h2><button class="btn small" onclick="setView('shoots')">View all</button></div>${upcoming.length?`<div class="shoots">${upcoming.slice(0,4).map(card).join('')}</div>`:`<div class="empty">No upcoming shoots yet.<br><br><button class="btn primary" onclick="openForm()">＋ Add your first shoot</button></div>`}`}
function renderShoots(){return `<div class="sectionhead"><h2>All photoshoots (${shoots.length})</h2><button class="btn primary small" onclick="openForm()">＋ Add shoot</button></div><div class="toolbar"><input id="search" placeholder="Search shoots, clients or locations..."><select id="filter" style="max-width:160px"><option value="">All statuses</option><option>Planning</option><option>Scheduled</option><option>Completed</option><option>Delivered</option></select></div><div id="shootResults"></div>`}
function renderCalendar(){const y=calendarDate.getFullYear(),m=calendarDate.getMonth(),first=new Date(y,m,1),start=new Date(y,m,1-first.getDay()),monthName=calendarDate.toLocaleDateString(undefined,{month:'long',year:'numeric'});let days='';for(let i=0;i<42;i++){const d=new Date(start);d.setDate(start.getDate()+i);const iso=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`,events=shoots.filter(s=>s.date===iso);days+=`<div class="cal-day ${d.getMonth()!==m?'muted-day':''} ${iso===today()?'today':''}"><b>${d.getDate()}</b>${events.map(s=>`<button class="cal-event" onclick="viewShoot('${s.id}')">${esc(s.title)}</button>`).join('')}</div>`}return `<div class="sectionhead"><h2>Photography calendar</h2><button class="btn primary small" onclick="openForm()">＋ Add shoot</button></div><div class="calendar-head"><button class="btn small" onclick="changeMonth(-1)">← Previous</button><b>${monthName}</b><button class="btn small" onclick="changeMonth(1)">Next →</button></div><div class="calendar-grid">${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(x=>`<div class="muted" style="text-align:center;font-size:12px">${x}</div>`).join('')}${days}</div>`}
function changeMonth(n){calendarDate.setMonth(calendarDate.getMonth()+n);render()}
function renderClients(){const map=new Map();shoots.filter(s=>s.client).forEach(s=>{const key=s.client.trim().toLowerCase();if(!map.has(key))map.set(key,{name:s.client,contact:s.contact,shoots:[]});map.get(key).shoots.push(s)});const clients=[...map.values()].sort((a,b)=>a.name.localeCompare(b.name));return `<div class="sectionhead"><h2>Client directory</h2><span class="muted">${clients.length} clients from your shoots</span></div><p class="muted">Client profiles are automatically created from the client details on your photoshoots.</p>${clients.length?`<div class="card">${clients.map(c=>`<div class="client-row"><div><b>${esc(c.name)}</b><div class="meta">${esc(c.contact||'No contact saved')} · ${c.shoots.length} shoot(s)</div></div><button class="btn small" onclick="openClient('${encodeURIComponent(c.name)}')">View shoots</button></div>`).join('')}</div>`:`<div class="empty">Add a client name to a photoshoot to build your directory.</div>`}`}
function openClient(encoded){const name=decodeURIComponent(encoded);const list=shoots.filter(s=>(s.client||'').toLowerCase()===name.toLowerCase());const panel=document.createElement('div');panel.className='modal open';panel.innerHTML=`<section class="dialog"><div class="dialoghead"><h2>${esc(name)}</h2><button class="btn small" onclick="this.closest('.modal').remove()">✕</button></div><div class="detail-list">${list.map(s=>`<div class="detail-row"><b>${esc(fmtDate(s.date))}</b>${esc(s.title)} · ${esc(s.status)}<button class="btn small" style="margin-left:8px" onclick="this.closest('.modal').remove();viewShoot('${s.id}')">Open</button></div>`).join('')}</div></section>`;document.body.append(panel)}
function getGear(){try{return JSON.parse(localStorage.getItem(GEAR_KEY)||'[]')}catch{return []}}
function renderGear(){const gear=getGear();return `<div class="sectionhead"><h2>Equipment inventory</h2><button class="btn primary small" onclick="addGear()">＋ Add equipment</button></div><p class="muted">Keep track of your camera bodies, lenses, batteries, cards, and accessories. This list is stored locally on this device.</p>${gear.length?`<div class="card">${gear.map((g,i)=>`<div class="gear-row"><label class="checkrow" style="margin:0;color:var(--text)"><input type="checkbox" ${g.ready?'checked':''} onchange="toggleGear(${i},this.checked)"> <span><b>${esc(g.name)}</b><span class="meta" style="display:block">${esc(g.category||'Other')}</span></span></label><button class="btn small danger" onclick="removeGear(${i})">Remove</button></div>`).join('')}</div>`:`<div class="empty">Your equipment list is empty. Add your first item.</div>`}`}
function addGear(){const name=prompt('Equipment name (for example, Camera body):');if(!name?.trim())return;const category=prompt('Category (Camera, Lens, Lighting, Audio, Accessory, Other):','Accessory')||'Other';const a=getGear();a.push({name:name.trim(),category:category.trim(),ready:false});localStorage.setItem(GEAR_KEY,JSON.stringify(a));render()}
function toggleGear(i,v){const a=getGear();if(a[i])a[i].ready=v;localStorage.setItem(GEAR_KEY,JSON.stringify(a))}
function removeGear(i){const a=getGear();a.splice(i,1);localStorage.setItem(GEAR_KEY,JSON.stringify(a));render()}
function renderInspiration(){return `<div class="sectionhead"><h2>Inspiration boards</h2><span class="muted">Organized by photoshoot</span></div><p class="muted">Each shoot's reference links and uploaded gallery photos form its own inspiration board. Add links in Edit shoot or upload images in the gallery.</p>${shoots.length?shoots.map(s=>`<div class="feature-card" style="margin-bottom:12px"><h3>${esc(s.title)}</h3><p>${esc(fmtDate(s.date))} · ${esc(s.client||'No client')}</p><div>${lines(s.inspiration).map(u=>`<a href="${esc(u)}" target="_blank" rel="noopener" style="color:var(--accent);display:block;overflow-wrap:anywhere">${esc(u)}</a>`).join('')||'<span class="muted">No reference links yet</span>'}</div><button class="btn small" style="margin-top:10px" onclick="viewShoot('${s.id}')">Open moodboard & photos</button></div>`).join(''):`<div class="empty">Create a photoshoot to start an inspiration board.</div>`}`}
function render(){const app=$('app');if(!app)return;if(currentView==='dashboard')app.innerHTML=renderDashboard();else if(currentView==='shoots')app.innerHTML=renderShoots();else if(currentView==='calendar')app.innerHTML=renderCalendar();else if(currentView==='clients')app.innerHTML=renderClients();else if(currentView==='gear')app.innerHTML=renderGear();else if(currentView==='inspiration')app.innerHTML=renderInspiration();else app.innerHTML=renderBackup();if(currentView==='shoots'){const update=()=>{const q=$('search').value.toLowerCase(),f=$('filter').value,found=shoots.filter(s=>(!f||s.status===f)&&[s.title,s.client,s.location,s.type].join(' ').toLowerCase().includes(q)).sort((a,b)=>(a.date||'').localeCompare(b.date||''));$('shootResults').innerHTML=found.length?`<div class="shoots">${found.map(card).join('')}</div>`:'<div class="empty">No matching shoots found.</div>'};$('search').oninput=update;$('filter').onchange=update;update()}}
function renderBackup(){return `<div class="card"><h2>Backup & settings</h2><p class="muted">Export includes your shoots, equipment inventory, and uploaded photos. The backup may be large if you have many high-resolution photos. Keep it somewhere safe.</p><div class="actions" style="justify-content:flex-start"><button class="btn primary" onclick="exportData()">Download complete backup</button><label class="btn" style="margin:0;cursor:pointer">Import backup<input id="importFile" type="file" accept="application/json" hidden onchange="importData(event)"></label></div><hr style="border-color:var(--line);margin:20px 0"><h3>Local storage & privacy</h3><p class="muted">Shoot details, equipment and uploaded photos are stored in this browser on this device. They are not automatically synced to another device. Clearing browser data can erase them. Keep regular backups.</p><p class="muted">Weather lookup uses Open-Meteo and requires an internet connection.</p></div>`}
async function blobToDataURL(blob){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=()=>rej(r.error);r.readAsDataURL(blob)})}
function dataURLToBlob(url){const [head,data]=url.split(',');const mime=(head.match(/:(.*?);/)||[])[1]||'application/octet-stream';const bin=atob(data),arr=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)arr[i]=bin.charCodeAt(i);return new Blob([arr],{type:mime})}
async function exportData(){try{const photos=await getAllPhotos(),packed=[];for(const p of photos)packed.push({shootId:p.shootId,name:p.name,type:p.type,createdAt:p.createdAt,data:await blobToDataURL(p.blob)});const payload={app:'ShootBook',version:2,exportedAt:new Date().toISOString(),shoots,gear:getGear(),photos:packed};const blob=new Blob([JSON.stringify(payload)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='shootbook-complete-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1500)}catch(e){alert('Could not create backup: '+(e.message||e))}}
async function importData(e){const file=e.target.files?.[0];if(!file)return;try{const data=JSON.parse(await file.text());if(!Array.isArray(data.shoots))throw Error('This is not a valid ShootBook backup.');if(!confirm('Replace your current shoots and equipment with this backup? Existing photos will be kept unless the backup contains photos.'))return;shoots=data.shoots;persist();if(Array.isArray(data.gear))localStorage.setItem(GEAR_KEY,JSON.stringify(data.gear));if(Array.isArray(data.photos)){const db=await openPhotoDB();await new Promise((res,rej)=>{const tx=db.transaction(PHOTO_STORE,'readwrite'),store=tx.objectStore(PHOTO_STORE);store.clear();for(const p of data.photos){if(p.data)store.add({shootId:p.shootId,name:p.name,type:p.type,createdAt:p.createdAt||Date.now(),blob:dataURLToBlob(p.data)})}tx.oncomplete=()=>{db.close();res()};tx.onerror=()=>{db.close();rej(tx.error)}})}render();alert('Backup restored, including photos if they were in the backup.')}catch(err){alert('Could not restore backup: '+(err.message||err))}finally{e.target.value=''}}
window.setView=setView;window.openForm=openForm;window.editShoot=editShoot;window.viewShoot=viewShoot;window.changeMonth=changeMonth;window.openClient=openClient;window.addGear=addGear;window.toggleGear=toggleGear;window.removeGear=removeGear;window.exportData=exportData;window.importData=importData;
render();if('serviceWorker'in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('./sw.js').catch(()=>{});