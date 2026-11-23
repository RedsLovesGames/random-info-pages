/* Offline cache for visited, same-origin static project pages. */
const CACHE='rip-static-v1',PREFIX='rip-static-',root=self.registration.scope;
const SHELL=['','index.html','offline.html','site.webmanifest','design-system/projects.js',
 'design-system/rip.js','design-system/rip.css','design-system/studio.css','design-system/appearance.js'];
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const cache=await caches.open(CACHE);
 await Promise.allSettled(SHELL.map(path=>cache.add(new Request(new URL(path,root)))));
 await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 const keys=await caches.keys();
 await Promise.all(keys.filter(k=>k.startsWith(PREFIX)&&k!==CACHE).map(k=>caches.delete(k)));
 await self.clients.claim();
})()));
function cacheable(request,url){
 if(request.method!=='GET'||url.origin!==self.location.origin||!url.href.startsWith(root))return false;
 if(request.headers.has('authorization')||request.headers.has('range'))return false;
 if(/\/(?:api|auth)\//.test(url.pathname)||/\.(?:mp3|mp4|webm|wav|zip|wasm|pdf|glb|gltf|ttf|woff2?)$/i.test(url.pathname))return false;
 return request.mode==='navigate'||['document','script','style','image','font','manifest'].includes(request.destination);
}
async function cacheResponse(cache,request,response){
 if(!response?.ok||response.type!=='basic')return;
 if(Number(response.headers.get('content-length')||0)>2_000_000||response.headers.get('cache-control')?.includes('no-store'))return;
 try{
  await cache.put(request,response.clone());
  const keys=await cache.keys();
  if(keys.length>200)await Promise.all(keys.slice(0,keys.length-200).map(key=>cache.delete(key)));
 }catch{}
}
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(!cacheable(request,url))return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  try{
   const response=await fetch(request);
   if(response.ok)event.waitUntil(cacheResponse(cache,request,response.clone()));
   return response;
  }catch{
   const cached=await cache.match(request);
   if(cached)return cached;
   if(request.mode==='navigate')return await cache.match(new URL('offline.html',root))||
    new Response('<h1>Offline</h1><p>Reconnect to open this page.</p>',{status:503,headers:{'content-type':'text/html;charset=utf-8'}});
   return Response.error();
  }
 })());
});
