const style=document.createElement('style');style.textContent='.site-header .brand-logo{background:transparent!important;padding:0!important;border-radius:0!important;box-shadow:none!important}.footer-logo{background:transparent!important;padding:0!important;border-radius:0!important;box-shadow:none!important}';document.head.appendChild(style);

function wireLegacyNavigation(){const toggle=document.querySelector('.mobile-toggle');const nav=document.querySelector('.nav-links');if(toggle&&nav){toggle.addEventListener('click',()=>{const open=nav.classList.toggle('open');toggle.setAttribute('aria-expanded',String(open));});document.querySelectorAll('.nav-links a').forEach(a=>a.addEventListener('click',()=>nav.classList.remove('open')));}}

function loadScript(src){return new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=src;script.crossOrigin='anonymous';script.onload=resolve;script.onerror=reject;document.head.appendChild(script);});}

async function mountReactLayout(){try{if(!window.React)await loadScript('https://unpkg.com/react@18.3.1/umd/react.production.min.js');if(!window.ReactDOM)await loadScript('https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js');await loadScript('components.js');return true;}catch(error){console.warn('Shared React components could not load; using static page layout.',error);return false;}}

wireLegacyNavigation();
window.allThingsReactReady=mountReactLayout();

const form=document.querySelector('[data-contact-form]');if(form){form.addEventListener('submit',e=>{e.preventDefault();const data=new FormData(form);const subject=encodeURIComponent('Estimate Request — '+(data.get('name')||'Website'));const body=encodeURIComponent(`Name: ${data.get('name')||''}\nPhone: ${data.get('phone')||''}\nEmail: ${data.get('email')||''}\n\nProject details:\n${data.get('message')||''}`);window.location.href=`mailto:matt@allthingsdac.com?subject=${subject}&body=${body}`;});}
