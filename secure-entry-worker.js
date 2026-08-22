import siteWorker from './entry-worker.js';
import {handleEstimateRequest} from './estimate-api.js';

export default {
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/estimate-request')return handleEstimateRequest(request,env);
    if(url.pathname==='/api/debug-env')return new Response('Not found',{status:404,headers:{'cache-control':'no-store'}});
    return siteWorker.fetch(request,env,ctx);
  }
};
