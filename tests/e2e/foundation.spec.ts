import { expect, test } from '@playwright/test';

test('home opens real local persistence without login or overflow',async({page})=>{
  const errors:string[]=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading',{name:'パーツから、ひとつのかたちへ。'})).toBeVisible();
  await page.getByRole('link',{name:'保存済みのデザインを見る'}).click();
  await expect(page.getByRole('heading',{name:'デザイン一覧',exact:true})).toBeVisible();
  await expect(page.getByText('保存先: この端末（ログイン不要）',{exact:true})).toBeVisible();
  await expect(page.getByRole('heading',{name:'新しいデザイン'})).toBeVisible();
  await expect(page.getByRole('button',{name:'ログイン',exact:true})).toHaveCount(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});
