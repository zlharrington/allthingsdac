import baseWorker from './worker.js';
import {handleMoveGalleryPhotoToSite} from './site-content-api.js';
import {handleOwnerLogin,handleAdminSessionInfo,handleClientPermissions,authorizeAdminFeature} from './admin-access-api.js';

function isGalleryAdminPath(pathname){return pathname==='/api/admin/photos'||pathname==='/api/admin/projects';}
function isSiteEditorAdminPath(pathname){return pathname==='/api/admin/site-content'||pathname==='/api/admin/site-image';}

export default{
 async fetch(request,env,ctx){
  const url=new URL(request.url);
  if(url.pathname==='/api/admin/owner-login')return handleOwnerLogin(request,env);
  if(url.pathname==='/api/admin/session')return handleAdminSessionInfo(request,env);
  if(url.pathname==='/api/admin/permissions')return handleClientPermissions(request,env);
  if(url.pathname==='/api/admin/move-site-image'){
   const galleryAccess=await authorizeAdminFeature(request,env,'gallery');
   if(galleryAccess.response)return galleryAccess.response;
   const siteAccess=await authorizeAdminFeature(request,env,'siteEditor');
   if(siteAccess.response)return siteAccess.response;
   return handleMoveGalleryPhotoToSite(request,env,galleryAccess.session.username);
  }
  if(isGalleryAdminPath(url.pathname)){
   const access=await authorizeAdminFeature(request,env,'gallery');
   if(access.response)return access.response;
  }
  if(isSiteEditorAdminPath(url.pathname)){
   const access=await authorizeAdminFeature(request,env,'siteEditor');
   if(access.response)return access.response;
  }
  return baseWorker.fetch(request,env,ctx);
 }
};
