const themeStyles=document.createElement('link');themeStyles.rel='stylesheet';themeStyles.href='/site-theme.css';document.head.appendChild(themeStyles);
const favicon=document.createElement('link');favicon.rel='icon';favicon.type='image/svg+xml';favicon.href='/assets/favicon.svg?v=20260818';document.head.appendChild(favicon);
const optimizationStyles=document.createElement('link');optimizationStyles.rel='stylesheet';optimizationStyles.href='/optimizations.css?v=20260820-logo-smaller';document.head.appendChild(optimizationStyles);
const style=document.createElement('style');style.textContent='.site-header .brand-logo{background:transparent!important;padding:0!important;border-radius:0!important;box-shadow:none!important}.footer-logo{background:transparent!important;padding:0!important;border-radius:0!important;box-shadow:none!important}.site-header .nav{display:flex!important;align-items:center!important;justify-content:flex-start!important;gap:0!important}.site-header .nav::after{content:none!important;display:none!important}.header-motto{flex:0 0 auto;margin-left:18px;margin-right:auto;font-family:Georgia,\'Times New Roman\',serif;font-size:1.08rem;font-weight:700;font-style:italic;line-height:1.05;text-align:center;letter-spacing:.015em;color:rgba(154,174,181,.9);white-space:nowrap}.nav-links{margin-left:auto}@media(max-width:850px){.header-motto{margin-left:12px;font-size:.88rem;line-height:1.02}.mobile-toggle{margin-left:auto}}@media(max-width:560px){.header-motto{margin-left:9px;font-size:.76rem;letter-spacing:0}}';document.head.appendChild(style);

const approvedLogoParts=['/logo-data/part1.txt','/logo-data/part2.txt','/logo-data/part3.txt','/logo-data/part4.txt','/logo-data/part5.txt'];
const transparentPixel='data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
let approvedLogoPromise;
function loadSiteImageSlots(){
  if(!window.DAC_SITE_IMAGE_SLOTS_PROMISE){
    window.DAC_SITE_IMAGE_SLOTS_PROMISE=fetch('/site-image-slots.json')
      .then(response=>response.ok?response.json():{})
      .catch(()=>({}));
  }
  return window.DAC_SITE_IMAGE_SLOTS_PROMISE;
}
async function loadManagedLogo(){
  try{
    const slots=await loadSiteImageSlots();
    const githubLogo=String(slots?.['global.siteLogo']||'').trim();
    if(githubLogo)return githubLogo;
  }catch{}
  try{
    const response=await fetch('/api/site-content?page=global');
    if(!response.ok)return '';
    const data=await response.json();
    return String(data?.content?.siteLogo||'').trim();
  }catch{return '';}
}
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
function ensureHeaderMotto(){
  const nav=document.querySelector('.site-header .nav');
  const logo=nav?.querySelector('.brand-logo');
  if(!nav||!logo||nav.querySelector('.header-motto'))return;
  const motto=document.createElement('div');
  motto.className='header-motto';
  motto.setAttribute('aria-label','Work hard. Trust God.');
  motto.innerHTML='<span>Work hard</span><br><span>Trust God</span>';
  logo.insertAdjacentElement('afterend',motto);
}

function closeLegacyNavigation(){const toggle=document.querySelector('.mobile-toggle');const nav=document.querySelector('.nav-links');if(toggle&&nav&&nav.classList.contains('open')){nav.classList.remove('open');toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','Open menu');}}
function ensureReviewsNavLinks(){const nav=document.querySelector('.nav-links');if(nav&&!nav.querySelector('a[href="reviews.html"]')){const link=document.createElement('a');link.href='reviews.html';link.textContent='Reviews';const about=nav.querySelector('a[href="about.html"]');nav.insertBefore(link,about||nav.querySelector('.btn')||null);}const footer=document.querySelector('.footer-bottom');if(footer&&!footer.querySelector('a[href="reviews.html"]')){const about=footer.querySelector('a[href="about.html"]');const link=document.createElement('a');link.href='reviews.html';link.textContent='Reviews';if(about){footer.insertBefore(link,about);footer.insertBefore(document.createTextNode(' · '),about);}else{footer.append(document.createTextNode(' · '),link);}}}
function wireLegacyNavigation(){const toggle=document.querySelector('.mobile-toggle');const nav=document.querySelector('.nav-links');if(toggle&&nav){toggle.addEventListener('click',()=>{const open=nav.classList.toggle('open');toggle.setAttribute('aria-expanded',String(open));toggle.setAttribute('aria-label',open?'Close menu':'Open menu');});document.querySelectorAll('.nav-links a').forEach(a=>a.addEventListener('click',closeLegacyNavigation));}}
function wireRenderedNavigation(){if(document.documentElement.dataset.navA11yWired==='true')return;document.documentElement.dataset.navA11yWired='true';document.addEventListener('keydown',event=>{const nav=document.querySelector('.nav-links.open');const toggle=document.querySelector('.mobile-toggle');if(event.key==='Escape'&&nav&&toggle){toggle.click();toggle.focus();}});document.addEventListener('click',event=>{const nav=document.querySelector('.nav-links.open');const toggle=document.querySelector('.mobile-toggle');if(nav&&toggle&&!nav.contains(event.target)&&!toggle.contains(event.target))toggle.click();});}
function ensureAdminFooterLink(){const footer=document.querySelector('.footer-bottom');if(!footer||footer.querySelector('a[href="/admin/"],a[href="/admin"]'))return;footer.append(document.createTextNode(' · '));const link=document.createElement('a');link.href='/admin/';link.textContent='Admin Login';footer.append(link);}
function markCurrentPage(){const current=window.location.pathname.split('/').pop()||'index.html';document.querySelectorAll('.nav-links a,.footer-bottom a').forEach(link=>{const href=(link.getAttribute('href')||'').split('#')[0];if(href&&href===current)link.setAttribute('aria-current','page');});}
function addMobileActionBar(){if(document.querySelector('.mobile-action-bar'))return;const bar=document.createElement('nav');bar.className='mobile-action-bar';bar.setAttribute('aria-label','Quick actions');bar.innerHTML='<a class="mobile-action-call" href="tel:+15093026024" aria-label="Call All Things Drywall and Construction at 509-302-6024">Call</a><a class="mobile-action-estimate" href="contact.html">Request Estimate</a>';document.body.appendChild(bar);}
function improveImages(root=document){root.querySelectorAll('img').forEach((img,index)=>{img.decoding='async';if(index>0&&!img.closest('.hero'))img.loading='lazy';});}
function ensureCanonical(){if(document.querySelector('link[rel="canonical"]'))return;const canonical=document.createElement('link');canonical.rel='canonical';canonical.href=window.location.origin+(window.location.pathname.endsWith('index.html')?'/':window.location.pathname);document.head.appendChild(canonical);}
function loadScript(src){return new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=src;script.onload=resolve;script.onerror=reject;document.head.appendChild(script);});}
async function loadManagedPageLayers(){try{await loadScript('site-content.js?v=20260820-optimized');await loadScript('site-images.js?v=20260820-optimized-3');}catch(error){console.warn('Managed page content could not load.',error);}}

applyBrandLogo();ensureHeaderMotto();ensureReviewsNavLinks();wireLegacyNavigation();wireRenderedNavigation();ensureAdminFooterLink();markCurrentPage();addMobileActionBar();improveImages();ensureCanonical();loadManagedPageLayers();

const TURNSTILE_SITE_KEY='0x4AAAAAAEYPLMxpZZpCuQSS';
const form=document.querySelector('[data-contact-form]');
if(form){
  let turnstileToken='';
  let turnstileWidgetId=null;

  const honeypot=document.createElement('input');
  honeypot.type='text';
  honeypot.name='website';
  honeypot.tabIndex=-1;
  honeypot.autocomplete='off';
  honeypot.setAttribute('aria-hidden','true');
  honeypot.style.cssText='position:absolute!important;left:-10000px!important;width:1px!important;height:1px!important;overflow:hidden!important;';
  form.appendChild(honeypot);

  const submit=form.querySelector('button[type="submit"]');
  const turnstileContainer=document.createElement('div');
  turnstileContainer.setAttribute('data-estimate-turnstile','');
  turnstileContainer.style.margin='12px 0';
  if(submit)form.insertBefore(turnstileContainer,submit);else form.appendChild(turnstileContainer);

  loadScript('https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit')
    .then(()=>{
      if(!window.turnstile)return;
      turnstileWidgetId=window.turnstile.render(turnstileContainer,{
        sitekey:TURNSTILE_SITE_KEY,
        theme:'auto',
        callback:token=>{turnstileToken=token;},
        'expired-callback':()=>{turnstileToken='';},
        'error-callback':()=>{turnstileToken='';}
      });
    })
    .catch(error=>console.warn('Turnstile could not load.',error));

  form.addEventListener('submit',async e=>{
    e.preventDefault();
    if(!form.reportValidity())return;
    const data=new FormData(form);
    const button=form.querySelector('button[type="submit"]');
    const original=button?.textContent;
    let feedback=form.querySelector('[data-estimate-feedback]');
    if(!feedback){feedback=document.createElement('p');feedback.setAttribute('data-estimate-feedback','');feedback.setAttribute('role','status');form.appendChild(feedback);}
    feedback.textContent='';
    if(!turnstileToken){feedback.textContent='Please complete the security verification and try again.';return;}
    if(button){button.disabled=true;button.setAttribute('aria-busy','true');button.textContent='Sending…';}
    try{
      const response=await fetch('/api/estimate-request',{
        method:'POST',
        headers:{'Content-Type':'application/json','Accept':'application/json'},
        body:JSON.stringify({
          name:data.get('name')||'',
          phone:data.get('phone')||'',
          email:data.get('email')||'',
          message:data.get('message')||'',
          website:data.get('website')||'',
          turnstileToken
        })
      });
      const result=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(result.error||'We could not send your request right now.');
      form.reset();
      feedback.textContent='Thanks — your estimate request was sent successfully.';
    }catch(error){
      feedback.textContent=error instanceof Error?error.message:'We could not send your request right now. Please call or email us directly.';
    }finally{
      turnstileToken='';
      if(window.turnstile&&turnstileWidgetId!==null)window.turnstile.reset(turnstileWidgetId);
      if(button){button.disabled=false;button.setAttribute('aria-busy','false');button.textContent=original||'Email Estimate Request';}
    }
  });
}
