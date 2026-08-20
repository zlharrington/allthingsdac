(()=>{
const pageSelectors={home:{service1Image:'.expertise .card:nth-child(1) img',service2Image:'.expertise .card:nth-child(2) img',service3Image:'.expertise .card:nth-child(3) img',familyImage:'section .split > img'}};
function currentPageKey(){const trimmed=location.pathname.replace(/\/+$/,'');const leaf=(trimmed.split('/').pop()||'').toLowerCase();const file=!leaf?'index.html':leaf.includes('.')?leaf:`${leaf}.html`;return file==='index.html'?'home':'';}
function applyImage(selector,url){const el=document.querySelector(selector);if(!el)return;el.src=url;el.removeAttribute('srcset');}
async function hydrateStaticSiteImages(){try{if(window.DAC_SITE_CONTENT_READY)await window.DAC_SITE_CONTENT_READY;const page=currentPageKey();if(!page)return;const response=await fetch('/site-image-slots.json',{cache:'no-cache'});if(!response.ok)return;const slots=await response.json();const selectors=pageSelectors[page]||{};for(const [field,selector] of Object.entries(selectors)){const url=String(slots[`${page}.${field}`]||'').trim();if(url)applyImage(selector,url);}}catch(error){console.warn('Static site images could not be loaded.',error);}}
hydrateStaticSiteImages();
})();
