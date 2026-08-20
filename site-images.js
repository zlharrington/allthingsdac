(()=>{
const pageSelectors={
 home:{
  service1Image:'.expertise .card:nth-child(1) img',
  service2Image:'.expertise .card:nth-child(2) img',
  service3Image:'.expertise .card:nth-child(3) img',
  familyImage:'section .split > img'
 },
 about:{
  ownerImage:'section .split > img',
  davidImage:'.team .person[data-person="david"] img',
  calebImage:'.team .person[data-person="caleb"] img',
  jonathanImage:'.team .person[data-person="jonathan"] img'
 }
};
function currentPageKey(){const trimmed=location.pathname.replace(/\/+$/,'');const leaf=(trimmed.split('/').pop()||'').toLowerCase();const file=!leaf?'index.html':leaf.includes('.')?leaf:`${leaf}.html`;if(file==='index.html')return'home';if(file==='about.html')return'about';return'';}
function applyImage(selector,url){const el=document.querySelector(selector);if(!el)return;el.src=url;el.removeAttribute('srcset');}
async function hydrateStaticSiteImages(){
 try{
  if(window.DAC_SITE_CONTENT_READY)await window.DAC_SITE_CONTENT_READY;
  const response=await fetch('/site-image-slots.json',{cache:'no-store'});
  if(!response.ok)return;
  const slots=await response.json();
  const logo=String(slots['global.siteLogo']||'').trim();
  if(logo)document.documentElement.style.setProperty('--approved-logo-image',`url("${logo}")`);
  const page=currentPageKey();const selectors=pageSelectors[page]||{};
  for(const [field,selector] of Object.entries(selectors)){
   const url=String(slots[`${page}.${field}`]||'').trim();
   if(url)applyImage(selector,url);
  }
 }catch(error){console.warn('Static site images could not be loaded.',error);}
}
hydrateStaticSiteImages();
})();
