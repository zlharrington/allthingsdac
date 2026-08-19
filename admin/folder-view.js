(()=>{
  const grid=document.getElementById('photoGrid');
  if(!grid)return;

  const CATEGORY_LABELS={commercial:'Commercial',residential:'Residential',federal:'Federal','site-images':'Site Images'};
  const COMMERCIAL_LABELS={retail:'Retail',medical:'Medical','auto-dealerships':'Auto Dealerships',general:'General'};
  let projects=[];
  let photos=[];
  let rebuilding=false;
  let scheduled=false;

  async function getJson(url){
    const response=await fetch(url,{cache:'no-store'});
    if(!response.ok)throw new Error(`Request failed (${response.status})`);
    return response.json();
  }

  function folder(title,open=false,extraClass=''){
    const details=document.createElement('details');
    details.className=`photo-folder ${extraClass}`.trim();
    details.open=open;
    const summary=document.createElement('summary');
    const name=document.createElement('span');
    name.className='photo-folder-name';
    name.textContent=title;
    const count=document.createElement('span');
    count.className='photo-folder-count';
    summary.append(name,count);
    const contents=document.createElement('div');
    contents.className='photo-folder-contents';
    details.append(summary,contents);
    details._contents=contents;
    details._count=count;
    return details;
  }

  function cardMap(){
    return new Map([...grid.querySelectorAll('.admin-card[data-key]')].map(card=>[card.dataset.key,card]));
  }

  function setCount(node,count){
    node._count.textContent=`${count} image${count===1?'':'s'}`;
  }

  function appendCards(container,items,cards){
    if(!items.length){
      const empty=document.createElement('p');
      empty.className='photo-folder-empty';
      empty.textContent='No images in this folder.';
      container.appendChild(empty);
      return;
    }
    const cardsGrid=document.createElement('div');
    cardsGrid.className='photo-folder-grid';
    items.forEach(photo=>{
      const card=cards.get(photo.key);
      if(card)cardsGrid.appendChild(card);
    });
    container.appendChild(cardsGrid);
  }

  function projectPhotos(projectId){return photos.filter(photo=>photo.projectId===projectId);}

  function buildProjectFolder(project,cards){
    const items=projectPhotos(project.id);
    const node=folder(project.name,false,'project-folder');
    setCount(node,items.length);
    if(project.description){
      const description=document.createElement('p');
      description.className='photo-folder-description';
      description.textContent=project.description;
      node._contents.appendChild(description);
    }
    appendCards(node._contents,items,cards);
    return node;
  }

  function buildCommercial(cards){
    const allCommercial=projects.filter(project=>project.jobType==='commercial');
    const total=allCommercial.reduce((sum,project)=>sum+projectPhotos(project.id).length,0);
    const category=folder('Commercial',true,'category-folder');
    setCount(category,total);
    Object.entries(COMMERCIAL_LABELS).forEach(([key,label])=>{
      const matches=allCommercial.filter(project=>(project.commercialCategory||'general')===key);
      const subTotal=matches.reduce((sum,project)=>sum+projectPhotos(project.id).length,0);
      const sub=folder(label,false,'subcategory-folder');
      setCount(sub,subTotal);
      if(matches.length){matches.forEach(project=>sub._contents.appendChild(buildProjectFolder(project,cards)));}
      else{
        const empty=document.createElement('p');
        empty.className='photo-folder-empty';
        empty.textContent='No projects in this folder.';
        sub._contents.appendChild(empty);
      }
      category._contents.appendChild(sub);
    });
    return category;
  }

  function buildSimpleCategory(type,cards){
    const matches=projects.filter(project=>project.jobType===type);
    const total=matches.reduce((sum,project)=>sum+projectPhotos(project.id).length,0);
    const category=folder(CATEGORY_LABELS[type],true,'category-folder');
    setCount(category,total);
    if(matches.length){matches.forEach(project=>category._contents.appendChild(buildProjectFolder(project,cards)));}
    else{
      const empty=document.createElement('p');
      empty.className='photo-folder-empty';
      empty.textContent='No projects in this folder.';
      category._contents.appendChild(empty);
    }
    return category;
  }

  function buildSiteImages(cards){
    const items=photos.filter(photo=>photo.projectId==='site-images'||photo.category==='Site Image');
    const category=folder('Site Images',true,'category-folder site-images-folder');
    setCount(category,items.length);
    appendCards(category._contents,items,cards);
    return category;
  }

  function rebuild(){
    if(rebuilding)return;
    const cards=cardMap();
    if(!cards.size&&photos.length)return;
    rebuilding=true;
    try{
      const tree=document.createElement('div');
      tree.className='photo-folder-tree';
      tree.append(
        buildCommercial(cards),
        buildSimpleCategory('residential',cards),
        buildSimpleCategory('federal',cards),
        buildSiteImages(cards)
      );
      grid.replaceChildren(tree);
      grid.classList.add('folder-view-active');
    }finally{
      rebuilding=false;
    }
  }

  async function refreshFolderData(){
    try{
      const [projectData,photoData]=await Promise.all([getJson('/api/admin/projects'),getJson('/api/admin/photos')]);
      projects=projectData.projects||[];
      photos=photoData.photos||[];
      requestAnimationFrame(rebuild);
    }catch(error){console.warn('Folder view could not refresh.',error);}
  }

  const observer=new MutationObserver(()=>{
    if(rebuilding||scheduled)return;
    if(!grid.querySelector(':scope > .admin-card')&&!grid.querySelector(':scope > p'))return;
    scheduled=true;
    requestAnimationFrame(()=>{scheduled=false;refreshFolderData();});
  });
  observer.observe(grid,{childList:true});

  document.getElementById('refresh')?.addEventListener('click',()=>setTimeout(refreshFolderData,50));
  window.addEventListener('load',()=>setTimeout(refreshFolderData,100));
})();
