(()=>{
const grid=document.getElementById('photoGrid');
if(!grid)return;
const destinations=[
 {page:'global',field:'siteLogo',label:'Site-wide — Main logo'},
 {page:'home',field:'service1Image',label:'Home — Commercial service image'},
 {page:'home',field:'service2Image',label:'Home — Government service image'},
 {page:'home',field:'service3Image',label:'Home — Residential service image'},
 {page:'home',field:'familyImage',label:'Home — Family / owner image'},
 {page:'about',field:'ownerImage',label:'About — Matthew Peters owner photo'},
 {page:'about',field:'team1Image',label:'About — Matthew Peters team photo'},
 {page:'about',field:'team2Image',label:'About — David Peters photo'},
 {page:'about',field:'team3Image',label:'About — Caleb Peters photo'},
 {page:'about',field:'team4Image',label:'About — Jonathan Peters photo'}
];
const style=document.createElement('style');
style.textContent='.move-site-image{display:grid;gap:7px;padding:12px;border:1px solid var(--line);border-radius:7px;background:var(--soft)}.move-site-image>span{font-weight:800;font-size:.88rem}.move-site-controls{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px}.move-site-controls select{width:100%;min-height:44px;padding:9px 10px;border:1px solid #c9ceca;border-radius:5px;background:#fff;font:inherit}.move-site-controls .btn{min-height:44px}.move-site-help{color:var(--muted);font-size:.78rem;line-height:1.4}.move-site-error{display:none;margin:0;color:#a61b1b;font-size:.8rem;line-height:1.4;font-weight:700}.move-site-error.is-visible{display:block}@media(max-width:620px){.move-site-controls{grid-template-columns:1fr}.move-site-controls .btn{width:100%}}';
document.head.appendChild(style);
function escapeHtml(value=''){return String(value).replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));}
function options(){return '<option value="">Choose destination…</option>'+destinations.map(item=>`<option value="${item.page}|${item.field}">${escapeHtml(item.label)}</option>`).join('');}
function inject(card){if(card.querySelector('.move-site-image'))return;const body=card.querySelector('.admin-card-body');const actions=body?.querySelector('.admin-card-actions');if(!body||!actions)return;const box=document.createElement('div');box.className='move-site-image';box.innerHTML=`<span>Move to site image</span><div class="move-site-controls"><select class="move-site-destination" aria-label="Static website image destination">${options()}</select><button class="btn btn-outline move-site-photo" type="button">Move</button></div><small class="move-site-help">Moves this photo to the selected site image location, removes it from the project gallery, then refreshes this page so the new location is shown.</small><p class="move-site-error" role="alert" aria-live="assertive"></p>`;body.insertBefore(box,actions);}
function injectAll(){grid.querySelectorAll('.admin-card').forEach(inject);}
async function jsonRequest(url,options){const response=await fetch(url,options);const text=await response.text();let data={};if(text){try{data=JSON.parse(text);}catch{data={error:text};}}if(!response.ok)throw new Error(data.error||`Request failed (${response.status})`);return data;}
function showMoveError(card,message){const errorEl=card?.querySelector('.move-site-error');if(!errorEl)return;errorEl.textContent=`Error: ${message}`;errorEl.classList.add('is-visible');}
function clearMoveError(card){const errorEl=card?.querySelector('.move-site-error');if(!errorEl)return;errorEl.textContent='';errorEl.classList.remove('is-visible');}
async function enable(){let access=window.DAC_ADMIN_ACCESS;if(window.DAC_ADMIN_ACCESS_PROMISE)access=await window.DAC_ADMIN_ACCESS_PROMISE;const owner=access?.role==='owner';const clientAllowed=access?.role==='client'&&access?.permissions?.gallery===true&&access?.permissions?.siteEditor===true;if(!owner&&!clientAllowed)return;injectAll();new MutationObserver(injectAll).observe(grid,{childList:true,subtree:true});
grid.addEventListener('click',async event=>{const button=event.target.closest('.move-site-photo');if(!button)return;const card=button.closest('.admin-card');const select=card?.querySelector('.move-site-destination');clearMoveError(card);const selected=select?.value;if(!card||!selected){showMoveError(card,'Choose a destination before clicking Move.');return;}const destination=destinations.find(item=>`${item.page}|${item.field}`===selected);if(!destination){showMoveError(card,'The selected destination is invalid.');return;}const title=card.querySelector('.edit-title')?.value.trim()||'This photo';if(!confirm(`Move "${title}" to ${destination.label}?\n\nThis will replace the current site image in that location and remove this photo from the project gallery.`))return;button.disabled=true;select.disabled=true;try{if(typeof setStatus==='function')setStatus(`Moving photo to ${destination.label}…`);await jsonRequest('/api/admin/move-site-image',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({key:card.dataset.key,page:destination.page,field:destination.field})});if(typeof setStatus==='function')setStatus(`Moved photo to ${destination.label}. Refreshing…`);window.location.reload();}catch(error){showMoveError(card,error.message);if(typeof setStatus==='function')setStatus(error.message,true);button.disabled=false;select.disabled=false;}});
}
enable();
})();
