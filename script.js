const favicon=document.createElement('link');favicon.rel='icon';favicon.type='image/svg+xml';favicon.href='/assets/favicon.svg?v=20260818';document.head.appendChild(favicon);
const optimizationStyles=document.createElement('link');optimizationStyles.rel='stylesheet';optimizationStyles.href='optimizations.css?v=20260817-approved-logo';document.head.appendChild(optimizationStyles);
const style=document.createElement('style');style.textContent='.site-header .brand-logo{background:transparent!important;padding:0!important;border-radius:0!important;box-shadow:none!important}.footer-logo{background:transparent!important;padding:0!important;border-radius:0!important;box-shadow:none!important}';document.head.appendChild(style);

const approvedLogoParts=['/logo-data/part1.txt','/logo-data/part2.txt','/logo-data/part3.txt','/logo-data/part4.txt','/logo-data/part5.txt'];
const transparentPixel='data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
let approvedLogoPromise;
async function loadManagedLogo(){try{const response=await fetch('/api/site-content?page=global',{cache:'no-store'});if(!response.ok)return '';const data=await response.json();const url=String(data?.content?.siteLogo||'').trim();return url;}catch{return '';}}
function loadApprovedLogo(){
  if(!approvedLogoPromise){
    approvedLogoPromise=(async()=>{
      const managedLogo=await loadManagedLogo();
      if(managedLogo){document.documentElement.style.setProperty('--approved-logo-image',`url("${managedLogo}")`);return managedLogo;}
      const parts=await Promise.all(approvedLogoParts.map(async path=>{
        const response=await fetch(path,{cache:'force-cache'});
        if(!response.ok)throw new Error(`Logo data failed to load: ${path} (${response.status})`);
        return (await response.text()).trim();
      }));
      const base64=parts.join('');
      if(base64.length!==33880)throw new Error(`Approved logo data length mismatch: ${base64.length}`);
      const dataUrl=`data:image/png;base64,${base64}`;
      document.documentElement.style.setProperty('--approved-logo-image',`url("${dataUrl}")`);
      return dataUrl;
    })();
  }
  return approvedLogoPromise;
}
function applyBrandLogo(root=document){
  root.querySelectorAll('.brand-logo img').forEach(img=>{
    img.src=transparentPixel;
    img.alt='All Things Drywall & Construction';
    img.decoding='async';
  });
  loadApprovedLogo().catch(error=>console.error('Approved logo could not be loaded.',error));
}

function closeLegacyNavigation(){const toggle=document.querySelector('.mobile-toggle');const nav=document.querySelector('.nav-links');if(toggle&&nav&&nav.classList.contains('open')){nav.classList.remove('open');toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','Open menu');}}

function wireLegacyNavigation(){const toggle=document.querySelector('.mobile-toggle');const nav=document.querySelector('.nav-links');if(toggle&&nav){toggle.addEventListener('click',()=>{const open=nav.classList.toggle('open');toggle.setAttribute('aria-expanded',String(open));toggle.setAttribute('aria-label',open?'Close menu':'Open menu');});document.querySelectorAll('.nav-links a').forEach(a=>a.addEventListener('click',closeLegacyNavigation));}}

function wireRenderedNavigation(){if(document.documentElement.dataset.navA11yWired==='true')return;document.documentElement.dataset.navA11yWired='true';document.addEventListener('keydown',event=>{const nav=document.querySelector('.nav-links.open');const toggle=document.querySelector('.mobile-toggle');if(event.key==='Escape'&&nav&&toggle){toggle.click();toggle.focus();}});document.addEventListener('click',event=>{const nav=document.querySelector('.nav-links.open');const toggle=document.querySelector('.mobile-toggle');if(nav&&toggle&&!nav.contains(event.target)&&!toggle.contains(event.target))toggle.click();});}

function markCurrentPage(){const current=window.location.pathname.split('/').pop()||'index.html';document.querySelectorAll('.nav-links a,.footer-bottom a').forEach(link=>{const href=(link.getAttribute('href')||'').split('#')[0];if(href&&href===current)link.setAttribute('aria-current','page');});}

function addMobileActionBar(){if(document.querySelector('.mobile-action-bar'))return;const bar=document.createElement('nav');bar.className='mobile-action-bar';bar.setAttribute('aria-label','Quick actions');bar.innerHTML='<a class="mobile-action-call" href="tel:+15093026024" aria-label="Call All Things Drywall and Construction at 509-302-6024">Call</a><a class="mobile-action-estimate" href="contact.html">Request Estimate</a>';document.body.appendChild(bar);}

function improveImages(root=document){root.querySelectorAll('img').forEach((img,index)=>{img.decoding='async';if(index>0&&!img.closest('.hero'))img.loading='lazy';});}

function ensureCanonical(){if(document.querySelector('link[rel="canonical"]'))return;const canonical=document.createElement('link');canonical.rel='canonical';canonical.href=window.location.origin+(window.location.pathname.endsWith('index.html')?'/':window.location.pathname);document.head.appendChild(canonical);}

function loadScript(src){return new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=src;script.crossOrigin='anonymous';script.onload=resolve;script.onerror=reject;document.head.appendChild(script);});}

async function mountReactLayout(){try{if(!window.React)await loadScript('https://unpkg.com/react@18.3.1/umd/react.production.min.js');if(!window.ReactDOM)await loadScript('https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js');await loadScript('components.js?v=20260820-admin-login');requestAnimationFrame(()=>{applyBrandLogo();markCurrentPage();improveImages();wireRenderedNavigation();});return true;}catch(error){console.warn('Shared React components could not load; using static page layout.',error);applyBrandLogo();wireRenderedNavigation();return false;}}

async function loadManagedPageLayers(){try{await loadScript('site-content.js?v=20260820-r2-fallback');if(window.DAC_SITE_CONTENT_READY)await window.DAC_SITE_CONTENT_READY;await loadScript('site-images.js?v=20260820-github-slots');}catch(error){console.warn('Managed page content could not load.',error);}}

applyBrandLogo();wireLegacyNavigation();wireRenderedNavigation();markCurrentPage();addMobileActionBar();improveImages();ensureCanonical();loadManagedPageLayers();window.allThingsReactReady=mountReactLayout();

const form=document.querySelector('[data-contact-form]');if(form){form.addEventListener('submit',e=>{e.preventDefault();if(!form.reportValidity())return;const data=new FormData(form);const submit=form.querySelector('button[type="submit"]');const original=submit?.textContent;if(submit){submit.disabled=true;submit.setAttribute('aria-busy','true');submit.textContent='Opening email…';}const subject=encodeURIComponent('Estimate Request — '+(data.get('name')||'Website'));const body=encodeURIComponent(`Name: ${data.get('name')||''}\nPhone: ${data.get('phone')||''}\nEmail: ${data.get('email')||''}\n\nProject details:\n${data.get('message')||''}`);window.location.href=`mailto:matt@allthingsdac.com?subject=${subject}&body=${body}`;setTimeout(()=>{if(submit){submit.disabled=false;submit.setAttribute('aria-busy','false');submit.textContent=original||'Email Estimate Request';}},900);});}