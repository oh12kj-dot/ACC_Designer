import { test,expect } from '@playwright/test';
test('URL import failure retains manual registration and rejects unconfigured server fetch',async({page,request})=>{
  await page.goto('/parts/new');
  await page.getByLabel('取込元の商品URL').fill('https://kiwaseisakujo.jp/item');
  await page.getByRole('button',{name:'商品情報の候補を取得',exact:true}).click();
  await expect(page.getByText('候補を取得できませんでした。商品情報と画像を手動で登録できます。')).toBeVisible();
  await expect(page.getByRole('button',{name:'確認した候補をフォームへ反映'})).toHaveCount(0);
  const response=await request.post('/api/parts/import',{data:{sourceUrl:'https://kiwaseisakujo.jp/item'}});
  expect(response.status()).toBe(503);expect(await response.json()).toEqual({errorCode:'CLOUD_NOT_CONFIGURED'});
});
