const ALLOWED_PAGES=new Set(['global','home','services','work','about','contact','residential','commercial','federal']);
const IMAGE_TYPES={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/avif':'avif'};
const MAX_IMAGE_BYTES=15*1024*1024;
const SITE_IMAGE_TARGETS={global:new Set(['siteLogo']),home:new Set(['heroBackground','service1Image','service2Image','service3Image','familyImage']),about:new Set(['ownerImage','davidImage','calebImage','jonathanImage'])};
const SITE_IMAGE_SLOT_SLUGS={
 'global.siteLogo':'site-logo',
 'home.heroBackground':'home-hero-background',
 'home.service1Image':'home-commercial',
 'home.service2Image':'home-government',
 'home.service3Image':'home-residential',
 'home.familyImage':'home-family',
 'about.ownerImage':'about-owner',
 'about.davidImage':'about-david',
 'about.calebImage':'about-caleb',
 'about.jonathanImage':'about-jonathan'
};
const SITE_IMAGE_PAGE_FILES={home:'index.html',about:'about.html'};
const SITE_IMAGE_STYLE_FILES={'home.heroBackground':'home-hero.css'};
const LEGACY_R2_IMAGE_KEYS={
 'home.service1Image':'service1Image',
 'home.service2Image':'service2Image',
 'home.service3Image':'service3Image',
 'home.familyImage':'familyImage',
 'about.ownerImage':'ownerImage',
 'about.davidImage':'team2Image',
 'about.calebImage':'team3Image',
 'about.jonathanImage':'team4Image'
};
const ASSIGNABLE_SOURCE_PREFIXES=['gallery/','commercial/','residential/','federal/','site-images/'];
const GITHUB_MANIFEST_PATH='site-image-slots.json';
function json(data,status=200,cacheControl='no-store'){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':cacheControl}});}
function pageFromRequest(request){const page=String(new URL(request.url).searchParams.get('page')||'').trim().toLowerCase();return ALLOWED_PAGES.has(page)?page:'';}
function cleanContent(input){const output={};if(!input||typeof input!=='object'||Array.isArray(input))return output;for(const [key,value] of Object.entries(input).slice(0,80)){if(!/^[a-zA-Z0-9_-]{1,80}$/.test(key)||typeof value!=='string')continue;output[key]=value.trim().slice(0,6000);}return output;}
function isAssignableSourceKey(key){return ASSIGNABLE_SOURCE_PREFIXES.some(prefix=>key.startsWith(prefix));}
function githubConfig(env){return{token:String(env.GITHUB_SITE_IMAGES_TOKEN||env.GITHUB_TOKEN||'').trim(),owner:String(env.GITHUB_SITE_IMAGES_OWNER||'zlharrington').trim(),repo:String(env.GITHUB_SITE_IMAGES_REPO||'allthingsdac').trim(),branch:String(env.GITHUB_SITE_IMAGES_BRANCH||'main').trim()};}
function bytesToBase64(buffer){const bytes=new Uint8Array(buffer);let binary='';const size=0x8000;for(let i=0;i<bytes.length;i+=size)binary+=String.fromCharCode(...bytes.subarray(i,i+size));return btoa(binary);}
function base64ToText(value){const binary=atob(String(value||'').replace(/\s/g,''));const bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));return new TextDecoder().decode(bytes);}
async function githubApi(env,path,{method='GET',body}={}){
 const cfg=githubConfig(env);
 if(!cfg.token)throw Object.assign(new Error('GitHub site-image token is not configured in Cloudflare.'),{status:503});
 const response=await fetch(`https://api.github.com/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}${path}`,{method,headers:{authorization:`Bearer ${cfg.token}`,accept:'application/vnd.github+json','content-type':'application/json','user-agent':'allthingsdac-site-image-worker','x-github-api-version':'2022-11-28'},body:body===undefined?undefined:JSON.stringify(body)});
 const text=await response.text();let data={};if(text){try{data=JSON.parse(text);}catch{data={message:text};}}
 if(!response.ok)throw Object.assign(new Error(data.message||`GitHub request failed (${response.status}).`),{status:response.status,data});
 return data;
}
async function readGithubManifest(env,branch){
 try{const file=await githubApi(env,`/contents/${GITHUB_MANIFEST_PATH}?ref=${encodeURIComponent(branch)}`);return JSON.parse(base64ToText(file.content||''))||{};}catch(error){if(error.status===404)return{};throw error;}
}
async function readGithubTextFile(env,path,branch){const file=await githubApi(env,`/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(branch)}`);return base64ToText(file.content||'');}
function replaceHtmlSlotSource(html,slotKey,url){
 const marker=`data-site-image-slot="${slotKey}"`;const markerIndex=html.indexOf(marker);
 if(markerIndex<0)throw Object.assign(new Error(`Page markup is missing the ${slotKey} image slot.`),{status:500});
 const tagStart=html.lastIndexOf('<img',markerIndex),tagEnd=html.indexOf('>',markerIndex);
 if(tagStart<0||tagEnd<0)throw Object.assign(new Error(`Page markup for ${slotKey} is invalid.`),{status:500});
 const tag=html.slice(tagStart,tagEnd+1);
 if(!/\bsrc=["'][^"']*["']/i.test(tag))throw Object.assign(new Error(`Page image slot ${slotKey} has no src attribute.`),{status:500});
 const updatedTag=tag.replace(/\bsrc=["'][^"']*["']/i,`src="${url}"`);
 return html.slice(0,tagStart)+updatedTag+html.slice(tagEnd+1);
}
function replaceCssSlotSource(css,slotKey,url){
 const marker=`data-site-image-slot:${slotKey}`;const markerIndex=css.indexOf(marker);
 if(markerIndex<0)throw Object.assign(new Error(`Stylesheet is missing the ${slotKey} image slot.`),{status:500});
 const urlStart=css.indexOf('url(',markerIndex),urlEnd=urlStart<0?-1:css.indexOf(')',urlStart);
 if(urlStart<0||urlEnd<0)throw Object.assign(new Error(`Stylesheet image slot ${slotKey} is invalid.`),{status:500});
 return css.slice(0,urlStart)+`url('${url}')`+css.slice(urlEnd+1);
}
async function commitAssignedImageAttempt(env,{bytes,contentType,page,field,adminUser}){
 const cfg=githubConfig(env),ext=IMAGE_TYPES[contentType],slotKey=`${page}.${field}`,slug=SITE_IMAGE_SLOT_SLUGS[slotKey];
 if(!ext||!slug)throw Object.assign(new Error('Invalid GitHub site-image slot.'),{status:400});
 const assetPath=`assets/site/${slug}.${ext}`,publicUrl=`/${assetPath}`,styleFile=SITE_IMAGE_STYLE_FILES[slotKey]||'',pageFile=styleFile?'':(SITE_IMAGE_PAGE_FILES[page]||'');
 const ref=await githubApi(env,`/git/ref/heads/${cfg.branch}`),parentSha=ref.object?.sha;if(!parentSha)throw new Error('GitHub branch reference could not be resolved.');
 const parentCommit=await githubApi(env,`/git/commits/${parentSha}`),baseTree=parentCommit.tree?.sha;if(!baseTree)throw new Error('GitHub base tree could not be resolved.');
 const manifest=await readGithubManifest(env,cfg.branch);manifest[slotKey]=publicUrl;
 let updatedHtml='',updatedCss='';
 if(pageFile){const html=await readGithubTextFile(env,pageFile,cfg.branch);updatedHtml=replaceHtmlSlotSource(html,slotKey,publicUrl);}
 if(styleFile){const css=await readGithubTextFile(env,styleFile,cfg.branch);updatedCss=replaceCssSlotSource(css,slotKey,publicUrl);}
 const blobPromises=[
  githubApi(env,'/git/blobs',{method:'POST',body:{content:bytesToBase64(bytes),encoding:'base64'}}),
  githubApi(env,'/git/blobs',{method:'POST',body:{content:JSON.stringify(manifest,null,2)+'\n',encoding:'utf-8'}})
 ];
 if(pageFile)blobPromises.push(githubApi(env,'/git/blobs',{method:'POST',body:{content:updatedHtml,encoding:'utf-8'}}));
 if(styleFile)blobPromises.push(githubApi(env,'/git/blobs',{method:'POST',body:{content:updatedCss,encoding:'utf-8'}}));
 const blobs=await Promise.all(blobPromises),treeEntries=[{path:assetPath,mode:'100644',type:'blob',sha:blobs[0].sha},{path:GITHUB_MANIFEST_PATH,mode:'100644',type:'blob',sha:blobs[1].sha}];
 let blobIndex=2;
 if(pageFile)treeEntries.push({path:pageFile,mode:'100644',type:'blob',sha:blobs[blobIndex++].sha});
 if(styleFile)treeEntries.push({path:styleFile,mode:'100644',type:'blob',sha:blobs[blobIndex++].sha});
 const tree=await githubApi(env,'/git/trees',{method:'POST',body:{base_tree:baseTree,tree:treeEntries}});
 const commit=await githubApi(env,'/git/commits',{method:'POST',body:{message:`Assign ${slotKey} site image`,tree:tree.sha,parents:[parentSha],author:{name:String(adminUser||'All Things DAC Admin').slice(0,80),email:'site-admin@allthingsdac.com'}}});
 await githubApi(env,`/git/refs/heads/${cfg.branch}`,{method:'PATCH',body:{sha:commit.sha,force:false}});
 return{url:publicUrl,commitSha:commit.sha,assetPath,slotKey,pageFile,styleFile};
}
async function commitAssignedImageToGithub(env,args){let lastError;for(let attempt=0;attempt<3;attempt++){try{return await commitAssignedImageAttempt(env,args);}catch(error){lastError=error;if(error.status!==409||attempt===2)throw error;await new Promise(resolve=>setTimeout(resolve,120*(attempt+1)));}}throw lastError;}
async function readPageContent(env,page){const object=await env.GALLERY_BUCKET.get(`site-content/${page}.json`);if(!object)return{};try{return JSON.parse(await object.text())||{};}catch{return{};}}
async function writePageContent(env,page,content,adminUser){const updatedAt=new Date().toISOString();await env.GALLERY_BUCKET.put(`site-content/${page}.json`,JSON.stringify(cleanContent(content)),{httpMetadata:{contentType:'application/json; charset=utf-8',cacheControl:'no-store'},customMetadata:{page,updatedAt,updatedBy:String(adminUser||'client').slice(0,80)}});return updatedAt;}
async function clearLegacyImageOverride(env,page,field,adminUser){const legacyKey=LEGACY_R2_IMAGE_KEYS[`${page}.${field}`];if(!legacyKey)return;const content=await readPageContent(env,page);if(!Object.prototype.hasOwnProperty.call(content,legacyKey))return;delete content[legacyKey];await writePageContent(env,page,content,adminUser);}
export async function handlePublicSiteContent(request,env){const page=pageFromRequest(request);if(!page)return json({error:'Unknown page.'},400);return json({page,content:await readPageContent(env,page)},200,'public, max-age=30');}
export async function handleAdminSiteContent(request,env,adminUser){const page=pageFromRequest(request);if(!page)return json({error:'Unknown page.'},400);const key=`site-content/${page}.json`;if(request.method==='GET')return json({page,content:await readPageContent(env,page)});if(request.method==='PUT'){let body;try{body=await request.json();}catch{return json({error:'Invalid page content.'},400);}const content=cleanContent(body.content);const updatedAt=await writePageContent(env,page,content,adminUser);return json({page,content,updatedAt});}if(request.method==='DELETE'){await env.GALLERY_BUCKET.delete(key);return json({ok:true,page});}return new Response('Method not allowed',{status:405,headers:{allow:'GET, PUT, DELETE'}});}
export async function handleAdminSiteImage(request,env,adminUser){if(request.method!=='POST')return new Response('Method not allowed',{status:405,headers:{allow:'POST'}});const form=await request.formData();const file=form.get('file');const page=String(form.get('page')||'').trim().toLowerCase();const field=String(form.get('field')||'').trim();if(!ALLOWED_PAGES.has(page)||!/^[a-zA-Z0-9_-]{1,80}$/.test(field))return json({error:'Invalid page image target.'},400);if(!file||typeof file.stream!=='function')return json({error:'Choose an image to upload.'},400);const ext=IMAGE_TYPES[file.type];if(!ext)return json({error:'Use JPG, PNG, WebP, or AVIF images.'},400);if(file.size>MAX_IMAGE_BYTES)return json({error:'Images must be 15 MB or smaller.'},413);const fileName=`${page}-${field}-${Date.now()}-${crypto.randomUUID()}.${ext}`;await env.GALLERY_BUCKET.put(`site-assets/${fileName}`,file.stream(),{httpMetadata:{contentType:file.type,cacheControl:'public, max-age=31536000, immutable'},customMetadata:{page,field,uploadedAt:new Date().toISOString(),uploadedBy:String(adminUser||'client').slice(0,80)}});return json({url:`/media/site/${encodeURIComponent(fileName)}`},201);}
export async function handleMoveGalleryPhotoToSite(request,env,adminUser){
 if(request.method!=='POST')return new Response('Method not allowed',{status:405,headers:{allow:'POST'}});
 let body;try{body=await request.json();}catch{return json({error:'Invalid assignment request.'},400);}
 const key=String(body.key||'').trim(),page=String(body.page||'').trim().toLowerCase(),field=String(body.field||'').trim();
 if(!isAssignableSourceKey(key))return json({error:'Invalid photo.'},400);
 if(!SITE_IMAGE_TARGETS[page]?.has(field))return json({error:'Invalid site image destination.'},400);
 const source=await env.GALLERY_BUCKET.get(key);if(!source)return json({error:'Photo not found.'},404);
 const contentType=source.httpMetadata?.contentType||'';if(!IMAGE_TYPES[contentType])return json({error:'This image type cannot be used as a site image.'},400);
 const bytes=await source.arrayBuffer();
 try{const assigned=await commitAssignedImageToGithub(env,{bytes,contentType,page,field,adminUser});await clearLegacyImageOverride(env,page,field,adminUser);return json({ok:true,page,field,url:assigned.url,sourceKey:key,commitSha:assigned.commitSha,storage:'github',pageFile:assigned.pageFile||null,styleFile:assigned.styleFile||null});}catch(error){return json({error:error.message||'GitHub assignment failed.'},error.status>=400&&error.status<600?error.status:502);}
}
export async function handleSiteMedia(pathname,env){const encoded=pathname.slice('/media/site/'.length);if(!encoded)return new Response('Not found',{status:404});let file;try{file=decodeURIComponent(encoded);}catch{return new Response('Bad request',{status:400});}if(!file||file.includes('/')||file.includes('..'))return new Response('Not found',{status:404});let object=await env.GALLERY_BUCKET.get(`site-assets/${file}`);if(!object)object=await env.GALLERY_BUCKET.get(`site-images/${file}`);if(!object)return new Response('Not found',{status:404});const headers=new Headers();object.writeHttpMetadata(headers);headers.set('etag',object.httpEtag);headers.set('cache-control','public, max-age=31536000, immutable');headers.set('x-content-type-options','nosniff');return new Response(object.body,{headers});}
