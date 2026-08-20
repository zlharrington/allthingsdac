import baseWorker from './worker.js';
import {handleMoveGalleryPhotoToSite} from './site-content-api.js';
import {handleOwnerLogin,handleAdminSessionInfo,handleClientPermissions,authorizeAdminFeature} from './admin-access-api.js';
import {handleGoogleReviews} from './google-reviews-api.js';

const SITE_IMAGES_ID='site-images';
const SITE_IMAGES_PREFIX='site-images/';
const PROJECT_CATEGORIES=['commercial','residential','federal'];
const MAX_FILE_BYTES=15*1024*1024;
const MIME_EXTENSIONS={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/avif':'avif'};

function json(data,status=200,cacheControl='no-store'){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':cacheControl}});}
function clean(value,max=160){return String(value||'').trim().slice(0,max);}
function cleanCategory(value){const category=clean(value,40).toLowerCase();return PROJECT_CATEGORIES.includes(category)?category:'';}
function isGalleryAdminPath(pathname){return pathname==='/api/admin/photos'||pathname==='/api/admin/projects';}
function isSiteEditorAdminPath(pathname){return pathname==='/api/admin/site-content'||pathname==='/api/admin/site-image';}
function isProjectImageKey(key){return PROJECT_CATEGORIES.some(category=>key.startsWith(`${category}/`));}

function siteImageToPhoto(object){
 const meta=object.customMetadata||{};
 const file=object.key.slice(SITE_IMAGES_PREFIX.length);
 return{key:object.key,file,url:`/media/site/${encodeURIComponent(file)}?source=site-images`,title:meta.title||'',alt:meta.alt||'',category:'Site Image',jobType:'',projectId:SITE_IMAGES_ID,published:false,featured:false,createdAt:meta.createdAt||object.uploaded?.toISOString?.()||'',uploadedBy:meta.uploadedBy||'',size:object.size||0};
}

function projectImageToPhoto(object){
 const meta=object.customMetadata||{};
 const parts=object.key.split('/');
 const jobType=cleanCategory(meta.jobType||parts[0]);
 const projectId=meta.projectId||parts[1]||'';
 const file=parts.slice(2).join('/');
 return{key:object.key,file,url:`/project-media/${encodeURIComponent(jobType)}/${encodeURIComponent(projectId)}/${encodeURIComponent(file)}`,title:meta.title||'',alt:meta.alt||'',category:meta.category||(jobType?jobType.charAt(0).toUpperCase()+jobType.slice(1):'Project'),jobType,projectId,published:meta.published==='true',featured:meta.featured==='true',createdAt:meta.createdAt||object.uploaded?.toISOString?.()||'',uploadedBy:meta.uploadedBy||'',size:object.size||0};
}

async function listPrefix(bucket,prefix){
 let cursor;const objects=[];
 do{
  const page=await bucket.list({prefix,limit:1000,cursor,include:['customMetadata','httpMetadata']});
  objects.push(...page.objects);
  cursor=page.truncated?page.cursor:undefined;
 }while(cursor);
 return objects;
}

async function listSiteImages(bucket){
 const objects=await listPrefix(bucket,SITE_IMAGES_PREFIX);
 return objects.sort((a,b)=>String(b.customMetadata?.createdAt||'').localeCompare(String(a.customMetadata?.createdAt||''))).map(siteImageToPhoto);
}

async function listProjectImages(bucket){
 const groups=await Promise.all(PROJECT_CATEGORIES.map(category=>listPrefix(bucket,`${category}/`)));
 return groups.flat().sort((a,b)=>String(b.customMetadata?.createdAt||'').localeCompare(String(a.customMetadata?.createdAt||''))).map(projectImageToPhoto);
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

async function uploadProjectImage(form,env,adminUser){
 const file=form.get('file');
 if(!file||typeof file.stream!=='function')return json({error:'Choose an image to upload.'},400);
 if(!MIME_EXTENSIONS[file.type])return json({error:'Use JPG, PNG, WebP, or AVIF images.'},400);
 if(file.size>MAX_FILE_BYTES)return json({error:'Images must be 15 MB or smaller.'},413);
 const jobType=cleanCategory(form.get('jobType'));
 const projectId=clean(form.get('projectId'),80);
 if(!jobType||!projectId)return json({error:'Choose a job type and project.'},400);
 const project=await env.GALLERY_BUCKET.head(`projects/${projectId}.json`);
 if(!project)return json({error:'Selected project no longer exists.'},400);
 if(cleanCategory(project.customMetadata?.jobType)!==jobType)return json({error:'Selected project does not match the job type.'},400);
 const ext=MIME_EXTENSIONS[file.type];
 const fileName=`${Date.now()}-${crypto.randomUUID()}.${ext}`;
 const key=`${jobType}/${projectId}/${fileName}`;
 const title=clean(form.get('title'),120);
 const alt=clean(form.get('alt'),180)||title||'All Things Drywall & Construction project photo';
 const published=String(form.get('published'))==='true';
 const createdAt=new Date().toISOString();
 const object=await env.GALLERY_BUCKET.put(key,file.stream(),{httpMetadata:{contentType:file.type,cacheControl:'public, max-age=31536000, immutable'},customMetadata:{title,alt,category:jobType.charAt(0).toUpperCase()+jobType.slice(1),jobType,projectId,published:String(published),featured:'false',createdAt,uploadedBy:adminUser||''}});
 if(!object)return json({error:'Upload failed.'},500);
 return json({photo:projectImageToPhoto(object)},201);
}

async function handleImageMutation(request,env){
 let body;
 try{body=await request.clone().json();}catch{return null;}
 const key=clean(body.key,300);
 const siteImage=key.startsWith(SITE_IMAGES_PREFIX);
 const projectImage=isProjectImageKey(key);
 if(!siteImage&&!projectImage)return null;
 if(request.method==='DELETE'){
  await env.GALLERY_BUCKET.delete(key);
  return json({ok:true});
 }
 if(request.method==='PATCH'){
  const existing=await env.GALLERY_BUCKET.get(key);
  if(!existing||!('body'in existing))return json({error:'Photo not found.'},404);
  const old=existing.customMetadata||{};
  const parts=key.split('/');
  const currentJobType=siteImage?'':cleanCategory(old.jobType||parts[0]);
  const currentProjectId=siteImage?SITE_IMAGES_ID:(old.projectId||parts[1]||'');
  const requestedProjectId=body.projectId===undefined?currentProjectId:clean(body.projectId,80);
  const requestedJobType=body.jobType===undefined?currentJobType:cleanCategory(body.jobType);
  const targetSiteImage=requestedProjectId===SITE_IMAGES_ID;
  if(!targetSiteImage&&(!requestedJobType||!requestedProjectId))return json({error:'Choose both a job type and project, or choose Site Images.'},400);
  if(!targetSiteImage){
   const project=await env.GALLERY_BUCKET.head(`projects/${requestedProjectId}.json`);
   if(!project)return json({error:'Selected project no longer exists.'},400);
   if(cleanCategory(project.customMetadata?.jobType)!==requestedJobType)return json({error:'Selected project does not match the job type.'},400);
  }
  const file=siteImage?key.slice(SITE_IMAGES_PREFIX.length):parts.slice(2).join('/');
  if(!file)return json({error:'Photo filename is invalid.'},400);
  const destinationKey=targetSiteImage?`${SITE_IMAGES_PREFIX}${file}`:`${requestedJobType}/${requestedProjectId}/${file}`;
  const destinationChanged=destinationKey!==key;
  const updated=targetSiteImage
   ?{...old,title:clean(body.title??old.title,120),alt:clean(body.alt??old.alt,180),category:'Site Image',jobType:'',projectId:SITE_IMAGES_ID,published:'false',featured:'false'}
   :{...old,title:clean(body.title??old.title,120),alt:clean(body.alt??old.alt,180),jobType:requestedJobType,projectId:requestedProjectId,category:requestedJobType.charAt(0).toUpperCase()+requestedJobType.slice(1),published:String(body.published===undefined?old.published==='true':body.published===true),featured:String(destinationChanged?false:(body.featured===undefined?old.featured==='true':body.featured===true))};
  const bytes=await existing.arrayBuffer();
  const saved=await env.GALLERY_BUCKET.put(destinationKey,bytes,{httpMetadata:existing.httpMetadata,customMetadata:updated});
  if(destinationChanged)await env.GALLERY_BUCKET.delete(key);
  return json({photo:targetSiteImage?siteImageToPhoto(saved):projectImageToPhoto(saved),moved:destinationChanged,previousKey:key});
 }
 return null;
}

async function handleAdminPhotosThroughEntry(request,env,ctx,adminUser){
 if(request.method==='POST'){
  let form;
  try{form=await request.clone().formData();}catch{return baseWorker.fetch(request,env,ctx);}
  if(clean(form.get('projectId'),80)===SITE_IMAGES_ID||clean(form.get('jobType'),40).toLowerCase()===SITE_IMAGES_ID)return uploadSiteImage(form,env,adminUser);
  return uploadProjectImage(form,env,adminUser);
 }
 if(request.method==='PATCH'||request.method==='DELETE'){
  const handled=await handleImageMutation(request,env);
  if(handled)return handled;
  return baseWorker.fetch(request,env,ctx);
 }
 if(request.method==='GET'){
  const [baseResponse,siteImages,projectImages]=await Promise.all([baseWorker.fetch(request,env,ctx),listSiteImages(env.GALLERY_BUCKET),listProjectImages(env.GALLERY_BUCKET)]);
  if(!baseResponse.ok)return baseResponse;
  let data;
  try{data=await baseResponse.clone().json();}catch{return baseResponse;}
  return json({photos:[...siteImages,...projectImages,...(data.photos||[])]});
 }
 return baseWorker.fetch(request,env,ctx);
}

async function handleProjectMedia(pathname,env){
 const parts=pathname.slice('/project-media/'.length).split('/');
 if(parts.length!==3)return new Response('Not found',{status:404});
 let category,projectId,file;
 try{category=decodeURIComponent(parts[0]);projectId=decodeURIComponent(parts[1]);file=decodeURIComponent(parts[2]);}catch{return new Response('Bad request',{status:400});}
 category=cleanCategory(category);
 if(!category||!projectId||projectId.includes('/')||projectId.includes('..')||!file||file.includes('/')||file.includes('..'))return new Response('Not found',{status:404});
 const object=await env.GALLERY_BUCKET.get(`${category}/${projectId}/${file}`);
 if(!object)return new Response('Not found',{status:404});
 const headers=new Headers();object.writeHttpMetadata(headers);headers.set('etag',object.httpEtag);headers.set('cache-control','public, max-age=31536000, immutable');headers.set('x-content-type-options','nosniff');
 return new Response('body'in object?object.body:null,{status:'body'in object?200:412,headers});
}

async function mergePublicGallery(request,env,ctx){
 const baseResponse=await baseWorker.fetch(request,env,ctx);
 if(!baseResponse.ok)return baseResponse;
 let data;try{data=await baseResponse.clone().json();}catch{return baseResponse;}
 const projectImages=(await listProjectImages(env.GALLERY_BUCKET)).filter(photo=>photo.published).map(({key,uploadedBy,size,featured,...photo})=>photo);
 return json({photos:[...projectImages,...(data.photos||[])]},200,'public, max-age=60');
}

async function mergePublicProjects(request,env,ctx){
 const baseResponse=await baseWorker.fetch(request,env,ctx);
 if(!baseResponse.ok)return baseResponse;
 let data;try{data=await baseResponse.clone().json();}catch{return baseResponse;}
 const newPhotos=(await listProjectImages(env.GALLERY_BUCKET)).filter(photo=>photo.published);
 const projects=(data.projects||[]).map(project=>({...project,photos:[...(project.photos||[]),...newPhotos.filter(photo=>photo.projectId===project.id).map(({key,uploadedBy,size,published,featured,...photo})=>photo)]}));
 return json({projects},200,'public, max-age=60');
}

async function guardProjectDelete(request,env){
 if(request.method!=='DELETE')return null;
 let body;try{body=await request.clone().json();}catch{return null;}
 const id=clean(body.id,80);if(!id)return null;
 const projectImages=await listProjectImages(env.GALLERY_BUCKET);
 const assigned=projectImages.filter(photo=>photo.projectId===id);
 if(assigned.length)return json({error:`Delete or reassign the ${assigned.length} photo${assigned.length===1?'':'s'} in this project first.`},409);
 return null;
}

export default{
 async fetch(request,env,ctx){
  const url=new URL(request.url);
  if(url.pathname==='/api/google-reviews'&&request.method==='GET')return handleGoogleReviews(request,env);
  if(url.pathname==='/api/admin/owner-login')return handleOwnerLogin(request,env);
  if(url.pathname==='/api/admin/session')return handleAdminSessionInfo(request,env);
  if(url.pathname==='/api/admin/permissions')return handleClientPermissions(request,env);
  if(url.pathname.startsWith('/project-media/')&&request.method==='GET')return handleProjectMedia(url.pathname,env);
  if(url.pathname==='/api/gallery'&&request.method==='GET')return mergePublicGallery(request,env,ctx);
  if(url.pathname==='/api/projects'&&request.method==='GET')return mergePublicProjects(request,env,ctx);
  if(url.pathname==='/api/admin/move-site-image'){
   const galleryAccess=await authorizeAdminFeature(request,env,'gallery');if(galleryAccess.response)return galleryAccess.response;
   const siteAccess=await authorizeAdminFeature(request,env,'siteEditor');if(siteAccess.response)return siteAccess.response;
   return handleMoveGalleryPhotoToSite(request,env,galleryAccess.session.username);
  }
  if(isGalleryAdminPath(url.pathname)){
   const access=await authorizeAdminFeature(request,env,'gallery');if(access.response)return access.response;
   if(url.pathname==='/api/admin/photos')return handleAdminPhotosThroughEntry(request,env,ctx,access.session.username);
   const guarded=await guardProjectDelete(request,env);if(guarded)return guarded;
  }
  if(isSiteEditorAdminPath(url.pathname)){
   const access=await authorizeAdminFeature(request,env,'siteEditor');if(access.response)return access.response;
  }
  return baseWorker.fetch(request,env,ctx);
 }
};
