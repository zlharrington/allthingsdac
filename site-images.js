(()=>{
const selectors={
 'home.service1Image':'.expertise .card:nth-child(1) img',
 'home.service2Image':'.expertise .card:nth-child(2) img',
 'home.service3Image':'.expertise .card:nth-child(3) img',
 'home.familyImage':'section .split > img',
 'about.ownerImage':'section .split > img',
 'about.davidImage':'.team .person[data-person="david"] img',
 'about.calebImage':'.team .person[data-person="caleb"] img',
 'about.jonathanImage':'.team .person[data-person="jonathan"] img'
};
function applyImage(selector,url){const el=document.querySelector(selector);if(!el)return;el.src=url;el.removeAttribute('srcset');}
async function hydrateStaticSiteImages(){
 try{
  if(window.DAC_SITE_CONTENT_READY)await window.DAC_SITE_CONTENT_READY;
  const response=await fetch('/site-image-slots.json',{cache:'no-store'});
  if(!response.ok)return;
  const slots=await response.json();
  const logo=String(slots['global.siteLogo']||'').trim();
  if(logo)document.documentElement.style.setProperty('--approved-logo-image',`url("${logo}")`);
  for(const [key,selector] of Object.entries(selectors)){
   const url=String(slots[key]||'').trim();
   if(url)applyImage(selector,url);
  }
 }catch(error){console.warn('Static site images could not be loaded.',error);}
}
hydrateStaticSiteImages();
})();
