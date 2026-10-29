import { expect,test } from '@playwright/test';
import { readFileSync } from 'node:fs';

test('four-point correction, fine rotation and normalized connection/hole definition',async({page})=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));await page.goto('/parts/new');
  const base64=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=100;c.height=100;const x=c.getContext('2d')!,data=x.createImageData(100,100);for(let y=0;y<100;y++)for(let px=0;px<100;px++){const i=(y*100+px)*4;data.data[i]=px;data.data[i+1]=y;data.data[i+2]=30;data.data[i+3]=255;}x.putImageData(data,0,0);return c.toDataURL('image/png').split(',')[1];});
  await page.getByLabel('商品画像',{exact:true}).setInputFiles({name:'perspective.png',mimeType:'image/png',buffer:Buffer.from(base64,'base64')});
  const canvas=page.getByLabel('画像編集キャンバス',{exact:true});await expect(canvas).toBeVisible();
  await page.getByRole('button',{name:'遠近補正の4点',exact:true}).click();
  const rect=await canvas.boundingBox();if(!rect)throw new Error('canvas missing');
  for(const [x,y] of [[.1,.2],[.9,.1],[.8,.8],[.2,.9]])await canvas.click({position:{x:rect.width*x,y:rect.height*y}});
  await page.getByLabel('補正後の幅（px）',{exact:true}).fill('80');await page.getByLabel('補正後の高さ（px）',{exact:true}).fill('60');
  await page.getByRole('button',{name:'遠近補正を適用',exact:true}).click();
  await expect.poll(()=>canvas.evaluate(c=>(c as HTMLCanvasElement).width)).toBe(80);
  const pixel=await canvas.evaluate(c=>[...(c as HTMLCanvasElement).getContext('2d')!.getImageData(0,0,1,1).data]);
  expect(Math.abs(pixel[0]-10)).toBeLessThanOrEqual(1);expect(Math.abs(pixel[1]-20)).toBeLessThanOrEqual(1);expect(pixel[3]).toBe(255);
  await page.getByLabel('回転の微調整（°）',{exact:true}).fill('15');await page.getByRole('button',{name:'角度を適用',exact:true}).click();
  await expect.poll(()=>canvas.evaluate(c=>(c as HTMLCanvasElement).width)).toBe(93);
  await page.getByLabel('回転の微調整（°）',{exact:true}).fill('0');await page.getByRole('button',{name:'角度を適用',exact:true}).click();
  await expect.poll(()=>canvas.evaluate(c=>(c as HTMLCanvasElement).width)).toBe(80);
  async function tap(x:number,y:number){const r=await canvas.boundingBox();if(!r)throw new Error('canvas missing');await canvas.click({position:{x:r.width*x,y:r.height*y}});}
  await tap(.1,.5);await tap(.9,.5);await page.getByLabel('A–Bの実距離（mm）',{exact:true}).fill('12.8');
  await page.getByRole('button',{name:'接続点を追加',exact:true}).click();await tap(.5,.1);
  await page.getByLabel('接続点 1の接続部内径（mm）',{exact:true}).fill('1.2');await page.getByLabel('接続点 1の接続部厚み（mm）',{exact:true}).fill('0');
  await page.getByLabel('厚み（mm）',{exact:true}).fill('0.5');await page.getByLabel('重量（g）',{exact:true}).fill('0');
  await page.getByRole('button',{name:'貫通穴を追加',exact:true}).click();await tap(.2,.5);await tap(.8,.5);
  await expect(page.getByText('接続点 1件 / 貫通穴 1件',{exact:true})).toBeVisible();
  const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'接続定義JSONを確認',exact:true}).click();
  const download=await downloadPromise,path=await download.path();if(!path)throw new Error('missing download');const data=JSON.parse(readFileSync(path,'utf8'));
  expect(data.sourceTransform.perspective.applied).toBe(true);expect(data.sourceTransform.perspective.corners).toHaveLength(4);
  expect(data.physical).toEqual({weightG:0,thicknessMm:0.5});expect(data.connectionPoints[0].localInnerDiameterMm).toBe(1.2);expect(data.connectionPoints[0].localThicknessMm).toBe(0);
  expect(Math.abs(data.widthMm/16-1)).toBeLessThanOrEqual(.03);expect(Math.abs(data.heightMm/12-1)).toBeLessThanOrEqual(.03);
  expect(data.connectionPoints[0].xNorm).toBeCloseTo(.5);expect(data.connectionPoints[0].yNorm).toBeCloseTo(.1);expect(data.connectionPoints[0].directionDeg).toBe(270);
  expect(data.throughHoles[0].entryXNorm).toBeCloseTo(.2);expect(data.throughHoles[0].exitXNorm).toBeCloseTo(.8);expect(data.throughHoles[0].axisDeg).toBeCloseTo(0);expect(data.throughHoles[0]).not.toHaveProperty('diameterMm');
  expect(errors).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.getByRole('button',{name:'角度を適用',exact:true}).click();await expect(page.getByText('接続点 0件 / 貫通穴 0件',{exact:true})).toBeVisible();
});
