(()=>{
const pageSelectors={home:{service1Image:'.expertise .card:nth-child(1) img',service2Image:'.expertise .card:nth-child(2) img',service3Image:'.expertise .card:nth-child(3) img',familyImage:'section .split > img'}};
function currentPageKey(){const trimmed=location.pathname.replace(/\/+$/,'');const leaf=(trimmed.split('/').pop()||'').toLowerCase();const file=!leaf?'index.html':leaf.includes('.')?leaf:`${leaf}.html`;return file==='index.html'?'home':'';}
function applyImage(selector,url){const el=document.querySelector(selector);if(!el||el.currentSrc===url||el.src===url||el.getAttribute('src')===url)return;el.src=url;el.removeAttribute('srcset');}
function loadSiteImageSlots(){
  if(!window.DAC_SITE_IMAGE_SLOTS_PROMISE){
    window.DAC_SITE_IMAGE_SLOTS_PROMISE=fetch('/site-image-slots.json')
      .then(response=>response.ok?response.json():{})
      .catch(()=>({}));
  }
  return window.DAC_SITE_IMAGE_SLOTS_PROMISE;
}
async function hydrateStaticSiteImages(){try{if(window.DAC_SITE_CONTENT_READY)await window.DAC_SITE_CONTENT_READY;const slots=await loadSiteImageSlots();const logo=String(slots['global.siteLogo']||'').trim();if(logo)document.querySelectorAll('.brand-logo img').forEach(img=>{if(img.getAttribute('src')!==logo){img.src=logo;img.removeAttribute('srcset');}});const page=currentPageKey();if(!page)return;const selectors=pageSelectors[page]||{};for(const [field,selector] of Object.entries(selectors)){const url=String(slots[`${page}.${field}`]||'').trim();if(url)applyImage(selector,url);}}catch(error){console.warn('Static site images could not be loaded.',error);}}
hydrateStaticSiteImages();
})();
