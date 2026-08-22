(()=>{
  const CATEGORIES={retail:'Retail',medical:'Medical','auto-dealerships':'Auto Dealerships',schools:'Schools',wineries:'Wineries',general:'General'};
  const projectType=document.getElementById('projectJobType');
  const categoryField=document.getElementById('commercialCategoryField');
  const categorySelect=document.getElementById('projectCommercialCategory');
  const projectList=document.getElementById('projectList');
  if(!projectType||!categoryField||!categorySelect||!projectList)return;

  const projectMeta=new Map();
  const originalFetch=window.fetch.bind(window);

  function syncCreateField(){
    const commercial=projectType.value==='commercial';
    categoryField.hidden=!commercial;
    categorySelect.disabled=!commercial;
  }

  function decorateProjects(projects=[]){
    projects.forEach(project=>projectMeta.set(project.id,project));
    decorateRows();
  }

  function decorateRows(){
    projectList.querySelectorAll('.project-row').forEach(row=>{
      const project=projectMeta.get(row.dataset.projectId);
      if(!project||project.jobType!=='commercial')return;
      const summary=row.querySelector('.project-summary');
      if(summary&&!summary.querySelector('.commercial-category-badge')){
        const badge=document.createElement('small');
        badge.className='commercial-category-badge';
        badge.textContent=`Commercial category: ${CATEGORIES[project.commercialCategory]||'General'}`;
        summary.appendChild(badge);
      }
      const form=row.querySelector('.project-edit-form');
      if(form&&!form.querySelector('.edit-commercial-category')){
        const fields=form.querySelector('.project-edit-fields');
        if(fields){
          const label=document.createElement('label');
          label.textContent='Commercial category';
          const select=document.createElement('select');
          select.className='edit-commercial-category';
          Object.entries(CATEGORIES).forEach(([value,text])=>{
            const option=document.createElement('option');
            option.value=value;option.textContent=text;
            if(value===(project.commercialCategory||'general'))option.selected=true;
            select.appendChild(option);
          });
          label.appendChild(select);
          fields.appendChild(label);
        }
      }
    });
  }

  window.fetch=async function(input,init){
    const url=typeof input==='string'?input:(input?.url||'');
    const method=String(init?.method||'GET').toUpperCase();
    let nextInit=init;
    if(url.includes('/api/admin/projects')&&['POST','PATCH'].includes(method)&&init?.body){
      try{
        const body=JSON.parse(init.body);
        if(method==='POST'&&body.jobType==='commercial')body.commercialCategory=categorySelect.value||'general';
        if(method==='PATCH'){
          const row=projectList.querySelector(`.project-row[data-project-id="${CSS.escape(body.id||'')}"]`);
          const editCategory=row?.querySelector('.edit-commercial-category');
          if(editCategory)body.commercialCategory=editCategory.value;
        }
        nextInit={...init,body:JSON.stringify(body)};
      }catch{}
    }
    const response=await originalFetch(input,nextInit);
    if(url.includes('/api/admin/projects')&&method==='GET'&&response.ok){
      response.clone().json().then(data=>decorateProjects(data.projects||[])).catch(()=>{});
    }
    if(url.includes('/api/admin/projects')&&['POST','PATCH'].includes(method)&&response.ok){
      response.clone().json().then(data=>{if(data.project){projectMeta.set(data.project.id,data.project);setTimeout(decorateRows,0);}}).catch(()=>{});
    }
    return response;
  };

  projectType.addEventListener('change',syncCreateField);
  new MutationObserver(decorateRows).observe(projectList,{childList:true,subtree:true});
  syncCreateField();
  originalFetch('/api/admin/projects').then(r=>r.ok?r.json():null).then(data=>{if(data)decorateProjects(data.projects||[]);}).catch(()=>{});
})();
