(()=>{
  const root=document.getElementById('projectGalleryList');
  if(!root)return;
  const type=(root.dataset.jobType||'').toLowerCase();
  const CATEGORY_ORDER=['retail','medical','auto-dealerships','general'];
  const CATEGORY_LABELS={retail:'Retail',medical:'Medical','auto-dealerships':'Auto Dealerships',general:'General'};
  const escapeHtml=value=>String(value||'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  let activePhotos=[],activeIndex=0,lastTrigger=null;
  const lightbox=document.createElement('div');
  lightbox.className='gallery-lightbox';
  lightbox.hidden=true;
  lightbox.innerHTML='<div class="gallery-lightbox-backdrop" data-close></div><div class="gallery-lightbox-dialog" role="dialog" aria-modal="true" aria-label="Project photo viewer"><button class="gallery-lightbox-close" type="button" aria-label="Close photo viewer">×</button><button class="gallery-lightbox-prev" type="button" aria-label="Previous photo">‹</button><figure><img alt=""><figcaption></figcaption></figure><button class="gallery-lightbox-next" type="button" aria-label="Next photo">›</button><div class="gallery-lightbox-count" aria-live="polite"></div></div>';
  document.body.appendChild(lightbox);
  const img=lightbox.querySelector('img'),caption=lightbox.querySelector('figcaption'),count=lightbox.querySelector('.gallery-lightbox-count'),prev=lightbox.querySelector('.gallery-lightbox-prev'),next=lightbox.querySelector('.gallery-lightbox-next'),close=lightbox.querySelector('.gallery-lightbox-close');
  function show(index){if(!activePhotos.length)return;activeIndex=(index+activePhotos.length)%activePhotos.length;const photo=activePhotos[activeIndex];img.src=photo.url;img.alt=photo.alt||'Project photo';caption.textContent=photo.title||photo.alt||'';count.textContent=`${activeIndex+1} of ${activePhotos.length}`;const single=activePhotos.length<2;prev.hidden=single;next.hidden=single;}
  function openViewer(projectIndex,photoIndex,trigger){const details=root.querySelectorAll('.project-group')[projectIndex];if(!details)return;activePhotos=JSON.parse(details.dataset.photos||'[]');lastTrigger=trigger;show(photoIndex);lightbox.hidden=false;document.body.classList.add('lightbox-open');close.focus();}
  function closeViewer(){lightbox.hidden=true;document.body.classList.remove('lightbox-open');img.removeAttribute('src');if(lastTrigger)lastTrigger.focus();}
  prev.addEventListener('click',()=>show(activeIndex-1));next.addEventListener('click',()=>show(activeIndex+1));close.addEventListener('click',closeViewer);lightbox.addEventListener('click',e=>{if(e.target.matches('[data-close]'))closeViewer();});document.addEventListener('keydown',e=>{if(lightbox.hidden)return;if(e.key==='Escape')closeViewer();if(e.key==='ArrowLeft')show(activeIndex-1);if(e.key==='ArrowRight')show(activeIndex+1);});
  root.addEventListener('click',event=>{const button=event.target.closest('.project-photo-button');if(!button||!root.contains(button))return;openViewer(Number(button.dataset.projectIndex),Number(button.dataset.photoIndex),button);});
  root.addEventListener('toggle',event=>{const details=event.target;if(!(details instanceof HTMLDetailsElement)||!details.classList.contains('project-group')||!details.open||details.dataset.loaded==='true')return;const photos=JSON.parse(details.dataset.photos||'[]');const grid=details.querySelector('.project-photo-grid');if(!grid)return;if(!photos.length){grid.innerHTML='<div class="gallery-empty">Photos for this project are being added.</div>';details.dataset.loaded='true';return;}const projectIndex=Number(details.dataset.projectIndex);const projectName=details.dataset.projectName||'project';grid.innerHTML=photos.map((photo,photoIndex)=>`<button class="project-photo-button" type="button" data-project-index="${projectIndex}" data-photo-index="${photoIndex}" aria-label="Open photo ${photoIndex+1} of ${photos.length} in ${escapeHtml(projectName)}"><img src="${escapeHtml(photo.url)}" alt="${escapeHtml(photo.alt)}" loading="lazy"></button>`).join('');details.dataset.loaded='true';},true);
  function projectHtml(project,index){const photos=project.photos||[];const cover=photos.find(photo=>photo.featured)||photos[0];const description=project.description?`<p>${escapeHtml(project.description)}</p>`:'';const safePhotos=escapeHtml(JSON.stringify(photos.map(({url,alt,title,featured})=>({url,alt,title,featured:Boolean(featured)}))));const coverHtml=cover?`<div class="project-cover"><img src="${escapeHtml(cover.url)}" alt="${escapeHtml(cover.alt)}" loading="lazy"></div>`:'<div class="project-cover" aria-hidden="true"></div>';return `<details class="project-group" data-project-index="${index}" data-project-name="${escapeHtml(project.name)}" data-photos="${safePhotos}"><summary>${coverHtml}<div class="project-group-title"><span class="eyebrow">${escapeHtml(type)} project</span><h2>${escapeHtml(project.name)}</h2>${description}</div><span class="project-count">${photos.length} photo${photos.length===1?'':'s'}</span></summary><div class="project-photo-grid"></div></details>`;}
  function render(projects){
    if(!projects.length){root.innerHTML='<div class="gallery-empty">Project photos are being prepared for this section.</div>';return;}
    if(type==='commercial'){
      let projectIndex=0;
      root.innerHTML=CATEGORY_ORDER.map(category=>{const group=projects.filter(project=>(project.commercialCategory||'general')===category);const cards=group.length?group.map(project=>projectHtml(project,projectIndex++)).join(''):'<div class="gallery-empty">No projects have been added to this category yet.</div>';return `<section class="commercial-category-group" data-commercial-category="${category}"><div class="commercial-category-head"><h2>${CATEGORY_LABELS[category]}</h2><span>${group.length} project${group.length===1?'':'s'}</span></div><div class="commercial-category-projects">${cards}</div></section>`;}).join('');
    }else{
      root.innerHTML=projects.map((project,index)=>projectHtml(project,index)).join('');
    }
  }
  fetch(`/api/projects?type=${encodeURIComponent(type)}`).then(async response=>{if(!response.ok)throw new Error('Gallery unavailable');return response.json();}).then(({projects=[]})=>render(projects)).catch(()=>{root.innerHTML='<div class="gallery-empty">Project gallery is temporarily unavailable.</div>';});
})();
