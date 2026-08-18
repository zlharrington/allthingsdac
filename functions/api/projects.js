function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'public, max-age=60'}});}
const JOB_TYPES=new Set(['residential','commercial','federal']);
function cleanType(value){const type=String(value||'').trim().toLowerCase();return JOB_TYPES.has(type)?type:'';}
async function listAll(bucket,prefix){let cursor;const objects=[];do{const page=await bucket.list({prefix,limit:1000,cursor,include:['customMetadata','httpMetadata']});objects.push(...page.objects);cursor=page.truncated?page.cursor:undefined;}while(cursor);return objects;}
export async function onRequestGet(context){
  const url=new URL(context.request.url);const requestedType=cleanType(url.searchParams.get('type'));
  const [projectObjects,photoObjects]=await Promise.all([listAll(context.env.GALLERY_BUCKET,'projects/'),listAll(context.env.GALLERY_BUCKET,'gallery/')]);
  const projects=projectObjects.map(object=>{const meta=object.customMetadata||{};return{id:meta.id||object.key.slice('projects/'.length).replace(/\.json$/,''),name:meta.name||'Untitled Project',jobType:cleanType(meta.jobType)||'commercial',description:meta.description||'',createdAt:meta.createdAt||''};}).filter(project=>!requestedType||project.jobType===requestedType);
  const projectIds=new Set(projects.map(project=>project.id));
  const photos=photoObjects.map(object=>{const meta=object.customMetadata||{};if(meta.published!=='true')return null;const file=object.key.slice('gallery/'.length);return{file,url:`/media/${encodeURIComponent(file)}`,title:meta.title||'',alt:meta.alt||'All Things Drywall & Construction project photo',jobType:cleanType(meta.jobType),projectId:meta.projectId||'',createdAt:meta.createdAt||''};}).filter(photo=>photo&&projectIds.has(photo.projectId));
  photos.sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));
  const photosByProject=new Map();for(const photo of photos){if(!photosByProject.has(photo.projectId))photosByProject.set(photo.projectId,[]);photosByProject.get(photo.projectId).push(photo);}
  projects.sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));
  return json({projects:projects.map(project=>({...project,photos:photosByProject.get(project.id)||[]}))});
}
