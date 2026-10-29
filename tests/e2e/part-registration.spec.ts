import { expect,test } from '@playwright/test';
import { readFileSync } from 'node:fs';

test('local image registration: crop, erase/restore, calibration and normalized export',async({page},testInfo)=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/parts/new');
  await expect(page.getByRole('heading',{name:'パーツ登録',exact:true})).toBeVisible();
  const base64=await page.evaluate(()=>{
    const canvas=document.createElement('canvas');canvas.width=100;canvas.height=100;
    const ctx=canvas.getContext('2d')!;ctx.fillStyle='red';ctx.fillRect(20,30,60,40);return canvas.toDataURL('image/png').split(',')[1];
  });
  await page.getByLabel('商品画像',{exact:true}).setInputFiles({name:'fixture.png',mimeType:'image/png',buffer:Buffer.from(base64,'base64')});
  const canvas=page.getByLabel('画像編集キャンバス',{exact:true});await expect(canvas).toBeVisible();
  await page.getByLabel('左',{exact:true}).fill('10');await page.getByLabel('上',{exact:true}).fill('10');
  await page.getByLabel('幅',{exact:true}).fill('80');await page.getByLabel('高さ',{exact:true}).fill('80');
  await page.getByRole('button',{name:'Crop適用',exact:true}).click();
  await page.getByRole('button',{name:'90°回転',exact:true}).click();
  expect(await canvas.evaluate(element=>(element as HTMLCanvasElement).width)).toBe(80);
  const maskRect=await canvas.boundingBox();if(!maskRect)throw new Error('canvas missing');
  await page.getByRole('button',{name:'背景を消す',exact:true}).click();
  await canvas.click({position:{x:maskRect.width*0.5,y:maskRect.height*0.5}});
  expect(await canvas.evaluate(element=>(element as HTMLCanvasElement).getContext('2d')!.getImageData(40,40,1,1).data[3])).toBe(0);
  await page.getByRole('button',{name:'復元',exact:true}).click();
  await canvas.click({position:{x:maskRect.width*0.5,y:maskRect.height*0.5}});
  expect(await canvas.evaluate(element=>(element as HTMLCanvasElement).getContext('2d')!.getImageData(40,40,1,1).data[3])).toBe(255);
  await page.getByRole('button',{name:'実寸の2点',exact:true}).click();
  const rect=await canvas.boundingBox();if(!rect)throw new Error('canvas missing');
  await canvas.click({position:{x:rect.width*0.5,y:rect.height*0.125}});
  await canvas.click({position:{x:rect.width*0.5,y:rect.height*0.875}});
  await page.getByLabel('A–Bの実距離（mm）',{exact:true}).fill('12');
  const scale=Number((await page.getByText(/^1px = /).textContent())?.match(/1px = ([\d.]+)/)?.[1]);
  // Browser input coordinates can be rounded to CSS pixels; the real-world tolerance is 3%.
  expect(Math.abs(scale/.2-1)).toBeLessThanOrEqual(.03);
  const downloadPromise=page.waitForEvent('download');
  await page.getByRole('button',{name:'正規化PNGを確認',exact:true}).click();
  const download=await downloadPromise;expect(download.suggestedFilename()).toBe('normalized-part.png');
  const outputPath=await download.path();if(!outputPath)throw new Error('download missing');
  const png=readFileSync(outputPath);expect(png.readUInt32BE(16)).toBe(40);expect(png.readUInt32BE(20)).toBe(60);
  const dimensions=(await page.getByRole('status').textContent())?.match(/([\d.]+) × ([\d.]+) mm/);
  expect(dimensions).toBeTruthy();
  expect(Math.abs(Number(dimensions![1])/8-1)).toBeLessThanOrEqual(.03);
  expect(Math.abs(Number(dimensions![2])/12-1)).toBeLessThanOrEqual(.03);
  await expect(page.getByRole('button',{name:'パーツを保存',exact:true})).toBeDisabled();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);expect(errors).toEqual([]);
  await page.screenshot({path:testInfo.outputPath('part-registration.png'),fullPage:true});
});
