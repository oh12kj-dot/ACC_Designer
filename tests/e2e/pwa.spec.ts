import { test,expect } from '@playwright/test';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
test.use({serviceWorkers:'allow'});
test('PWA installs public shell while excluding API and authenticated pages from caches',async({page,context,browserName})=>{
 await page.goto('/');await page.evaluate(async()=>{await navigator.serviceWorker.ready;if(!navigator.serviceWorker.controller)await new Promise<void>(resolve=>navigator.serviceWorker.addEventListener('controllerchange',()=>resolve(),{once:true}));});
 await page.reload();await expect(page.getByRole('heading',{level:1})).toBeVisible();
 const manifest=await page.evaluate(async()=>await (await fetch('/manifest.webmanifest')).json());expect(manifest.icons).toHaveLength(2);expect(manifest.display).toBe('standalone');
 await page.goto('/designs');await page.evaluate(async()=>{await fetch('/api/parts/import',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sourceUrl:'https://kiwaseisakujo.jp/item'})});});
 const cached=await page.evaluate(async()=>{const cache=await caches.open('accessory-designer-shell-v1');return (await cache.keys()).map(request=>new URL(request.url).pathname);});expect(cached).toContain('/offline.html');expect(cached.some(path=>path.startsWith('/api/')||path.startsWith('/designs')||path.startsWith('/parts'))).toBe(false);
 // Windows WebKit's automation-level offline mode fails before Service Worker dispatch.
 // A real connection failure is exercised on every engine in the test below.
 if(browserName==='chromium'){
  await context.setOffline(true);await page.goto('/designs/offline-fixture');await expect(page.getByRole('heading',{name:'ネットワークに接続できません'})).toBeVisible();await context.setOffline(false);
 }
});

test('actual Service Worker serves the offline page after a loopback server drops the navigation connection',async({page})=>{
 const resources:Record<string,{type:string;body:string|Buffer}>={
  '/':{type:'text/html',body:'<!doctype html><html lang="ja"><title>PWA network fixture</title><h1>公開シェル</h1></html>'},
  '/sw.js':{type:'application/javascript',body:readFileSync('public/sw.js')},
  '/offline.html':{type:'text/html',body:readFileSync('public/offline.html')},
  '/manifest.webmanifest':{type:'application/manifest+json',body:readFileSync('public/manifest.webmanifest')},
  '/icons/icon-192.png':{type:'image/png',body:readFileSync('public/icons/icon-192.png')},
  '/icons/icon-512.png':{type:'image/png',body:readFileSync('public/icons/icon-512.png')},
 };
 const server=createServer((request,response)=>{
  const pathname=new URL(request.url??'/','http://127.0.0.1').pathname;
  if(pathname==='/designs/network-failure'){request.socket.destroy();return;}
  const resource=resources[pathname];
  response.writeHead(resource?200:404,{'Content-Type':resource?.type??'text/plain'});response.end(resource?.body??'Not found');
 });
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
  const origin=`http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  await page.goto(origin);
  await page.evaluate(async()=>{
   await navigator.serviceWorker.register('/sw.js');await navigator.serviceWorker.ready;
   if(!navigator.serviceWorker.controller)await new Promise<void>(resolve=>navigator.serviceWorker.addEventListener('controllerchange',()=>resolve(),{once:true}));
  });
  await page.goto(origin+'/designs/network-failure');
  await expect(page.getByRole('heading',{name:'ネットワークに接続できません'})).toBeVisible();
  await expect(page.getByText('完全なオフライン編集には対応していません。')).toBeVisible();
 }finally{
  await page.goto('about:blank');server.closeAllConnections();
  await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));
 }
});

test('iPhone installation instructions are reachable without an install prompt',async({page,isMobile})=>{
 await page.goto('/');
 const guide=page.getByText('端末への追加方法',{exact:true});
 await guide.click();
 if(isMobile)await expect(page.getByRole('link',{name:'Appleの操作案内'})).toBeVisible();
 await expect(page.getByText('端末へ追加しても、デザインの保存・読込にはネットワーク接続が必要です。',{exact:false})).toBeVisible();
});
