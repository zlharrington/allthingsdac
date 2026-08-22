import siteWorker from './entry-worker.js';
import {handleEstimateRequest} from './estimate-api.js';

function json(data,status=200,extraHeaders={}){
  return new Response(JSON.stringify(data),{
    status,
    headers:{
      'content-type':'application/json; charset=utf-8',
      'cache-control':'no-store',
      'x-content-type-options':'nosniff',
      ...extraHeaders
    }
  });
}

function sameOriginRequest(request){
  const expected=new URL(request.url).origin;
  const origin=request.headers.get('origin');
  if(origin&&origin!==expected)return false;
  const fetchSite=request.headers.get('sec-fetch-site');
  if(fetchSite&&fetchSite!=='same-origin'&&fetchSite!=='same-site')return false;
  return true;
}

function isAdminMutation(request,url){
  return url.pathname.startsWith('/api/admin/')&&!['GET','HEAD','OPTIONS'].includes(request.method);
}

function isLoginPath(pathname){
  return pathname==='/api/admin/login'||pathname==='/api/admin/owner-login';
}

async function limitAdminLogin(request,env,pathname){
  if(!env.ADMIN_LOGIN_RATE_LIMITER)return null;
  const ip=request.headers.get('cf-connecting-ip')||'unknown';
  const result=await env.ADMIN_LOGIN_RATE_LIMITER.limit({key:`admin-login:${pathname}:${ip}`});
  if(result.success)return null;
  return json({error:'Too many login attempts. Please wait a minute and try again.'},429,{'retry-after':'60'});
}

function bytesEqual(bytes,signature,offset=0){
  if(bytes.length<offset+signature.length)return false;
  return signature.every((value,index)=>bytes[offset+index]===value);
}

function ascii(bytes,start,length){
  return String.fromCharCode(...bytes.slice(start,start+length));
}

async function validImageSignature(file){
  if(!file||typeof file.slice!=='function')return false;
  const bytes=new Uint8Array(await file.slice(0,40).arrayBuffer());
  if(file.type==='image/jpeg')return bytesEqual(bytes,[0xff,0xd8,0xff]);
  if(file.type==='image/png')return bytesEqual(bytes,[0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]);
  if(file.type==='image/webp')return ascii(bytes,0,4)==='RIFF'&&ascii(bytes,8,4)==='WEBP';
  if(file.type==='image/avif'){
    if(ascii(bytes,4,4)!=='ftyp')return false;
    return ascii(bytes,8,32).includes('avif')||ascii(bytes,8,32).includes('avis');
  }
  return false;
}

async function validateAdminImageUpload(request,url){
  if(request.method!=='POST')return null;
  if(url.pathname!=='/api/admin/photos'&&url.pathname!=='/api/admin/site-image')return null;
  let form;
  try{form=await request.clone().formData();}catch{return json({error:'Invalid upload request.'},400);}
  const file=form.get('file');
  if(!file||typeof file.slice!=='function')return null;
  if(!(await validImageSignature(file)))return json({error:'The uploaded file does not match its image type.'},415);
  return null;
}

export default {
  async fetch(request,env,ctx){
    const url=new URL(request.url);

    if(url.pathname==='/api/estimate-request')return handleEstimateRequest(request,env);
    if(url.pathname==='/api/debug-env')return new Response('Not found',{status:404,headers:{'cache-control':'no-store'}});

    if(isAdminMutation(request,url)&&!sameOriginRequest(request)){
      return json({error:'Request rejected.'},403);
    }

    if(isLoginPath(url.pathname)&&request.method==='POST'){
      const limited=await limitAdminLogin(request,env,url.pathname);
      if(limited)return limited;
    }

    const uploadError=await validateAdminImageUpload(request,url);
    if(uploadError)return uploadError;

    return siteWorker.fetch(request,env,ctx);
  }
};
