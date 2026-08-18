(()=>{
const pages={
 home:{label:'Home',file:'index.html',fields:[
  {key:'heroEyebrow',label:'Hero eyebrow',selector:'.hero .eyebrow',group:'Hero'},
  {key:'heroHeading',label:'Hero heading',selector:'.hero h1',group:'Hero',multiline:true},
  {key:'heroText',label:'Hero description',selector:'.hero p',group:'Hero',multiline:true},
  {key:'service1Image',label:'Commercial image',selector:'.expertise .card:nth-child(1) img',group:'Service cards',type:'image'},
  {key:'service1Title',label:'Commercial title',selector:'.expertise .card:nth-child(1) h3',group:'Service cards'},
  {key:'service1Text',label:'Commercial description',selector:'.expertise .card:nth-child(1) p',group:'Service cards',multiline:true},
  {key:'service2Image',label:'Government image',selector:'.expertise .card:nth-child(2) img',group:'Service cards',type:'image'},
  {key:'service2Title',label:'Government title',selector:'.expertise .card:nth-child(2) h3',group:'Service cards'},
  {key:'service2Text',label:'Government description',selector:'.expertise .card:nth-child(2) p',group:'Service cards',multiline:true},
  {key:'service3Image',label:'Residential image',selector:'.expertise .card:nth-child(3) img',group:'Service cards',type:'image'},
  {key:'service3Title',label:'Residential title',selector:'.expertise .card:nth-child(3) h3',group:'Service cards'},
  {key:'service3Text',label:'Residential description',selector:'.expertise .card:nth-child(3) p',group:'Service cards',multiline:true},
  {key:'familyImage',label:'Family / owner image',selector:'section .split > img',group:'Family section',type:'image'},
  {key:'familyHeading',label:'Family heading',selector:'section .split h2',group:'Family section'},
  {key:'familyText1',label:'Family description 1',selector:'section .split > div > p:nth-of-type(1)',group:'Family section',multiline:true},
  {key:'familyText2',label:'Family description 2',selector:'section .split > div > p:nth-of-type(2)',group:'Family section',multiline:true},
  {key:'ctaHeading',label:'CTA heading',selector:'.cta h2',group:'Bottom call to action'},
  {key:'ctaText',label:'CTA description',selector:'.cta p',group:'Bottom call to action',multiline:true}
 ]},
 services:{label:'Services',file:'services.html',fields:[
  {key:'heroEyebrow',label:'Hero eyebrow',selector:'.page-hero .eyebrow',group:'Hero'},
  {key:'heroHeading',label:'Hero heading',selector:'.page-hero h1',group:'Hero'},
  {key:'heroText',label:'Hero description',selector:'.page-hero p',group:'Hero',multiline:true},
  {key:'commercialTitle',label:'Commercial heading',selector:'.service-feature:nth-child(1) h2',group:'Commercial'},
  {key:'commercialText',label:'Commercial description',selector:'.service-feature:nth-child(1) p',group:'Commercial',multiline:true},
  {key:'governmentTitle',label:'Government heading',selector:'.service-feature:nth-child(2) h2',group:'Government'},
  {key:'governmentText',label:'Government description',selector:'.service-feature:nth-child(2) p',group:'Government',multiline:true},
  {key:'residentialTitle',label:'Residential heading',selector:'.service-feature:nth-child(3) h2',group:'Residential'},
  {key:'residentialText',label:'Residential description',selector:'.service-feature:nth-child(3) p',group:'Residential',multiline:true},
  {key:'capabilitiesHeading',label:'Capabilities heading',selector:'.capabilities h2',group:'Capabilities'},
  {key:'ctaHeading',label:'CTA heading',selector:'.cta h2',group:'Bottom call to action'},
  {key:'ctaText',label:'CTA description',selector:'.cta p',group:'Bottom call to action',multiline:true}
 ]},
 work:{label:'Our Work',file:'work.html',fields:[
  {key:'heroEyebrow',label:'Hero eyebrow',selector:'.page-hero .eyebrow',group:'Hero'},
  {key:'heroHeading',label:'Hero heading',selector:'.page-hero h1',group:'Hero'},
  {key:'heroText',label:'Hero description',selector:'.page-hero p',group:'Hero',multiline:true},
  {key:'residentialTitle',label:'Residential card title',selector:'.work-type-card.residential h2',group:'Portfolio cards'},
  {key:'residentialText',label:'Residential card description',selector:'.work-type-card.residential p',group:'Portfolio cards',multiline:true},
  {key:'commercialTitle',label:'Commercial card title',selector:'.work-type-card.commercial h2',group:'Portfolio cards'},
  {key:'commercialText',label:'Commercial card description',selector:'.work-type-card.commercial p',group:'Portfolio cards',multiline:true},
  {key:'federalTitle',label:'Federal card title',selector:'.work-type-card.federal h2',group:'Portfolio cards'},
  {key:'federalText',label:'Federal card description',selector:'.work-type-card.federal p',group:'Portfolio cards',multiline:true},
  {key:'ctaHeading',label:'CTA heading',selector:'.cta h2',group:'Bottom call to action'},
  {key:'ctaText',label:'CTA description',selector:'.cta p',group:'Bottom call to action',multiline:true}
 ]},
 about:{label:'About',file:'about.html',fields:[
  {key:'heroEyebrow',label:'Hero eyebrow',selector:'.page-hero .eyebrow',group:'Hero'},
  {key:'heroHeading',label:'Hero heading',selector:'.page-hero h1',group:'Hero'},
  {key:'heroText',label:'Hero description',selector:'.page-hero p',group:'Hero',multiline:true},
  {key:'ownerImage',label:'Matthew photo',selector:'section .split > img',group:'Owner',type:'image'},
  {key:'ownerName',label:'Owner heading',selector:'section .split h2',group:'Owner'},
  {key:'ownerText1',label:'Owner description 1',selector:'section .split > div > p:nth-of-type(1)',group:'Owner',multiline:true},
  {key:'ownerText2',label:'Owner description 2',selector:'section .split > div > p:nth-of-type(2)',group:'Owner',multiline:true},
  {key:'ownerText3',label:'Owner description 3',selector:'section .split > div > p:nth-of-type(3)',group:'Owner',multiline:true},
  ...[1,2,3,4].flatMap((n)=>[
   {key:`team${n}Image`,label:`Team member ${n} photo`,selector:`.team .person:nth-child(${n}) img`,group:'Team',type:'image'},
   {key:`team${n}Name`,label:`Team member ${n} name`,selector:`.team .person:nth-child(${n}) h3`,group:'Team'},
   {key:`team${n}Text`,label:`Team member ${n} description`,selector:`.team .person:nth-child(${n}) p`,group:'Team',multiline:true}
  ]),
  {key:'ctaHeading',label:'CTA heading',selector:'.cta h2',group:'Bottom call to action'},
  {key:'ctaText',label:'CTA description',selector:'.cta p',group:'Bottom call to action',multiline:true}
 ]},
 contact:{label:'Contact',file:'contact.html',fields:[
  {key:'heroEyebrow',label:'Hero eyebrow',selector:'.page-hero .eyebrow',group:'Hero'},
  {key:'heroHeading',label:'Hero heading',selector:'.page-hero h1',group:'Hero'},
  {key:'heroText',label:'Hero description',selector:'.page-hero p',group:'Hero',multiline:true},
  {key:'businessHeading',label:'Contact card heading',selector:'.contact-card h2',group:'Contact card'},
  {key:'formPlaceholder',label:'Project details placeholder',selector:'#message',group:'Estimate form',attr:'placeholder',multiline:true},
  {key:'formButton',label:'Submit button text',selector:'[data-contact-form] button[type="submit"]',group:'Estimate form'}
 ]},
 residential:{label:'Residential',file:'residential.html',fields:portfolioFields('Residential')},
 commercial:{label:'Commercial',file:'commercial.html',fields:portfolioFields('Commercial')},
 federal:{label:'Federal',file:'federal.html',fields:portfolioFields('Federal')}
};
function portfolioFields(){return[
 {key:'heroEyebrow',label:'Hero eyebrow',selector:'.page-hero .eyebrow',group:'Hero'},
 {key:'heroHeading',label:'Hero heading',selector:'.page-hero h1',group:'Hero'},
 {key:'heroText',label:'Hero description',selector:'.page-hero p',group:'Hero',multiline:true},
 {key:'ctaHeading',label:'CTA heading',selector:'.cta h2',group:'Bottom call to action'},
 {key:'ctaText',label:'CTA description',selector:'.cta p',group:'Bottom call to action',multiline:true}
];}
window.DAC_PAGE_SCHEMA=pages;
function currentPageKey(){const file=(location.pathname.split('/').pop()||'index.html').toLowerCase();return Object.keys(pages).find(key=>pages[key].file===file)||(file===''?'home':'');}
function applyContent(page,content){for(const field of page.fields){const value=content?.[field.key];if(typeof value!=='string'||!value)continue;const el=document.querySelector(field.selector);if(!el)continue;if(field.type==='image'){el.src=value;el.removeAttribute('srcset');}else if(field.attr){el.setAttribute(field.attr,value);}else{el.textContent=value;}}}
async function hydrate(){const key=currentPageKey();const page=pages[key];if(!page)return;try{const response=await fetch(`/api/site-content?page=${encodeURIComponent(key)}`,{cache:'no-store'});if(!response.ok)return;const data=await response.json();applyContent(page,data.content||{});}catch(error){console.warn('Page content overrides could not be loaded.',error);}}
hydrate();
})();
