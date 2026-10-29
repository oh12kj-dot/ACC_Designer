const CACHE='accessory-designer-shell-v1';
const SHELL=['/','/offline.html','/manifest.webmanifest','/icons/icon-192.png','/icons/icon-512.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('accessory-designer-shell-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin||request.headers.has('authorization')||request.headers.has('rsc')||request.headers.has('next-router-prefetch'))return;
 if(request.mode==='navigate'){
  event.respondWith(fetch(request).catch(async()=>{const cache=await caches.open(CACHE);return(await cache.match(url.pathname==='/'?'/':'/offline.html'))||Response.error();}));return;
 }
 // Cache only public immutable bundles and explicit public shell files. No API, RSC, account pages or signed images.
 if(!url.pathname.startsWith('/_next/static/')&&!SHELL.includes(url.pathname))return;
 if(url.search)return;
 event.respondWith(caches.open(CACHE).then(async cache=>{const cached=await cache.match(request);if(cached)return cached;const response=await fetch(request);if(response.ok&&response.type==='basic')await cache.put(request,response.clone());return response;}));
});
