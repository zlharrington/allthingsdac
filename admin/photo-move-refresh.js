(()=>{
  const grid=document.getElementById('photoGrid');
  const status=document.getElementById('status');
  const refresh=document.getElementById('refresh');
  if(!grid||!status||!refresh)return;

  let pendingSave=false;
  grid.addEventListener('click',event=>{
    if(event.target.closest('.save-photo'))pendingSave=true;
  });

  new MutationObserver(()=>{
    if(!pendingSave)return;
    const message=status.textContent.trim();
    if(status.classList.contains('error')){
      pendingSave=false;
      return;
    }
    if(message==='Saved.'){
      pendingSave=false;
      refresh.click();
    }
  }).observe(status,{childList:true,subtree:true,characterData:true});
})();
