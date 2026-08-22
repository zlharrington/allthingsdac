const MAX_BODY_BYTES=12*1024;
const MAX_MESSAGE_CHARS=4000;
const EMAIL_RE=/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

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

function clean(value,max=160){return String(value??'').trim().slice(0,max);}

function sameOriginRequest(request){
  const expected=new URL(request.url).origin;
  const origin=request.headers.get('origin');
  if(origin&&origin!==expected)return false;
  const fetchSite=request.headers.get('sec-fetch-site');
  if(fetchSite&&fetchSite!=='same-origin'&&fetchSite!=='same-site')return false;
  return true;
}

async function parseSmallJson(request){
  const contentType=(request.headers.get('content-type')||'').toLowerCase();
  if(!contentType.startsWith('application/json'))return{error:json({error:'Unsupported request.'},415)};
  const declared=Number(request.headers.get('content-length')||0);
  if(Number.isFinite(declared)&&declared>MAX_BODY_BYTES)return{error:json({error:'Request is too large.'},413)};
  const raw=await request.text();
  if(new TextEncoder().encode(raw).byteLength>MAX_BODY_BYTES)return{error:json({error:'Request is too large.'},413)};
  try{return{body:JSON.parse(raw)}}catch{return{error:json({error:'Invalid estimate request.'},400)}}
}

async function rateLimit(request,env,email){
  if(!env.ESTIMATE_RATE_LIMITER)return null;
  const ip=request.headers.get('cf-connecting-ip')||'unknown';
  const ipResult=await env.ESTIMATE_RATE_LIMITER.limit({key:`estimate:ip:${ip}`});
  if(!ipResult.success)return json({error:'Too many requests. Please wait a minute and try again.'},429,{'retry-after':'60'});
  if(email){
    const emailResult=await env.ESTIMATE_RATE_LIMITER.limit({key:`estimate:email:${email.toLowerCase()}`});
    if(!emailResult.success)return json({error:'Too many requests. Please wait a minute and try again.'},429,{'retry-after':'60'});
  }
  return null;
}

async function verifyTurnstile(request,env,token){
  if(!env.TURNSTILE_SECRET)return{ok:true};
  if(!token)return{ok:false};
  const form=new FormData();
  form.set('secret',env.TURNSTILE_SECRET);
  form.set('response',token);
  const ip=request.headers.get('cf-connecting-ip');
  if(ip)form.set('remoteip',ip);
  const response=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',body:form});
  const result=await response.json().catch(()=>({}));
  return{ok:result.success===true};
}

export async function handleEstimateRequest(request,env){
  if(request.method!=='POST')return new Response('Method not allowed',{status:405,headers:{allow:'POST'}});
  if(!sameOriginRequest(request))return json({error:'Request rejected.'},403);
  if(!env.RESEND_API_KEY||!env.ESTIMATE_TO_EMAIL)return json({error:'Estimate email is not configured yet.'},503);

  const parsed=await parseSmallJson(request);
  if(parsed.error)return parsed.error;
  const body=parsed.body&&typeof parsed.body==='object'&&!Array.isArray(parsed.body)?parsed.body:{};

  // Honeypot support: legitimate clients leave this empty. Bots that auto-fill it are silently discarded.
  if(clean(body.website,200))return json({ok:true});

  const name=clean(body.name,120);
  const phone=clean(body.phone,60);
  const email=clean(body.email,180).toLowerCase();
  const message=clean(body.message,MAX_MESSAGE_CHARS);
  const turnstileToken=clean(body.turnstileToken||body['cf-turnstile-response'],2048);

  const limited=await rateLimit(request,env,email);
  if(limited)return limited;

  if(!name||!email||!message)return json({error:'Name, email, and project details are required.'},400);
  if(!EMAIL_RE.test(email)||email.length>180)return json({error:'Enter a valid email address.'},400);
  if(name.length<2)return json({error:'Enter your name.'},400);
  if(message.length<10)return json({error:'Please add a few more project details.'},400);
  const urlCount=(message.match(/https?:\/\//gi)||[]).length;
  if(urlCount>3)return json({error:'Please remove extra links from the project details.'},400);

  const turnstile=await verifyTurnstile(request,env,turnstileToken);
  if(!turnstile.ok)return json({error:'Verification failed. Please refresh the page and try again.'},403);

  const subject=`Estimate Request — ${name.replace(/[\r\n]+/g,' ')}`;
  const text=`New estimate request from allthingsdac.com\n\nName: ${name}\nPhone: ${phone||'Not provided'}\nEmail: ${email}\n\nProject details:\n${message}`;
  const resend=await fetch('https://api.resend.com/emails',{
    method:'POST',
    headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json'},
    body:JSON.stringify({
      from:'All Things DAC Website <website@allthingsdac.com>',
      to:[env.ESTIMATE_TO_EMAIL],
      reply_to:email,
      subject,
      text
    })
  });
  const data=await resend.json().catch(()=>({}));
  if(!resend.ok){
    console.error('Resend estimate email failed',resend.status,data);
    return json({error:'We could not send your request right now. Please call or email us directly.'},502);
  }
  return json({ok:true,id:data.id||null});
}
