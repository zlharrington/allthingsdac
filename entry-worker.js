import baseWorker from './worker.js';
import {handleMoveGalleryPhotoToSite} from './site-content-api.js';
import {handleOwnerLogin,handleAdminSessionInfo,handleClientPermissions,authorizeAdminFeature} from './admin-access-api.js';

const SITE_IMAGES_ID='site-images';
const SITE_IMAGES_PREFIX='site-images/';
const MAX_FILE_BYTES=15*1024*1024;
const MIME_EXTENSIONS={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/avif':'avif'};

function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});}
function clean(value,max=160){return String(value||'').trim().slice(0,max);}
function isGalleryAdminPath(pathname){return pathname==='/api/admin/photos'||pathname==='/api/admin/projects';}
function isSiteEditorAdminPath(pathname){return pathname==='/api/admin/site-content'||pathname==='/api/admin/site-image';}

function siteImageToPhoto(object){
 const meta=object.customMetadata||{};
 const file=object.key.slice(SITE_IMAGES_PREFIX.length);
 return{key:object.key,file,url:`/site-media/${encodeURIComponent(file)}`,title:meta.title||'',alt:meta.alt||'',category:'Site Image',jobType:'',projectId:SITE_IMAGES_ID,published:false,featured:false,createdAt:meta.createdAt||object.uploaded?.toISOString?.()||'',uploadedBy:meta.uploadedBy||'',size:object.size||0};
}

async function listSiteImages(bucket){
 let cursor;const objects=[];
 do{
  const page=await bucket.list({prefix:SITE_IMAGES_PREFIX,limit:1000,cursor,include:['customMetadata','httpMetadata']});
  objects.push(...page.objects);
  cursor=page.truncated?page.cursor:undefined;
 }while(cursor);
 return objects.sort((a,b)=>String(b.customMetadata?.createdAt||'').localeCompare(String(a.customMetadata?.createdAt||''))).map(siteImageToPhoto);
}

async function uploadSiteImage(form,env,adminUser){
 const file=form.get('file');
 if(!file||typeof file.stream!=='function')return json({error:'Choose an image to upload.'},400);
 if(!MIME_EXTENSIONS[file.type])return json({error:'Use JPG, PNG, WebP, or AVIF images.'},400);
 if(file.size>MAX_FILE_BYTES)return json({error:'Images must be 15 MB or smaller.'},413);
 const ext=MIME_EXTENSIONS[file.type];
 const fileName=`${Date.now()}-${crypto.randomUUID()}.${ext}`;
 const key=`${SITE_IMAGES_PREFIX}${fileName}`;
 const title=clean(form.get('title'),120);
 const alt=clean(form.get('alt'),180)||title||'All Things Drywall & Construction site image';
 const createdAt=new Date().toISOString();
 const object=await env.GALLERY_BUCKET.put(key,file.stream(),{httpMetadata:{contentType:file.type,cacheControl:'public, max-age=31536000, immutable'},customMetadata:{title,alt,category:'Site Image',jobType:'',projectId:SITE_IMAGES_ID,published:'false',featured:'false',createdAt,uploadedBy:adminUser||''}});
 if(!object)return json({error:'Upload failed.'},500);
 return json({photo:siteImageToPhoto(object)},201);
}

async function handleSiteImageMutation(request,env){
 let body;
 try{body=await request.clone().json();}catch{return null;}
 const key=clean(body.key,300);
 if(!key.startsWith(SITE_IMAGES_PREFIX))return null;
 if(request.method==='DELETE'){
  await env.GALLERY_BUCKET.delete(key);
  return json({ok:true});
 }
 if(request.method==='PATCH'){
  const existing=await env.GALLERY_BUCKET.get(key);
  if(!existing||!('body'in existing))return json({error:'Photo not found.'},404);
  const old=existing.customMetadata||{};
  const updated={...old,title:clean(body.title??old.title,120),alt:clean(body.alt??old.alt,180),category:'Site Image',jobType:'',projectId:SITE_IMAGES_ID,published:'false',featured:'false'};
  const bytes=await existing.arrayBuffer();
  const saved=await env.GALLERY_BUCKET.put(key,bytes,{httpMetadata:existing.httpMetadata,customMetadata:updated});
  return json({photo:siteImageToPhoto(saved)});
 }
 return null;
}

async function handleAdminPhotosThroughEntry(request,env,ctx,adminUser){
 if(request.method==='POST'){
  let form;
  try{form=await request.clone().formData();}catch{return baseWorker.fetch(request,env,ctx);}
  if(clean(form.get('projectId'),80)===SITE_IMAGES_ID||clean(form.get('jobType'),40).toLowerCase()===SITE_IMAGES_ID){
   return uploadSiteImage(form,env,adminUser);
  }
  return baseWorker.fetch(request,env,ctx);
 }
 if(request.method==='PATCH'||request.method==='DELETE'){
  const handled=await handleSiteImageMutation(request,env);
  if(handled)return handled;
  return baseWorker.fetch(request,env,ctx);
 }
 if(request.method==='GET'){
  const baseResponse=await baseWorker.fetch(request,env,ctx);
  if(!baseResponse.ok)return baseResponse;
  let data;
  try{data=await baseResponse.clone().json();}catch{return baseResponse;}
  const siteImages=await listSiteImages(env.GALLERY_BUCKET);
  return json({photos:[...siteImages,...(data.photos||[])]});
 }
 return baseWorker.fetch(request,env,ctx);
}

async function handleSiteMedia(pathname,env){
 const encoded=pathname.slice('/site-media/'.length);
 if(!encoded)return new Response('Not found',{status:404});
 let file;try{file=decodeURIComponent(encoded);}catch{return new Response('Bad request',{status:400});}
 if(!file||file.includes('/')||file.includes('..'))return new Response('Not found',{status:404});
 const object=await env.GALLERY_BUCKET.get(`${SITE_IMAGES_PREFIX}${file}`);
 if(!object)return new Response('Not found',{status:404});
 const headers=new Headers();
 object.writeHttpMetadata(headers);
 headers.set('etag',object.httpEtag);
 headers.set('cache-control','public, max-age=86400, stale-while-revalidate=604800');
 headers.set('x-content-type-options','nosniff');
 return new Response('body'in object?object.body:null,{status:'body'in object?200:412,headers});
}

export default{
 async fetch(request,env,ctx){
  const url=new URL(request.url);
  if(url.pathname==='/api/admin/owner-login')return handleOwnerLogin(request,env);
  if(url.pathname==='/api/admin/session')return handleAdminSessionInfo(request,env);
  if(url.pathname==='/api/admin/permissions')return handleClientPermissions(request,env);
  if(url.pathname.startsWith('/site-media/')&&request.method==='GET')return handleSiteMedia(url.pathname,env);
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
   if(url.pathname==='/api/admin/photos')return handleAdminPhotosThroughEntry(request,env,ctx,access.session.username);
  }
  if(isSiteEditorAdminPath(url.pathname)){
   const access=await authorizeAdminFeature(request,env,'siteEditor');
   if(access.response)return access.response;
  }
  return baseWorker.fetch(request,env,ctx);
 }
};
